import { prisma } from '../config/prisma';

/**
 * Clean all test data from the database.
 * Called before/after test suites to ensure a clean state.
 * Deletes in reverse dependency order to avoid FK constraint errors.
 */
export async function cleanDatabase() {
    // Add tables here in reverse dependency order as the schema grows
    await prisma.user.deleteMany();
}

/**
 * Connect to the database before tests.
 */
export async function setupTestDB() {
    await prisma.$connect();
}

/**
 * Disconnect from the database after tests.
 */
export async function teardownTestDB() {
    await cleanDatabase();
    await prisma.$disconnect();
}
