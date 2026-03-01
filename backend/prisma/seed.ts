import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../src/generated/prisma/client';
import bcrypt from 'bcrypt';

const pool = new pg.Pool({
    connectionString: process.env['DATABASE_URL'],
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Seeding database...');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@ecommerce.com' },
        update: {},
        create: {
            name: 'Admin User',
            email: 'admin@ecommerce.com',
            password: adminPassword,
            role: Role.ADMIN,
            isVerified: true,
        },
    });
    console.log(`  ✅ Admin user created: ${admin.email}`);

    // Create test vendor
    const vendorPassword = await bcrypt.hash('vendor123', 10);
    const vendor = await prisma.user.upsert({
        where: { email: 'vendor@ecommerce.com' },
        update: {},
        create: {
            name: 'Test Vendor',
            email: 'vendor@ecommerce.com',
            password: vendorPassword,
            role: Role.VENDOR,
            isVerified: true,
        },
    });
    console.log(`  ✅ Vendor user created: ${vendor.email}`);

    // Create test customer
    const customerPassword = await bcrypt.hash('customer123', 10);
    const customer = await prisma.user.upsert({
        where: { email: 'customer@ecommerce.com' },
        update: {},
        create: {
            name: 'Test Customer',
            email: 'customer@ecommerce.com',
            password: customerPassword,
            role: Role.CUSTOMER,
            isVerified: true,
        },
    });
    console.log(`  ✅ Customer user created: ${customer.email}`);

    console.log('🌱 Seeding complete!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
