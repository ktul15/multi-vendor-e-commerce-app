import { prisma } from '../../config/prisma';
import { AdminService } from '../../modules/admin/admin.service';
import { revenueQuerySchema } from '../../modules/admin/admin.validation';

describe('admin finance reporting', () => {
  afterEach(() => jest.restoreAllMocks());

  it('validates ordered date ranges capped at 366 days', () => {
    expect(
      revenueQuerySchema.parse({
        startDate: '2026-08-01T00:00:00.000Z',
        endDate: '2026-08-16T00:00:00.000Z',
        period: 'day',
      })
    ).toMatchObject({ period: 'day' });
    expect(() =>
      revenueQuerySchema.parse({
        startDate: '2026-08-16T00:00:00.000Z',
        endDate: '2026-08-01T00:00:00.000Z',
      })
    ).toThrow('startDate must be before or equal to endDate');
  });

  it('returns authoritative earnings and payout aggregates without client calculations', async () => {
    jest.spyOn(prisma, '$queryRaw').mockResolvedValue([
      {
        orderCount: 2,
        periodStart: new Date('2026-08-01T00:00:00.000Z'),
        revenue: 1500,
      },
    ]);
    jest.spyOn(prisma.vendorEarning, 'aggregate').mockResolvedValue({
      _count: { _all: 2 },
      _sum: { commissionAmount: 150, grossAmount: 1500, netAmount: 1350 },
    } as never);
    jest.spyOn(prisma.vendorEarning, 'groupBy').mockResolvedValue([
      {
        _count: { _all: 2 },
        _sum: { commissionAmount: 150, grossAmount: 1500, netAmount: 1350 },
        status: 'TRANSFERRED',
      },
    ] as never);
    jest
      .spyOn(prisma.vendorPayout, 'groupBy')
      .mockResolvedValue([
        { _count: { _all: 1 }, _sum: { amount: 1000 }, status: 'PAID' },
      ] as never);
    jest.spyOn(prisma.vendorPayout, 'findMany').mockResolvedValue([
      {
        amount: { toFixed: () => '1000.00' },
        id: 'payout-1',
        status: 'PAID',
        vendorProfile: { id: 'vendor-1', storeName: 'Asha Store' },
      },
    ] as never);

    const report = await new AdminService().getPlatformRevenue({
      endDate: '2026-08-16T00:00:00.000Z',
      period: 'day',
      startDate: '2026-08-01T00:00:00.000Z',
    });

    expect(report.totals).toEqual({
      grossRevenue: '1500.00',
      platformCommission: '150.00',
      vendorEarnings: '1350.00',
      vendorOrderCount: 2,
    });
    expect(report.earningsByStatus[0]).toMatchObject({
      platformCommission: '150.00',
      status: 'TRANSFERRED',
      vendorEarnings: '1350.00',
    });
    expect(report.payoutsByStatus[0]).toEqual({
      amount: '1000.00',
      count: 1,
      status: 'PAID',
    });
    expect(report.recentPayouts[0]).toMatchObject({
      amount: '1000.00',
      id: 'payout-1',
    });
  });
});
