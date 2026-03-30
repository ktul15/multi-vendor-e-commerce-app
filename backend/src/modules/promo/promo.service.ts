import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { DiscountType, Prisma } from '../../generated/prisma/client';
import {
  CreatePromoInput,
  UpdatePromoInput,
  GetPromosQueryInput,
} from './promo.validation';

export class PromoService {
  async createPromo(input: CreatePromoInput) {
    const existing = await prisma.promoCode.findUnique({
      where: { code: input.code },
    });
    if (existing) {
      throw ApiError.conflict('A promo code with this code already exists');
    }

    return prisma.promoCode.create({
      data: {
        code: input.code,
        discountType: input.discountType as DiscountType,
        discountValue: input.discountValue,
        minOrderValue: input.minOrderValue ?? null,
        maxDiscount: input.maxDiscount ?? null,
        usageLimit: input.usageLimit ?? null,
        perUserLimit: input.perUserLimit ?? null,
        isActive: input.isActive,
        expiresAt: input.expiresAt ?? null,
      },
    });
  }

  async getPromos(query: GetPromosQueryInput) {
    const { page, limit, isActive, search, discountType } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PromoCodeWhereInput = {
      ...(isActive !== undefined && { isActive }),
      ...(discountType && { discountType: discountType as DiscountType }),
      ...(search && {
        code: { contains: search.toUpperCase(), mode: 'insensitive' as const },
      }),
    };

    const [total, items] = await Promise.all([
      prisma.promoCode.count({ where }),
      prisma.promoCode.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { orders: true, usages: true } },
        },
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getPromoById(id: string) {
    const promo = await prisma.promoCode.findUnique({
      where: { id },
      include: {
        _count: { select: { orders: true, usages: true } },
        usages: {
          take: 10,
          orderBy: { usedAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!promo) {
      throw ApiError.notFound('Promo code not found');
    }

    return promo;
  }

  async updatePromo(id: string, input: UpdatePromoInput) {
    const existing = await prisma.promoCode.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound('Promo code not found');
    }

    // Check uniqueness if code is being changed
    if (input.code && input.code !== existing.code) {
      const duplicate = await prisma.promoCode.findUnique({
        where: { code: input.code },
      });
      if (duplicate) {
        throw ApiError.conflict('A promo code with this code already exists');
      }
    }

    // Validate percentage <= 100 when discount type or value changes
    const effectiveType = input.discountType ?? existing.discountType;
    const effectiveValue =
      input.discountValue ?? Number(existing.discountValue);
    if (effectiveType === 'PERCENTAGE' && effectiveValue > 100) {
      throw ApiError.badRequest('Percentage discount cannot exceed 100');
    }

    return prisma.promoCode.update({
      where: { id },
      data: {
        ...(input.code !== undefined && { code: input.code }),
        ...(input.discountType !== undefined && {
          discountType: input.discountType as DiscountType,
        }),
        ...(input.discountValue !== undefined && {
          discountValue: input.discountValue,
        }),
        ...(input.minOrderValue !== undefined && {
          minOrderValue: input.minOrderValue,
        }),
        ...(input.maxDiscount !== undefined && {
          maxDiscount: input.maxDiscount,
        }),
        ...(input.usageLimit !== undefined && { usageLimit: input.usageLimit }),
        ...(input.perUserLimit !== undefined && {
          perUserLimit: input.perUserLimit,
        }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.expiresAt !== undefined && { expiresAt: input.expiresAt }),
      },
    });
  }

  async deletePromo(id: string) {
    const existing = await prisma.promoCode.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound('Promo code not found');
    }

    // Soft delete — promo codes are referenced by orders
    return prisma.promoCode.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
