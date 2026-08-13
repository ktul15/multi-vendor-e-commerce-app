import { prisma } from '../../config/prisma';
import { AdminService } from '../../modules/admin/admin.service';
import { listOrdersQuerySchema } from '../../modules/admin/admin.validation';

describe('admin order search contract', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('trims search and rejects values longer than 100 characters', () => {
    expect(
      listOrdersQuerySchema.parse({
        limit: '20',
        page: '1',
        search: '  ORD-123  ',
      })
    ).toMatchObject({ search: 'ORD-123' });
    expect(() =>
      listOrdersQuerySchema.parse({ search: 'x'.repeat(101) })
    ).toThrow();
  });

  it('applies case-insensitive order number and customer search with other filters', async () => {
    const count = jest.spyOn(prisma.order, 'count').mockResolvedValue(0);
    jest.spyOn(prisma.order, 'findMany').mockResolvedValue([]);
    const service = new AdminService();

    await service.listAllOrders({
      limit: 20,
      page: 1,
      search: 'asha',
      status: 'PROCESSING',
      vendorId: '11111111-1111-4111-8111-111111111111',
    });

    expect(count).toHaveBeenCalledWith({
      where: {
        OR: [
          { orderNumber: { contains: 'asha', mode: 'insensitive' } },
          { user: { name: { contains: 'asha', mode: 'insensitive' } } },
          { user: { email: { contains: 'asha', mode: 'insensitive' } } },
        ],
        vendorOrders: {
          some: {
            status: 'PROCESSING',
            vendorId: '11111111-1111-4111-8111-111111111111',
          },
        },
      },
    });
  });
});
