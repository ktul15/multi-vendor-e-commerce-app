import express from 'express';
import request from 'supertest';
import { createHealthRouter } from '../../src/modules/health/health.routes';

const testApp = (overrides: Parameters<typeof createHealthRouter>[0] = {}) => {
  const app = express();
  app.use('/api/health', createHealthRouter(overrides));
  return app;
};

describe('deployment health probes', () => {
  it('serves backward-compatible and explicit liveness checks', async () => {
    const app = testApp();
    const [legacy, live] = await Promise.all([
      request(app).get('/api/health'),
      request(app).get('/api/health/live'),
    ]);

    expect(legacy.status).toBe(200);
    expect(live.status).toBe(200);
    expect(live.headers['cache-control']).toBe('no-store');
    expect(live.body.data.status).toBe('healthy');
  });

  it('reports ready only after PostgreSQL and Redis probes succeed', async () => {
    const database = jest.fn(async () => 1);
    const cache = jest.fn(async () => 'PONG');
    const response = await request(testApp({ cache, database })).get(
      '/api/health/ready'
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      dependencies: { database: 'ready', redis: 'ready' },
      status: 'ready',
    });
    expect(database).toHaveBeenCalledTimes(1);
    expect(cache).toHaveBeenCalledTimes(1);
  });

  it('returns 503 without dependency details when readiness fails', async () => {
    const response = await request(
      testApp({
        cache: async () => 'PONG',
        database: async () => {
          throw new Error('database credentials leaked here');
        },
      })
    ).get('/api/health/ready');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      data: { status: 'not_ready' },
      message: 'Service is not ready',
      success: false,
    });
    expect(JSON.stringify(response.body)).not.toContain('credentials');
  });
});
