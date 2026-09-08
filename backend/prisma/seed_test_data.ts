import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../src/generated/prisma/client';
import { hashPassword } from '../src/utils/password';
import { randomUUID } from 'crypto';

const pool = new pg.Pool({
    connectionString: process.env['DATABASE_URL'],
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Truncating and Seeding Filter/Sort Test Data...');

    // Warning: Only run on test or local databases
    const password = await hashPassword('password123');

    // Create 2 Vendors
    const vendor1 = await prisma.user.upsert({
        where: { email: 'vendor1@test.com' },
        update: {},
        create: {
            name: 'Electronics Hub', email: 'vendor1@test.com', password, role: Role.VENDOR, isVerified: true,
            vendorProfile: { create: { storeName: 'Electronics Hub', status: 'APPROVED' } }
        },
        include: { vendorProfile: true }
    });

    const vendor2 = await prisma.user.upsert({
        where: { email: 'vendor2@test.com' },
        update: {},
        create: {
            name: 'Sneaker World', email: 'vendor2@test.com', password, role: Role.VENDOR, isVerified: true,
            vendorProfile: { create: { storeName: 'Sneaker World', status: 'APPROVED' } }
        },
        include: { vendorProfile: true }
    });

    // Create 2 Categories
    const electronics = await prisma.category.upsert({
        where: { slug: 'electronics' }, update: {}, create: { name: 'Electronics', slug: 'electronics' }
    });
    const shoes = await prisma.category.upsert({
        where: { slug: 'shoes' }, update: {}, create: { name: 'Shoes', slug: 'shoes' }
    });

    const vendor1Id = vendor1.id;
    const vendor2Id = vendor2.id;

    // Define 15 Products covering all scenarios
    const productsData = [
        // Electronics - Expensive, Highly Rated, In Stock
        { name: 'Premium Wireless Headphones', description: 'Noise cancelling overhead headphones', basePrice: 299.99, categoryId: electronics.id, vendorId: vendor1Id, avgRating: 4.8, reviewCount: 150, createdAt: new Date('2025-01-01'), inStock: true },
        // Electronics - Mid Range, Unrated, Out of Stock
        { name: 'Bluetooth Earbuds', description: 'Compact wireless earbuds', basePrice: 49.99, categoryId: electronics.id, vendorId: vendor1Id, avgRating: 0.0, reviewCount: 0, createdAt: new Date('2025-02-01'), inStock: false },
        // Electronics - Cheap, Poorly Rated, In Stock
        { name: 'Basic Wired Earphones', description: 'Standard 3.5mm jack earphones', basePrice: 9.99, categoryId: electronics.id, vendorId: vendor1Id, avgRating: 2.1, reviewCount: 5, createdAt: new Date('2025-03-01'), inStock: true },
        // Shoes - Expensive, Highly Rated, In Stock
        { name: 'Pro Running Shoes', description: 'Lightweight marathon running shoes', basePrice: 150.00, categoryId: shoes.id, vendorId: vendor2Id, avgRating: 4.9, reviewCount: 300, createdAt: new Date('2025-01-15'), inStock: true },
        // Shoes - Mid Range, Decent Rating, Out of Stock
        { name: 'Casual Sneakers', description: 'Everyday lifestyle sneakers', basePrice: 65.00, categoryId: shoes.id, vendorId: vendor2Id, avgRating: 3.8, reviewCount: 42, createdAt: new Date('2025-02-15'), inStock: false },
        // Shoes - Cheap, Good Rating, In Stock
        { name: 'Basic Canvas Shoes', description: 'Simple canvas slip-ons', basePrice: 25.00, categoryId: shoes.id, vendorId: vendor2Id, avgRating: 4.1, reviewCount: 120, createdAt: new Date('2025-03-15'), inStock: true },
        // Electronics - Mid Range, Exceptional Rating, In Stock
        { name: 'Smart Watch Gen 2', description: 'Fitness tracker and smartwatch', basePrice: 199.99, categoryId: electronics.id, vendorId: vendor1Id, avgRating: 5.0, reviewCount: 2000, createdAt: new Date('2025-04-01'), inStock: true },
        // Shoes - Expensive, Mid Rating, In Stock
        { name: 'Premium Leather Boots', description: 'Handcrafted leather boots', basePrice: 250.00, categoryId: shoes.id, vendorId: vendor2Id, avgRating: 3.5, reviewCount: 12, createdAt: new Date('2025-04-05'), inStock: true },
        // Electronics - Cheap, Bad Rating, Out of Stock
        { name: 'USB-C Cable', description: '1m fast charging cable', basePrice: 5.00, categoryId: electronics.id, vendorId: vendor1Id, avgRating: 1.5, reviewCount: 3, createdAt: new Date('2025-04-10'), inStock: false },
        // Shoes - Mid Range, Good Rating, In Stock
        { name: 'Basketball High Tops', description: 'Supportive court shoes', basePrice: 85.00, categoryId: shoes.id, vendorId: vendor2Id, avgRating: 4.4, reviewCount: 88, createdAt: new Date('2025-04-12'), inStock: true },
        // Shoes - Cheap, Good Rating, In Stock
        { name: 'Summer Sandals', description: 'Beach ready sandals', basePrice: 15.00, categoryId: shoes.id, vendorId: vendor2Id, avgRating: 4.2, reviewCount: 56, createdAt: new Date('2025-01-20'), inStock: true },
        // Electronics - Expensive, Mid Rating, Out of Stock
        { name: '4K Action Camera', description: 'Waterproof action cam', basePrice: 349.00, categoryId: electronics.id, vendorId: vendor1Id, avgRating: 3.3, reviewCount: 34, createdAt: new Date('2025-02-20'), inStock: false },
        // Shoes - Mid Range, Unrated, In Stock
        { name: 'Hiking Boots', description: 'Waterproof trail boots', basePrice: 95.00, categoryId: shoes.id, vendorId: vendor2Id, avgRating: 0.0, reviewCount: 0, createdAt: new Date('2025-03-20'), inStock: true },
        // Electronics - Cheap, Good Rating, In Stock
        { name: 'Portable Power Bank', description: '10000mAh battery pack', basePrice: 22.99, categoryId: electronics.id, vendorId: vendor1Id, avgRating: 4.6, reviewCount: 400, createdAt: new Date('2025-04-15'), inStock: true },
        // Extras for Pagination (Item 15)
        { name: 'Bluetooth Speaker', description: 'Waterproof outdoor speaker', basePrice: 55.00, categoryId: electronics.id, vendorId: vendor1Id, avgRating: 4.0, reviewCount: 85, createdAt: new Date('2025-04-18'), inStock: true },
    ];

    // Delete existing products to avoid pollution if run multiple times
    await prisma.product.deleteMany({
        where: {
            name: { in: productsData.map(p => p.name) }
        }
    });

    for (const p of productsData) {
        const { inStock, ...data } = p;
        await prisma.product.create({
            data: {
                ...data,
                images: [],
                isActive: true,
                tags: [],
                variants: {
                    create: [
                        { sku: `SKU-${randomUUID().slice(0, 6)}`, price: p.basePrice, stock: p.inStock ? 50 : 0 }
                    ]
                }
            }
        });
    }

    console.log(`  ✅ Inserted ${productsData.length} diverse products!`);
    console.log('🌱 Seeding complete! You can now test:');
    console.log('- Min/Max price filters (Try ₹10-₹50 to get earbuds, canvas shoes, cables, sandals, power banks)');
    console.log('- Rating filters (Try >= 4 to get headphones, pro runners, smart watches, etc.)');
    console.log('- inStock filters (Try true vs false)');
    console.log('- Sorting by price_asc, price_desc, rating, popular, newest');
    console.log('- Pagination (?page=2&limit=10)');
    console.log('- Search (?q=shoes or ?q=wireless)');
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
