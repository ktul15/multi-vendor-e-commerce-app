import { createHmac } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { env } from '../../src/config/env';
import {
  createAuthLimiter,
  createDashboardAggregateLimiter,
  createDashboardClientLimiter,
} from '../../src/middleware/rateLimiter';

type SignedHeaderOptions = Readonly<{
  client?: string;
  method?: string;
  pathname?: string;
  source?: 'admin' | 'vendor';
  timestamp?: string;
}>;

const signedHeaders = (
  identity: string,
  {
    client = `client:${'c'.repeat(64)}`,
    method = 'POST',
    pathname = '/api/v1/auth/login',
    source = 'vendor',
    timestamp = Date.now().toString(),
  }: SignedHeaderOptions = {}
) => {
  const payload = `${timestamp}\n${method}\n${pathname}\n${source}\n${client}\n${identity}`;
  return {
    'X-Dashboard-BFF-Client': client,
    'X-Dashboard-BFF-Identity': identity,
    'X-Dashboard-BFF-Signature': createHmac('sha256', env.DASHBOARD_BFF_SECRET)
      .update(payload)
      .digest('hex'),
    'X-Dashboard-BFF-Source': source,
    'X-Dashboard-BFF-Timestamp': timestamp,
  };
};

const ok = (_req: express.Request, res: express.Response) => {
  res.json({ success: true });
};

describe('dashboard BFF rate-limit identities', () => {
  it('keeps independent per-account limits behind one server IP', async () => {
    const app = express();
    app.post('/api/v1/auth/login', createAuthLimiter(1, false), ok);
    const accountA = `account:${'a'.repeat(64)}`;
    const accountB = `account:${'b'.repeat(64)}`;

    await request(app)
      .post('/api/v1/auth/login')
      .set(signedHeaders(accountA))
      .expect(200);
    await request(app)
      .post('/api/v1/auth/login')
      .set(signedHeaders(accountA))
      .expect(429);
    await request(app)
      .post('/api/v1/auth/login')
      .set(signedHeaders(accountB))
      .expect(200);
  });

  it('limits one public client even when it rotates account identities', async () => {
    const app = express();
    app.post('/api/v1/auth/login', createDashboardClientLimiter(2, false), ok);

    for (const value of ['a', 'b']) {
      await request(app)
        .post('/api/v1/auth/login')
        .set(signedHeaders(`account:${value.repeat(64)}`))
        .expect(200);
    }
    await request(app)
      .post('/api/v1/auth/login')
      .set(signedHeaders(`account:${'d'.repeat(64)}`))
      .expect(429);
  });

  it('enforces a dashboard-wide ceiling across rotating clients and identities', async () => {
    const app = express();
    app.post(
      '/api/v1/auth/login',
      createDashboardAggregateLimiter(2, false),
      ok
    );

    for (const value of ['a', 'b']) {
      await request(app)
        .post('/api/v1/auth/login')
        .set(
          signedHeaders(`account:${value.repeat(64)}`, {
            client: `client:${value.repeat(64)}`,
          })
        )
        .expect(200);
    }
    await request(app)
      .post('/api/v1/auth/login')
      .set(
        signedHeaders(`account:${'d'.repeat(64)}`, {
          client: `client:${'d'.repeat(64)}`,
        })
      )
      .expect(429);
  });

  it('does not trust an unsigned dashboard identity header', async () => {
    const app = express();
    app.post('/api/v1/auth/login', createAuthLimiter(1, false), ok);

    await request(app)
      .post('/api/v1/auth/login')
      .set('X-Dashboard-BFF-Identity', `account:${'c'.repeat(64)}`)
      .expect(200);
    await request(app)
      .post('/api/v1/auth/login')
      .set('X-Dashboard-BFF-Identity', `account:${'d'.repeat(64)}`)
      .expect(429);
  });

  it.each([
    {
      name: 'expired timestamp',
      options: { timestamp: (Date.now() - 31_000).toString() },
    },
    {
      name: 'future timestamp',
      options: { timestamp: (Date.now() + 60_000).toString() },
    },
    { name: 'wrong method', options: { method: 'GET' } },
    { name: 'wrong path', options: { pathname: '/api/v1/auth/register' } },
    { name: 'tampered signature', signature: '0'.repeat(64) },
    { name: 'malformed signature', signature: 'not-hex' },
  ])('rejects a $name', async ({ options, signature }) => {
    const app = express();
    app.post('/api/v1/auth/login', createAuthLimiter(1, false), ok);
    const first = signedHeaders(`account:${'e'.repeat(64)}`, options);
    const second = signedHeaders(`account:${'f'.repeat(64)}`, options);
    if (signature) {
      first['X-Dashboard-BFF-Signature'] = signature;
      second['X-Dashboard-BFF-Signature'] = signature;
    }

    await request(app).post('/api/v1/auth/login').set(first).expect(200);
    await request(app).post('/api/v1/auth/login').set(second).expect(429);
  });
});
