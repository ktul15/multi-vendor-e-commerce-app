import request from 'supertest';
import { prisma } from '../../src/config/prisma';
import bcrypt from 'bcrypt';
import app from '../../src/app';

let customerToken: string;
let customerId: string;
let otherCustomerToken: string;

beforeAll(async () => {
    await prisma.address.deleteMany({});

    const password = await bcrypt.hash('test1234', 10);

    const customerUser = await prisma.user.upsert({
        where: { email: 'customer@ecommerce.com' },
        update: { password, role: 'CUSTOMER' },
        create: {
            name: 'Customer User',
            email: 'customer@ecommerce.com',
            password,
            role: 'CUSTOMER',
            isVerified: true,
        },
    });
    customerId = customerUser.id;

    await prisma.user.upsert({
        where: { email: 'customer2@ecommerce.com' },
        update: { password, role: 'CUSTOMER' },
        create: {
            name: 'Customer Two',
            email: 'customer2@ecommerce.com',
            password,
            role: 'CUSTOMER',
            isVerified: true,
        },
    });

    const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'customer@ecommerce.com', password: 'test1234' });
    customerToken = `Bearer ${res.body.data.tokens.accessToken}`;

    const res2 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'customer2@ecommerce.com', password: 'test1234' });
    otherCustomerToken = `Bearer ${res2.body.data.tokens.accessToken}`;
});

afterAll(async () => {
    await prisma.address.deleteMany({});
    await prisma.$disconnect();
});

describe('Address API (Issue #30)', () => {
    let addressId: string;
    let defaultAddressId: string;

    describe('POST /api/v1/addresses', () => {
        it('should create an address and return 201', async () => {
            const res = await request(app)
                .post('/api/v1/addresses')
                .set('Authorization', customerToken)
                .send({
                    fullName: 'John Doe',
                    phone: '555-1234',
                    street: '123 Main St',
                    city: 'Springfield',
                    state: 'IL',
                    country: 'US',
                    zipCode: '62701',
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.fullName).toBe('John Doe');
            expect(res.body.data.isDefault).toBe(false);
            addressId = res.body.data.id;
        });

        it('should set isDefault and unset previous defaults', async () => {
            await request(app)
                .post('/api/v1/addresses')
                .set('Authorization', customerToken)
                .send({
                    fullName: 'Jane Doe',
                    phone: '555-5678',
                    street: '456 Oak Ave',
                    city: 'Chicago',
                    state: 'IL',
                    country: 'US',
                    zipCode: '60601',
                    isDefault: true,
                });

            const res = await request(app)
                .post('/api/v1/addresses')
                .set('Authorization', customerToken)
                .send({
                    fullName: 'Bob Smith',
                    phone: '555-9999',
                    street: '789 Pine Rd',
                    city: 'Rockford',
                    state: 'IL',
                    country: 'US',
                    zipCode: '61101',
                    isDefault: true,
                });

            expect(res.status).toBe(201);
            expect(res.body.data.isDefault).toBe(true);
            defaultAddressId = res.body.data.id;

            const defaults = await prisma.address.findMany({
                where: { userId: customerId, isDefault: true },
            });
            expect(defaults).toHaveLength(1);
            expect(defaults[0].id).toBe(defaultAddressId);
        });

        it('should return 401 without auth', async () => {
            const res = await request(app)
                .post('/api/v1/addresses')
                .send({ fullName: 'Hacker', phone: '555-0000', street: 'x', city: 'x', state: 'x', country: 'US', zipCode: '12345' });
            expect(res.status).toBe(401);
        });

        it('should reject invalid input (short phone)', async () => {
            const res = await request(app)
                .post('/api/v1/addresses')
                .set('Authorization', customerToken)
                .send({
                    fullName: 'John Doe',
                    phone: '123',
                    street: '123 Main St',
                    city: 'Springfield',
                    state: 'IL',
                    country: 'US',
                    zipCode: '62701',
                });
            expect(res.status).toBe(400);
        });

        it('should reject a non-ISO country code', async () => {
            const res = await request(app)
                .post('/api/v1/addresses')
                .set('Authorization', customerToken)
                .send({
                    fullName: 'John Doe',
                    phone: '555-1234',
                    street: '123 Main St',
                    city: 'Springfield',
                    state: 'IL',
                    country: 'United States',
                    zipCode: '62701',
                });
            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/v1/addresses', () => {
        it('should return all addresses for the user', async () => {
            const res = await request(app)
                .get('/api/v1/addresses')
                .set('Authorization', customerToken);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThanOrEqual(1);
            // Default should come first
            expect(res.body.data[0].isDefault).toBe(true);
        });

        it('should not return other users\' addresses', async () => {
            const res = await request(app)
                .get('/api/v1/addresses')
                .set('Authorization', otherCustomerToken);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(0);
        });

        it('should return 401 without auth', async () => {
            const res = await request(app).get('/api/v1/addresses');
            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/v1/addresses/:id', () => {
        it('should return a single address', async () => {
            const res = await request(app)
                .get(`/api/v1/addresses/${addressId}`)
                .set('Authorization', customerToken);

            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe(addressId);
        });

        it('should return 404 for unknown id', async () => {
            const res = await request(app)
                .get('/api/v1/addresses/00000000-0000-0000-0000-000000000000')
                .set('Authorization', customerToken);

            expect(res.status).toBe(404);
        });

        it('should return 400 for a malformed (non-UUID) id', async () => {
            const res = await request(app)
                .get('/api/v1/addresses/not-a-uuid')
                .set('Authorization', customerToken);

            expect(res.status).toBe(400);
        });

        it('should return 404 when accessing another user\'s address', async () => {
            const res = await request(app)
                .get(`/api/v1/addresses/${addressId}`)
                .set('Authorization', otherCustomerToken);

            expect(res.status).toBe(404);
        });

        it('should return 401 without auth', async () => {
            const res = await request(app).get(`/api/v1/addresses/${addressId}`);
            expect(res.status).toBe(401);
        });
    });

    describe('PUT /api/v1/addresses/:id', () => {
        it('should update address fields', async () => {
            const res = await request(app)
                .put(`/api/v1/addresses/${addressId}`)
                .set('Authorization', customerToken)
                .send({ city: 'Decatur', zipCode: '62521' });

            expect(res.status).toBe(200);
            expect(res.body.data.city).toBe('Decatur');
            expect(res.body.data.zipCode).toBe('62521');
        });

        it('should shift the default when updating with isDefault: true', async () => {
            const res = await request(app)
                .put(`/api/v1/addresses/${addressId}`)
                .set('Authorization', customerToken)
                .send({ isDefault: true });

            expect(res.status).toBe(200);
            expect(res.body.data.isDefault).toBe(true);

            const defaults = await prisma.address.findMany({
                where: { userId: customerId, isDefault: true },
            });
            expect(defaults).toHaveLength(1);
            expect(defaults[0].id).toBe(addressId);
        });

        it('should return 400 for an empty update body', async () => {
            const res = await request(app)
                .put(`/api/v1/addresses/${addressId}`)
                .set('Authorization', customerToken)
                .send({});

            expect(res.status).toBe(400);
        });

        it('should return 404 for unknown id', async () => {
            const res = await request(app)
                .put('/api/v1/addresses/00000000-0000-0000-0000-000000000000')
                .set('Authorization', customerToken)
                .send({ city: 'Nowhere' });

            expect(res.status).toBe(404);
        });

        it('should return 400 for a malformed (non-UUID) id', async () => {
            const res = await request(app)
                .put('/api/v1/addresses/not-a-uuid')
                .set('Authorization', customerToken)
                .send({ city: 'Nowhere' });

            expect(res.status).toBe(400);
        });

        it('should return 404 when updating another user\'s address', async () => {
            const res = await request(app)
                .put(`/api/v1/addresses/${addressId}`)
                .set('Authorization', otherCustomerToken)
                .send({ city: 'Hacked' });

            expect(res.status).toBe(404);
        });

        it('should return 401 without auth', async () => {
            const res = await request(app)
                .put(`/api/v1/addresses/${addressId}`)
                .send({ city: 'Nowhere' });
            expect(res.status).toBe(401);
        });
    });

    describe('PATCH /api/v1/addresses/:id/default', () => {
        it('should set address as default and unset previous default', async () => {
            // addressId was set to default in the PUT test — now switch back to defaultAddressId
            const res = await request(app)
                .patch(`/api/v1/addresses/${defaultAddressId}/default`)
                .set('Authorization', customerToken);

            expect(res.status).toBe(200);
            expect(res.body.data.isDefault).toBe(true);
            expect(res.body.data.id).toBe(defaultAddressId);

            const prev = await prisma.address.findUnique({ where: { id: addressId } });
            expect(prev?.isDefault).toBe(false);
        });

        it('should return 404 for unknown id', async () => {
            const res = await request(app)
                .patch('/api/v1/addresses/00000000-0000-0000-0000-000000000000/default')
                .set('Authorization', customerToken);

            expect(res.status).toBe(404);
        });

        it('should return 400 for a malformed (non-UUID) id', async () => {
            const res = await request(app)
                .patch('/api/v1/addresses/not-a-uuid/default')
                .set('Authorization', customerToken);

            expect(res.status).toBe(400);
        });

        it('should return 404 when setting default on another user\'s address', async () => {
            const res = await request(app)
                .patch(`/api/v1/addresses/${addressId}/default`)
                .set('Authorization', otherCustomerToken);

            expect(res.status).toBe(404);
        });

        it('should return 401 without auth', async () => {
            const res = await request(app).patch(`/api/v1/addresses/${addressId}/default`);
            expect(res.status).toBe(401);
        });
    });

    describe('DELETE /api/v1/addresses/:id', () => {
        it('should return 404 for unknown id', async () => {
            const res = await request(app)
                .delete('/api/v1/addresses/00000000-0000-0000-0000-000000000000')
                .set('Authorization', customerToken);

            expect(res.status).toBe(404);
        });

        it('should return 400 for a malformed (non-UUID) id', async () => {
            const res = await request(app)
                .delete('/api/v1/addresses/not-a-uuid')
                .set('Authorization', customerToken);

            expect(res.status).toBe(400);
        });

        it('should return 404 when deleting another user\'s address', async () => {
            const res = await request(app)
                .delete(`/api/v1/addresses/${addressId}`)
                .set('Authorization', otherCustomerToken);

            expect(res.status).toBe(404);
        });

        it('should delete an address', async () => {
            const res = await request(app)
                .delete(`/api/v1/addresses/${addressId}`)
                .set('Authorization', customerToken);

            expect(res.status).toBe(204);
        });

        it('should return 404 on second delete', async () => {
            const res = await request(app)
                .delete(`/api/v1/addresses/${addressId}`)
                .set('Authorization', customerToken);

            expect(res.status).toBe(404);
        });

        it('should return 401 without auth', async () => {
            const res = await request(app).delete(`/api/v1/addresses/${defaultAddressId}`);
            expect(res.status).toBe(401);
        });
    });
});
