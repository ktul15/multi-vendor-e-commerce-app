import { Request, Response, Router } from 'express';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { redis } from '../../config/redis';
import { ApiResponse } from '../../utils/apiResponse';

type HealthDependencies = Readonly<{
  cache: () => Promise<unknown>;
  database: () => Promise<unknown>;
  timeoutMs: number;
}>;

const defaults: HealthDependencies = {
  cache: () => redis.ping(),
  database: () => prisma.$queryRaw`SELECT 1`,
  timeoutMs: 5_000,
};

const healthData = (status: 'healthy' | 'ready') => ({
  status,
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
  environment: env.APP_ENVIRONMENT,
  release: env.APP_RELEASE,
});

async function withinTimeout(
  operation: Promise<unknown>,
  timeoutMs: number
): Promise<void> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error('Readiness probe timed out')),
          timeoutMs
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function createHealthRouter(
  overrides: Partial<HealthDependencies> = {}
): Router {
  const dependencies = { ...defaults, ...overrides };
  const router = Router();

  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });

  const live = (_request: Request, response: Response) =>
    ApiResponse.success(response, healthData('healthy'), 'Server is running');

  router.get('/', live);
  router.get('/live', live);
  router.get('/ready', async (_request, response) => {
    try {
      await withinTimeout(
        Promise.all([dependencies.database(), dependencies.cache()]),
        dependencies.timeoutMs
      );
      return ApiResponse.success(
        response,
        {
          ...healthData('ready'),
          dependencies: { database: 'ready', redis: 'ready' },
        },
        'Service is ready'
      );
    } catch {
      return response.status(503).json({
        success: false,
        message: 'Service is not ready',
        data: { status: 'not_ready', timestamp: new Date().toISOString() },
      });
    }
  });

  return router;
}

export const healthRouter = createHealthRouter();
