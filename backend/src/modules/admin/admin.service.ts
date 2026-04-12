import { Prisma, EarningStatus } from '../../generated/prisma/client';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { ApiError } from '../../utils/apiError';
import {
  ListUsersQueryInput,
  ListVendorsQueryInput,
  ListProductsQueryInput,
  ListOrdersQueryInput,
  RevenueQueryInput,
} from './admin.validation';

interface PaginatedResult<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface RevenueRow {
  periodStart: Date;
  orderCount: number;
  revenue: Prisma.Decimal;
}

// EarningStatus values that represent real or expected platform income
const BILLABLE_EARNING_STATUSES: EarningStatus[] = [
  EarningStatus.PENDING,
  EarningStatus.TRANSFERRED,
];

export class AdminService {
  // ---- Dashboard ----

  async getDashboardStats() {
    const [
      totalUsers,
      bannedUsers,
      totalVendors,
      pendingVendors,
      totalProducts,
      totalOrders,
      revenueAgg,
    ] = await Promise.all([
      prisma.user.count({ where: { role: { not: 'ADMIN' } } }),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.vendorProfile.count(),
      prisma.vendorProfile.count({ where: { status: 'PENDING' } }),
      prisma.product.count(),
      prisma.order.count(),
      prisma.vendorEarning.aggregate({
        // commissionAmount is the platform's cut; grossAmount is vendor GMV.
        // Summing commissionAmount gives the platform's actual earned revenue.
        _sum: { commissionAmount: true },
        where: { status: { in: BILLABLE_EARNING_STATUSES } },
      }),
    ]);

    return {
      totalUsers,
      bannedUsers,
      totalVendors,
      pendingVendors,
      totalProducts,
      totalOrders,
      platformRevenue: parseFloat(
        revenueAgg._sum.commissionAmount?.toString() ?? '0'
      ).toFixed(2),
    };
  }

  // ---- Users ----

  async listUsers(query: ListUsersQueryInput): Promise<PaginatedResult<unknown>> {
    const { page, limit, role, isBanned, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      ...(role && { role }),
      ...(isBanned !== undefined && { isBanned }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isBanned: true,
          isVerified: true,
          createdAt: true,
          vendorProfile: {
            select: { id: true, storeName: true, status: true },
          },
        },
      }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async banUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');
    if (user.role === 'ADMIN') throw ApiError.forbidden('Cannot ban an admin account');
    if (user.isBanned) throw ApiError.conflict('User is already banned');

    return prisma.user.update({
      where: { id: userId },
      data: { isBanned: true },
      select: { id: true, name: true, email: true, isBanned: true },
    });
  }

  async unbanUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');
    if (!user.isBanned) throw ApiError.conflict('User is not currently banned');

    return prisma.user.update({
      where: { id: userId },
      data: { isBanned: false },
      select: { id: true, name: true, email: true, isBanned: true },
    });
  }

  // ---- Vendors ----

  async listVendors(query: ListVendorsQueryInput): Promise<PaginatedResult<unknown>> {
    const { page, limit, status, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.VendorProfileWhereInput = {
      ...(status && { status }),
      ...(search && {
        storeName: { contains: search, mode: 'insensitive' },
      }),
    };

    const [total, items] = await Promise.all([
      prisma.vendorProfile.count({ where }),
      prisma.vendorProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          storeName: true,
          status: true,
          commissionRate: true,
          stripeOnboardingStatus: true,
          createdAt: true,
          user: {
            select: { id: true, name: true, email: true, isBanned: true },
          },
        },
      }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async approveVendor(vendorProfileId: string) {
    const profile = await prisma.vendorProfile.findUnique({
      where: { id: vendorProfileId },
    });
    if (!profile) throw ApiError.notFound('Vendor profile not found');
    if (profile.status === 'APPROVED') throw ApiError.conflict('Vendor is already approved');

    return prisma.vendorProfile.update({
      where: { id: vendorProfileId },
      data: { status: 'APPROVED' },
    });
  }

  async rejectVendor(vendorProfileId: string) {
    const profile = await prisma.vendorProfile.findUnique({
      where: { id: vendorProfileId },
    });
    if (!profile) throw ApiError.notFound('Vendor profile not found');
    if (profile.status === 'APPROVED') {
      throw ApiError.conflict(
        'Cannot reject an already-approved vendor — use suspend instead'
      );
    }
    if (profile.status === 'REJECTED') throw ApiError.conflict('Vendor is already rejected');

    return prisma.vendorProfile.update({
      where: { id: vendorProfileId },
      data: { status: 'REJECTED' },
    });
  }

  async suspendVendor(vendorProfileId: string) {
    const profile = await prisma.vendorProfile.findUnique({
      where: { id: vendorProfileId },
    });
    if (!profile) throw ApiError.notFound('Vendor profile not found');
    if (profile.status !== 'APPROVED') {
      throw ApiError.badRequest('Only approved vendors can be suspended');
    }

    return prisma.vendorProfile.update({
      where: { id: vendorProfileId },
      data: { status: 'SUSPENDED' },
    });
  }

  // ---- Products ----

  async listProducts(query: ListProductsQueryInput): Promise<PaginatedResult<unknown>> {
    const { page, limit, isActive, vendorId, categoryId, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      ...(isActive !== undefined && { isActive }),
      ...(vendorId && { vendorId }),
      ...(categoryId && { categoryId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { tags: { has: search } },
        ],
      }),
    };

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          basePrice: true,
          isActive: true,
          avgRating: true,
          reviewCount: true,
          createdAt: true,
          vendor: { select: { id: true, name: true, email: true } },
          category: { select: { id: true, name: true } },
          _count: { select: { variants: true } },
        },
      }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async activateProduct(productId: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound('Product not found');
    if (product.isActive) throw ApiError.conflict('Product is already active');

    return prisma.product.update({
      where: { id: productId },
      data: { isActive: true },
      select: { id: true, name: true, isActive: true },
    });
  }

  async deactivateProduct(productId: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound('Product not found');
    if (!product.isActive) throw ApiError.conflict('Product is already inactive');

    return prisma.product.update({
      where: { id: productId },
      data: { isActive: false },
      select: { id: true, name: true, isActive: true },
    });
  }

  async deleteProduct(productId: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound('Product not found');

    try {
      await prisma.product.delete({ where: { id: productId } });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2003'
      ) {
        throw ApiError.conflict(
          'Cannot delete a product with existing orders — deactivate it instead'
        );
      }
      throw err;
    }
  }

  // ---- Orders ----

  async listAllOrders(query: ListOrdersQueryInput): Promise<PaginatedResult<unknown>> {
    const { page, limit, status, userId, vendorId, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      // Merge status and vendorId into a single vendorOrders.some to avoid
      // object spread overwriting the earlier key when both filters are provided.
      ...((status || vendorId) && {
        vendorOrders: {
          some: {
            ...(status && { status }),
            ...(vendorId && { vendorId }),
          },
        },
      }),
      ...(userId && { userId }),
      ...((startDate || endDate) && {
        createdAt: {
          ...(startDate && { gte: new Date(startDate) }),
          // lte so that orders created within the endDate day are included.
          ...(endDate && { lte: new Date(endDate) }),
        },
      }),
    };

    const [total, items] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          subtotal: true,
          discount: true,
          tax: true,
          total: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
          vendorOrders: {
            select: {
              id: true,
              status: true,
              vendorId: true,
              subtotal: true,
              vendor: { select: { vendorProfile: { select: { storeName: true } } } },
            },
          },
          payment: { select: { status: true, method: true } },
        },
      }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async getOrderById(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        subtotal: true,
        discount: true,
        tax: true,
        total: true,
        notes: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
        vendorOrders: {
          select: {
            id: true,
            status: true,
            subtotal: true,
            trackingNumber: true,
            trackingCarrier: true,
            vendorId: true,
            vendor: {
              select: { vendorProfile: { select: { id: true, storeName: true } } },
            },
            items: {
              select: {
                id: true,
                quantity: true,
                unitPrice: true,
                totalPrice: true,
                variant: {
                  select: {
                    sku: true,
                    size: true,
                    color: true,
                    price: true,
                    product: {
                      select: { name: true, images: true },
                    },
                  },
                },
              },
            },
          },
        },
        address: true,
        payment: { select: { status: true, method: true, paidAt: true } },
        promoCode: {
          select: { code: true, discountType: true, discountValue: true },
        },
      },
    });

    if (!order) throw ApiError.notFound('Order not found');
    return order;
  }

  // ---- Revenue ----

  async getPlatformRevenue(query: RevenueQueryInput) {
    const period = query.period;

    const resolvedEnd = query.endDate
      ? new Date(query.endDate)
      : (() => {
          const d = new Date();
          d.setUTCHours(24, 0, 0, 0);
          return d;
        })();
    const resolvedStart = query.startDate
      ? new Date(query.startDate)
      : new Date(resolvedEnd.getTime() - 30 * 24 * 60 * 60 * 1000);

    // DATE_TRUNC period is validated as a closed enum upstream — safe to inline.
    const rows = await prisma.$queryRaw<RevenueRow[]>`
      SELECT
        DATE_TRUNC(${Prisma.raw(`'${period}'`)}, ve."createdAt") AS "periodStart",
        COUNT(DISTINCT ve."vendorOrderId")::int                   AS "orderCount",
        COALESCE(SUM(ve."grossAmount"), 0)                        AS "revenue"
      FROM vendor_earnings ve
      WHERE
        ve.status NOT IN ('FAILED', 'REVERSED')
        AND ve."createdAt" >= ${resolvedStart}
        AND ve."createdAt" <  ${resolvedEnd}
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    const series = rows.map((row) => ({
      periodStart: row.periodStart.toISOString().slice(0, 10),
      orderCount: row.orderCount,
      revenue: parseFloat(row.revenue.toString()).toFixed(2),
    }));

    return {
      period,
      series,
      dateRange: {
        startDate: resolvedStart.toISOString(),
        endDate: resolvedEnd.toISOString(),
      },
    };
  }

  // ---- Commission ----

  async getDefaultCommission() {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: 'defaultCommissionRate' },
    });

    const raw = setting ? setting.value : env.PLATFORM_COMMISSION_RATE;
    const rate = parseFloat(raw);
    if (isNaN(rate)) {
      throw ApiError.internal(
        'Platform commission rate setting is corrupt — contact an administrator'
      );
    }

    return {
      rate,
      source: setting ? ('database' as const) : ('env_fallback' as const),
    };
  }

  async setDefaultCommission(rate: number) {
    const updated = await prisma.platformSetting.upsert({
      where: { key: 'defaultCommissionRate' },
      update: { value: rate.toFixed(2) },
      create: { key: 'defaultCommissionRate', value: rate.toFixed(2) },
    });

    return { rate: parseFloat(updated.value) };
  }

  async setVendorCommission(vendorProfileId: string, rate: number | null) {
    const profile = await prisma.vendorProfile.findUnique({
      where: { id: vendorProfileId },
    });
    if (!profile) throw ApiError.notFound('Vendor profile not found');

    return prisma.vendorProfile.update({
      where: { id: vendorProfileId },
      data: { commissionRate: rate },
      select: { id: true, storeName: true, commissionRate: true },
    });
  }
}

export const adminService = new AdminService();
