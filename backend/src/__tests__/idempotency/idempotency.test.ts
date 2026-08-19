import { randomUUID } from 'crypto';
import express, { Response } from 'express';
import request from 'supertest';
import { prisma } from '../../config/prisma';
import { errorHandler } from '../../middleware/errorHandler';
import { mutationIdempotency } from '../../middleware/idempotency';
import { AuthRequest } from '../../types';
import { cleanDatabase, setupTestDB, teardownTestDB } from '../setup';

const reconciliation = (req: AuthRequest) => ({
  method: 'GET' as const,
  path: `/authoritative/${req.params.id as string}`,
});

function testApp(
  userId: string,
  handler: (req: AuthRequest, res: Response) => void | Promise<void>
) {
  const app = express();
  app.use(express.json());
  app.put(
    '/mutation/:id',
    (req: AuthRequest, _res, next) => {
      req.user = { userId, email: `${userId}@example.test`, role: 'VENDOR' };
      next();
    },
    mutationIdempotency({ reconciliation }),
    handler
  );
  app.use(errorHandler);
  return app;
}

async function waitForClaim(key: string) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const record = await prisma.idempotencyRecord.findFirst({ where: { key } });
    if (record) return record;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Timed out waiting for idempotency claim');
}

describe('mutation idempotency', () => {
  beforeAll(setupTestDB);
  afterAll(teardownTestDB);
  beforeEach(cleanDatabase);

  it('coordinates an in-flight request and replay across API instances', async () => {
    const key = randomUUID();
    let executions = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const handler = async (_req: AuthRequest, res: Response) => {
      executions += 1;
      await gate;
      res.status(200).json({ success: true, data: { status: 'SHIPPED' } });
    };
    const instanceA = testApp('vendor-1', handler);
    const instanceB = testApp('vendor-1', handler);

    const first = request(instanceA)
      .put('/mutation/order-1')
      .set('Idempotency-Key', key)
      .send({ status: 'SHIPPED' });
    const firstResult = first.then((response) => response);
    await waitForClaim(key);

    const concurrent = await request(instanceB)
      .put('/mutation/order-1')
      .set('Idempotency-Key', key)
      .send({ status: 'SHIPPED' });
    expect(concurrent.status).toBe(409);
    expect(concurrent.body.code).toBe('IDEMPOTENCY_REQUEST_IN_PROGRESS');
    expect(concurrent.body.reconciliation).toEqual({
      method: 'GET',
      path: '/authoritative/order-1',
    });

    release();
    const completed = await firstResult;
    expect(completed.status).toBe(200);

    const replay = await request(instanceB)
      .put('/mutation/order-1')
      .set('Idempotency-Key', key)
      .send({ status: 'SHIPPED' });
    expect(replay.status).toBe(200);
    expect(replay.headers['idempotency-replayed']).toBe('true');
    expect(replay.body).toEqual(completed.body);
    expect(executions).toBe(1);
  });

  it('rejects key reuse with a changed payload', async () => {
    const key = randomUUID();
    const app = testApp('vendor-1', (_req, res) => {
      res.status(200).json({ success: true });
    });

    expect(
      (
        await request(app)
          .put('/mutation/order-1')
          .set('Idempotency-Key', key)
          .send({ status: 'PROCESSING' })
      ).status
    ).toBe(200);
    const conflict = await request(app)
      .put('/mutation/order-1')
      .set('Idempotency-Key', key)
      .send({ status: 'SHIPPED' });

    expect(conflict.status).toBe(409);
    expect(conflict.body.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('rejects key reuse for a different resource with the same payload', async () => {
    const key = randomUUID();
    const app = testApp('vendor-1', (_req, res) => {
      res.status(200).json({ success: true });
    });
    const body = { status: 'SHIPPED' };

    expect(
      (
        await request(app)
          .put('/mutation/order-1')
          .set('Idempotency-Key', key)
          .send(body)
      ).status
    ).toBe(200);
    const conflict = await request(app)
      .put('/mutation/order-2')
      .set('Idempotency-Key', key)
      .send(body);

    expect(conflict.status).toBe(409);
    expect(conflict.body.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('isolates the same key by authenticated principal', async () => {
    const key = randomUUID();
    let executions = 0;
    const handler = (_req: AuthRequest, res: Response) => {
      executions += 1;
      res.status(200).json({ success: true });
    };

    const [left, right] = await Promise.all([
      request(testApp('vendor-1', handler))
        .put('/mutation/order-1')
        .set('Idempotency-Key', key)
        .send({ status: 'SHIPPED' }),
      request(testApp('vendor-2', handler))
        .put('/mutation/order-1')
        .set('Idempotency-Key', key)
        .send({ status: 'SHIPPED' }),
    ]);

    expect([left.status, right.status]).toEqual([200, 200]);
    expect(executions).toBe(2);
  });

  it('marks a timeout response ambiguous and requires reconciliation', async () => {
    const key = randomUUID();
    let executions = 0;
    const app = testApp('vendor-1', (_req, res) => {
      executions += 1;
      res.status(503).json({ success: false, message: 'Upstream timeout' });
    });

    const timedOut = await request(app)
      .put('/mutation/order-1')
      .set('Idempotency-Key', key)
      .send({ status: 'SHIPPED' });
    expect(timedOut.status).toBe(503);
    expect(timedOut.headers['idempotency-status']).toBe('ambiguous');
    expect(timedOut.body.code).toBe('IDEMPOTENCY_OUTCOME_AMBIGUOUS');
    expect(timedOut.body.reconciliation.path).toBe('/authoritative/order-1');

    const retry = await request(app)
      .put('/mutation/order-1')
      .set('Idempotency-Key', key)
      .send({ status: 'SHIPPED' });
    expect(retry.status).toBe(409);
    expect(retry.body.code).toBe('IDEMPOTENCY_OUTCOME_AMBIGUOUS');
    expect(retry.body.reconciliation.path).toBe('/authoritative/order-1');
    expect(executions).toBe(1);
  });

  it('converts an expired execution lease into an ambiguous outcome', async () => {
    const key = randomUUID();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const app = testApp('vendor-1', async (_req, res) => {
      await gate;
      res.status(200).json({ success: true });
    });

    const firstResult = request(app)
      .put('/mutation/order-1')
      .set('Idempotency-Key', key)
      .send({ status: 'SHIPPED' })
      .then((response) => response);
    const claim = await waitForClaim(key);
    await prisma.idempotencyRecord.update({
      where: { id: claim.id },
      data: { leaseExpiresAt: new Date(Date.now() - 1_000) },
    });

    const retry = await request(app)
      .put('/mutation/order-1')
      .set('Idempotency-Key', key)
      .send({ status: 'SHIPPED' });
    expect(retry.status).toBe(409);
    expect(retry.body.code).toBe('IDEMPOTENCY_OUTCOME_AMBIGUOUS');

    release();
    expect((await firstResult).status).toBe(200);
  });
});
