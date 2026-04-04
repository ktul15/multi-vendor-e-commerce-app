import { Prisma, OrderStatus } from '../../generated/prisma/client';
import { prisma } from '../../config/prisma';
import {
  SummaryQueryInput,
  SalesQueryInput,
  TopProductsQueryInput,
} from './analytics.validation';

// Statuses that do not represent real revenue
const EXCLUDED_STATUSES: OrderStatus[] = [OrderStatus.CANCELLED, OrderStatus.REFUNDED];

interface SummaryResult {
  orders: {
    // All orders for this vendor in the date range, regardless of status.
    // Use byStatus to see the breakdown. Note: billableOrders excludes CANCELLED/REFUNDED.
    totalOrders: number;
    billableOrders: number;
    byStatus: Record<string, number>;
  };
  revenue: {
    // gross is summed from VendorOrder.subtotal for non-cancelled/refunded orders.
    // net and commission are summed from VendorEarning records with status PENDING or
    // TRANSFERRED. These figures can diverge temporarily during the window between
    // a payment succeeding and its VendorEarning record being created by the Stripe webhook.
    gross: string;
    net: string;
    commission: string;
  };
  dateRange: { startDate: string | null; endDate: string | null };
}

interface SalesBucket {
  periodStart: string;
  orderCount: number;
  revenue: string;
}

interface SalesResult {
  period: 'day' | 'week' | 'month';
  series: SalesBucket[];
  dateRange: { startDate: string; endDate: string };
}

interface TopProduct {
  rank: number;
  productId: string;
  productName: string;
  orderCount: number;
  totalRevenue: string;
}

interface TopProductsResult {
  products: TopProduct[];
  dateRange: { startDate: string | null; endDate: string | null };
}

interface SalesRow {
  periodStart: Date;
  orderCount: number;
  revenue: Prisma.Decimal;
}

interface TopProductRow {
  productId: string;
  productName: string;
  orderCount: number;
  totalRevenue: Prisma.Decimal;
}

export class AnalyticsService {
  async getSummary(
    userId: string,
    vendorProfileId: string,
    query: SummaryQueryInput
  ): Promise<SummaryResult> {
    const dateFilter = this.buildDateFilter(query.startDate, query.endDate);

    const [statusGroups, revenueAgg, earningsAgg] = await Promise.all([
      prisma.vendorOrder.groupBy({
        by: ['status'],
        where: { vendorId: userId, ...(dateFilter && { createdAt: dateFilter }) },
        _count: { id: true },
      }),
      prisma.vendorOrder.aggregate({
        where: {
          vendorId: userId,
          status: { notIn: EXCLUDED_STATUSES },
          ...(dateFilter && { createdAt: dateFilter }),
        },
        _sum: { subtotal: true },
      }),
      // Only PENDING and TRANSFERRED earnings represent real or expected income.
      // FAILED and REVERSED are excluded intentionally.
      prisma.vendorEarning.aggregate({
        where: {
          vendorProfileId,
          status: { in: ['PENDING', 'TRANSFERRED'] },
          ...(dateFilter && { createdAt: dateFilter }),
        },
        _sum: { netAmount: true, commissionAmount: true },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    let totalOrders = 0;
    let billableOrders = 0;
    for (const group of statusGroups) {
      byStatus[group.status] = group._count.id;
      totalOrders += group._count.id;
      if (!EXCLUDED_STATUSES.includes(group.status as OrderStatus)) {
        billableOrders += group._count.id;
      }
    }

    return {
      orders: { totalOrders, billableOrders, byStatus },
      revenue: {
        gross: parseFloat(
          revenueAgg._sum.subtotal?.toString() ?? '0'
        ).toFixed(2),
        net: parseFloat(
          earningsAgg._sum.netAmount?.toString() ?? '0'
        ).toFixed(2),
        commission: parseFloat(
          earningsAgg._sum.commissionAmount?.toString() ?? '0'
        ).toFixed(2),
      },
      dateRange: {
        startDate: query.startDate ?? null,
        endDate: query.endDate ?? null,
      },
    };
  }

  async getSales(userId: string, query: SalesQueryInput): Promise<SalesResult> {
    const period = query.period;

    // Default end is midnight of tomorrow so today's data is fully captured.
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

    // DATE_TRUNC requires a string literal for its first argument in some PostgreSQL
    // versions. Prisma.raw() inlines the value directly instead of binding it as a
    // parameter. Safe here because `period` is validated as a closed enum upstream.
    const rows = await prisma.$queryRaw<SalesRow[]>`
      SELECT
        DATE_TRUNC(${Prisma.raw(`'${period}'`)}, vo."createdAt") AS "periodStart",
        COUNT(DISTINCT vo.id)::int                         AS "orderCount",
        COALESCE(SUM(vo.subtotal), 0)                      AS "revenue"
      FROM vendor_orders vo
      WHERE
        vo."vendorId" = ${userId}
        AND vo.status NOT IN (${OrderStatus.CANCELLED}, ${OrderStatus.REFUNDED})
        AND vo."createdAt" >= ${resolvedStart}
        AND vo."createdAt" <  ${resolvedEnd}
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    const series: SalesBucket[] = rows.map((row) => ({
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

  async getTopProducts(
    userId: string,
    query: TopProductsQueryInput
  ): Promise<TopProductsResult> {
    const startDate = query.startDate ? new Date(query.startDate) : null;
    const endDate = query.endDate ? new Date(query.endDate) : null;
    const limit = query.limit;

    const dateFilter = Prisma.sql`
      ${startDate ? Prisma.sql`AND vo."createdAt" >= ${startDate}` : Prisma.empty}
      ${endDate ? Prisma.sql`AND vo."createdAt" < ${endDate}` : Prisma.empty}
    `;

    const rows = await prisma.$queryRaw<TopProductRow[]>`
      SELECT
        p.id                                       AS "productId",
        p.name                                     AS "productName",
        COUNT(DISTINCT oi."vendorOrderId")::int     AS "orderCount",
        COALESCE(SUM(oi."totalPrice"), 0)           AS "totalRevenue"
      FROM order_items oi
      JOIN vendor_orders vo ON vo.id  = oi."vendorOrderId"
      JOIN variants     var ON var.id = oi."variantId"
      JOIN products     p   ON p.id   = var."productId"
      WHERE
        vo."vendorId" = ${userId}
        AND vo.status NOT IN (${OrderStatus.CANCELLED}, ${OrderStatus.REFUNDED})
        ${dateFilter}
      GROUP BY p.id, p.name
      ORDER BY SUM(oi."totalPrice") DESC
      LIMIT ${limit}
    `;

    const products: TopProduct[] = rows.map((row, index) => ({
      rank: index + 1,
      productId: row.productId,
      productName: row.productName,
      orderCount: row.orderCount,
      totalRevenue: parseFloat(row.totalRevenue.toString()).toFixed(2),
    }));

    return {
      products,
      dateRange: {
        startDate: query.startDate ?? null,
        endDate: query.endDate ?? null,
      },
    };
  }

  private buildDateFilter(
    startDate?: string,
    endDate?: string
  ): { gte?: Date; lt?: Date } | null {
    if (!startDate && !endDate) return null;
    return {
      ...(startDate && { gte: new Date(startDate) }),
      ...(endDate && { lt: new Date(endDate) }),
    };
  }
}

export const analyticsService = new AnalyticsService();
