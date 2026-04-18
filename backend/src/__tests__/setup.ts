import { prisma } from '../config/prisma';

/**
 * Clean all test data from the database.
 * Called before/after test suites to ensure a clean state.
 * Deletes in reverse dependency order to avoid FK constraint errors.
 */
export async function cleanDatabase() {
    // Deletion order: leaf → root (reverse FK dependency).
    // Key constraint chains to keep in mind:
    //   promoUsage → promoCode (Restrict) — promoUsage must go before promoCode
    //   orderItem  → vendorOrder (Restrict) — orderItem before vendorOrder
    //   order.promoCodeId → promoCode (nullable, NoAction) — order before promoCode
    //   vendorEarning → vendorOrder (Restrict) — vendorEarning before vendorOrder
    //   vendorPayout → vendorProfile (Restrict) — vendorPayout before vendorProfile

    await prisma.vendorPayout.deleteMany();
    await prisma.vendorEarning.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.vendorOrder.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.promoUsage.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.review.deleteMany();
    await prisma.wishlistItem.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.variant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.banner.deleteMany();
    await prisma.category.deleteMany();
    await prisma.promoCode.deleteMany();
    await prisma.address.deleteMany();
    await prisma.vendorProfile.deleteMany();
    await prisma.platformSetting.deleteMany();
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
