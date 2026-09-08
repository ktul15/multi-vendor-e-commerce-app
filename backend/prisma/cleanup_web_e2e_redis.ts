import 'dotenv/config';
import Redis from 'ioredis';

const RESET_CONFIRMATION = 'DELETE_E2E_DATA';

function getSafeRedisUrl(): string {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error('Web E2E cache cleanup is disabled in production.');
  }
  if (process.env['WEB_E2E_RESET_CONFIRMATION'] !== RESET_CONFIRMATION) {
    throw new Error(
      `Set WEB_E2E_RESET_CONFIRMATION=${RESET_CONFIRMATION} to confirm the dedicated test cache reset.`
    );
  }

  const connectionString = process.env['REDIS_URL'];
  if (!connectionString) {
    throw new Error('REDIS_URL is required for web E2E cache cleanup.');
  }
  const redisUrl = new URL(connectionString);
  if (!['redis:', 'rediss:'].includes(redisUrl.protocol)) {
    throw new Error('Web E2E cache cleanup requires a Redis REDIS_URL.');
  }

  const database = Number(redisUrl.pathname.slice(1) || '0');
  if (!Number.isInteger(database) || database <= 0) {
    throw new Error(
      'Refusing to flush Redis database 0; configure a dedicated nonzero database such as REDIS_URL=redis://localhost:6379/15.'
    );
  }
  return connectionString;
}

async function main() {
  const connectionString = getSafeRedisUrl();
  const database = new URL(connectionString).pathname.slice(1);
  const redis = new Redis(connectionString, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });

  try {
    await redis.connect();
    await redis.flushdb();
    console.log(`✅ Dedicated web E2E Redis database ${database} cleared.`);
  } finally {
    if (redis.status !== 'end') {
      await redis.quit();
    }
  }
}

main().catch((error) => {
  console.error('❌ Web E2E cache cleanup failed:', error);
  process.exit(1);
});
