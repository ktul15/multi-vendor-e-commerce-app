import request from 'supertest';
import { prisma } from '../../src/config/prisma';
import bcrypt from 'bcrypt';
import app from '../../src/app';
import { beforeAll, afterAll, describe, it, expect } from '@jest/globals';

let vendorId: string;
let categoryId: string;

beforeAll(async () => {
    await prisma.variant.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});

    // Setup User
    const password = await bcrypt.hash('test1234', 10);
    const vendorUser = await prisma.user.upsert({
        where: { email: 'vendor2@ecommerce.com' },
        update: { password, role: 'VENDOR' },
        create: {
            name: 'Vendor Two',
            email: 'vendor2@ecommerce.com',
            password,
            role: 'VENDOR',
            isVerified: true
        }
    });
    vendorId = vendorUser.id;

    // Create a Category
    const category = await prisma.category.create({
        data: { name: 'Smartphones', slug: 'smartphones-1' }
    });
    categoryId = category.id;

    // Create multiple products for testing queries (createMany doesn't support nested relations in Prisma)
    await prisma.product.create({
        data: {
            name: 'Budget Phone',
            description: 'A very cheap phone for calls.',
            basePrice: 99.99,
            categoryId,
            vendorId,
            isActive: true,
            avgRating: 3.5,
            reviewCount: 15,
            createdAt: new Date('2023-01-01T00:00:00Z'),
            variants: {
                create: [{ sku: 'BUD-01', price: 99.99, stock: 0 }]
            }
        }
    });

    await prisma.product.create({
        data: {
            name: 'Midrange Smartphone',
            description: 'Good camera, decent battery.',
            basePrice: 399.99,
            categoryId,
            vendorId,
            isActive: true,
            avgRating: 4.2,
            reviewCount: 150,
            createdAt: new Date('2023-01-02T00:00:00Z'),
            variants: {
                create: [{ sku: 'MID-01', price: 399.99, stock: 10 }]
            }
        }
    });

    await prisma.product.create({
        data: {
            name: 'Flagship Pro Max',
            description: 'The ultimate best camera.',
            basePrice: 1099.99,
            categoryId,
            vendorId,
            isActive: true,
            avgRating: 4.9,
            reviewCount: 300,
            createdAt: new Date('2023-01-03T00:00:00Z'),
            variants: {
                create: [{ sku: 'PRO-01', price: 1099.99, stock: 5 }]
            }
        }
    });

    await prisma.product.create({
        data: {
            name: 'Hidden Development Device',
            description: 'Not active yet.',
            basePrice: 9999.99,
            categoryId,
            vendorId,
            isActive: false, // inactive shouldn't show
            avgRating: 0.0,
            reviewCount: 0,
            createdAt: new Date('2023-01-04T00:00:00Z')
        }
    });
});

afterAll(async () => {
    await prisma.variant.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.$disconnect();
});

describe('Product API - Filters, Sort, Pagination (Issue #21)', () => {

    it('should paginate results properly and include meta', async () => {
        const res = await request(app).get('/api/v1/products?page=1&limit=2');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.meta.total).toBe(3); // excludes inactive
        expect(res.body.data.meta.page).toBe(1);
        expect(res.body.data.meta.limit).toBe(2);
        expect(res.body.data.meta.totalPages).toBe(2);
        expect(res.body.data.items.length).toBe(2);
    });

    it('should filter by search keyword in name or description', async () => {
        const res = await request(app).get('/api/v1/products?search=camera');
        expect(res.status).toBe(200);
        expect(res.body.data.items.length).toBe(2); // Midrange and Flagship match 'camera'

        const res2 = await request(app).get('/api/v1/products?search=Flagship');
        expect(res2.body.data.items.length).toBe(1);
        expect(res2.body.data.items[0].name).toBe('Flagship Pro Max');
    });

    it('should filter by minPrice and maxPrice bounds', async () => {
        const res = await request(app).get('/api/v1/products?minPrice=200&maxPrice=500');
        expect(res.status).toBe(200);
        expect(res.body.data.items.length).toBe(1);
        expect(res.body.data.items[0].name).toBe('Midrange Smartphone');
    });

    it('should sort dynamically (price_asc, price_desc, rating, newest)', async () => {
        // Default (newest = descending createdAt)
        const resDefault = await request(app).get('/api/v1/products');
        expect(resDefault.body.data.items[0].name).toBe('Flagship Pro Max'); // Created 01-03

        // Ascending Price
        const resPriceAsc = await request(app).get('/api/v1/products?sort=price_asc');
        expect(resPriceAsc.body.data.items[0].basePrice).toBe(99.99);

        // Descending Price
        const resPriceDesc = await request(app).get('/api/v1/products?sort=price_desc');
        expect(resPriceDesc.body.data.items[0].basePrice).toBe(1099.99);

        // Descending Rating
        const resRating = await request(app).get('/api/v1/products?sort=rating');
        expect(resRating.body.data.items[0].avgRating).toBe(4.9);

        // Popular (reviewCount desc)
        const resPopular = await request(app).get('/api/v1/products?sort=popular');
        expect(resPopular.status).toBe(200);
        expect(resPopular.body.data.items[0].reviewCount).toBe(300);
    });

    it('should filter by rating and inStock', async () => {
        // Minimum rating of 4.0 should return 'Midrange Smartphone' (4.2) and 'Flagship Pro Max' (4.9)
        const resRating = await request(app).get('/api/v1/products?rating=4');
        expect(resRating.status).toBe(200);
        expect(resRating.body.data.items.length).toBe(2);

        // Only in-stock products (Budget phone is out of stock)
        const resStock = await request(app).get('/api/v1/products?inStock=true');
        expect(resStock.status).toBe(200);
        expect(resStock.body.data.items.length).toBe(2); // Out of 3 active products, 1 is out of stock
    });

    it('should validate and execute search on dedicated /search endpoint', async () => {
        // Validation failure (missing q)
        const resErr = await request(app).get('/api/v1/products/search');
        expect(resErr.status).toBe(400);

        // Success
        const resSuccess = await request(app).get('/api/v1/products/search?q=camera');
        expect(resSuccess.status).toBe(200);
        expect(resSuccess.body.data.items.length).toBe(2); // Midrange and Flagship match 'camera'
    });
});
