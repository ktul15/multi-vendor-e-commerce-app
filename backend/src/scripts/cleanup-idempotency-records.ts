import { prisma } from '../config/prisma';

async function main() {
  const result = await prisma.idempotencyRecord.deleteMany({
    where: {
      state: 'COMPLETED',
      expiresAt: { lt: new Date() },
    },
  });
  console.info(
    `Deleted ${result.count} expired completed idempotency records.`
  );
}

void main()
  .catch((error: unknown) => {
    console.error(
      'Failed to clean idempotency records:',
      error instanceof Error ? error.message : String(error)
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
