import { randomBytes } from 'crypto';
import Stripe from 'stripe';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { ApiError } from '../../utils/apiError';
import {
  DiscountType,
  OrderStatus,
  Prisma,
} from '../../generated/prisma/client';
import {
  CreateOrderInput,
  GetOrdersQueryInput,
  CancelOrderInput,
} from './order.validation';

const CANCELLABLE_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED'];

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion,
});

function generateOrderNumber(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  // 4 random bytes → 8 hex chars → uppercase (16^8 = ~4.3B combos/day, cryptographically random)
  const rand = randomBytes(4).toString('hex').toUpperCase();
  return `ORD-${datePart}-${rand}`;
}

export class OrderService {
  async createOrder(userId: string, input: CreateOrderInput) {
    const { addressId, promoCode: promoCodeInput, notes } = input;

    // ── Pre-transaction checks (readable errors before acquiring locks) ──

    // 1. Fetch cart with full item details
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: { vendorId: true, isActive: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw ApiError.badRequest('Your cart is empty');
    }

    // 2. Validate address belongs to user
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) throw ApiError.notFound('Address not found');

    // 3. Validate promo code (pre-tx, for readable errors)
    let promoPrecheck: {
      id: string;
      discountType: DiscountType;
      discountValue: number;
      maxDiscount: number | null;
      minOrderValue: number | null;
      usageLimit: number | null;
    } | null = null;

    if (promoCodeInput) {
      const promo = await prisma.promoCode.findUnique({
        where: { code: promoCodeInput },
      });
      if (!promo) throw ApiError.notFound('Promo code not found');
      if (!promo.isActive) throw ApiError.badRequest('Promo code is inactive');
      if (promo.expiresAt && promo.expiresAt < new Date())
        throw ApiError.badRequest('Promo code has expired');
      if (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit) {
        throw ApiError.badRequest('Promo code usage limit reached');
      }
      promoPrecheck = {
        id: promo.id,
        discountType: promo.discountType,
        discountValue: Number(promo.discountValue),
        maxDiscount:
          promo.maxDiscount !== null ? Number(promo.maxDiscount) : null,
        minOrderValue:
          promo.minOrderValue !== null ? Number(promo.minOrderValue) : null,
        usageLimit: promo.usageLimit,
      };
    }

    // ── Interactive transaction ──
    const order = await prisma.$transaction(async (tx) => {
      // 1. Re-fetch cart items for fresh stock
      const freshCart = await tx.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    select: { vendorId: true, isActive: true, name: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!freshCart || freshCart.items.length === 0) {
        throw ApiError.badRequest('Your cart is empty');
      }

      // 2. Validate each item
      for (const item of freshCart.items) {
        if (!item.variant.product.isActive) {
          throw ApiError.badRequest(
            `Product "${item.variant.product.name}" is no longer available`
          );
        }
        if (item.variant.stock < item.quantity) {
          throw ApiError.badRequest(
            `Insufficient stock for variant ${item.variant.id}. Available: ${item.variant.stock}, requested: ${item.quantity}`
          );
        }
      }

      // 3. Calculate subtotal
      const subtotal =
        Math.round(
          freshCart.items.reduce(
            (sum, item) => sum + Number(item.variant.price) * item.quantity,
            0
          ) * 100
        ) / 100;

      // 4. Apply promo (re-validate inside tx for TOCTOU guard)
      let discount = 0;
      let promoId: string | null = null;

      if (promoPrecheck) {
        // Re-fetch full promo row inside tx to guard all validity conditions
        const freshPromo = await tx.promoCode.findUnique({
          where: { id: promoPrecheck.id },
        });
        if (!freshPromo) throw ApiError.notFound('Promo code not found');
        if (!freshPromo.isActive)
          throw ApiError.badRequest('Promo code is inactive');
        if (freshPromo.expiresAt && freshPromo.expiresAt < new Date()) {
          throw ApiError.badRequest('Promo code has expired');
        }
        if (
          freshPromo.usageLimit !== null &&
          freshPromo.usageCount >= freshPromo.usageLimit
        ) {
          throw ApiError.badRequest('Promo code usage limit reached');
        }

        if (
          promoPrecheck.minOrderValue !== null &&
          subtotal < promoPrecheck.minOrderValue
        ) {
          throw ApiError.badRequest(
            `Minimum order value of ${promoPrecheck.minOrderValue} required for this promo code`
          );
        }

        const discountValue = promoPrecheck.discountValue;
        const maxDiscount = promoPrecheck.maxDiscount;

        if (promoPrecheck.discountType === DiscountType.PERCENTAGE) {
          discount = (subtotal * discountValue) / 100;
          if (maxDiscount !== null) discount = Math.min(discount, maxDiscount);
        } else {
          discount = Math.min(discountValue, subtotal);
        }
        discount = Math.round(discount * 100) / 100;
        promoId = promoPrecheck.id;
      }

      // 5. Totals
      const tax = 0;
      const total = Math.round(Math.max(0, subtotal - discount) * 100) / 100;

      // 6. Create order
      const orderNumber = generateOrderNumber();
      const shippingAddress = {
        fullName: address.fullName,
        phone: address.phone,
        street: address.street,
        city: address.city,
        state: address.state,
        country: address.country,
        zipCode: address.zipCode,
      };

      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          addressId,
          promoCodeId: promoId,
          shippingAddress,
          subtotal,
          discount,
          tax,
          total,
          notes: notes ?? null,
        },
      });

      // 7. Group items by vendor
      const vendorMap = new Map<string, typeof freshCart.items>();
      for (const item of freshCart.items) {
        const vendorId = item.variant.product.vendorId;
        if (!vendorMap.has(vendorId)) vendorMap.set(vendorId, []);
        vendorMap.get(vendorId)!.push(item);
      }

      // 8. Create VendorOrders + OrderItems
      for (const [vendorId, items] of vendorMap) {
        const vendorSubtotal =
          Math.round(
            items.reduce(
              (sum, item) => sum + Number(item.variant.price) * item.quantity,
              0
            ) * 100
          ) / 100;

        await tx.vendorOrder.create({
          data: {
            orderId: createdOrder.id,
            vendorId,
            subtotal: vendorSubtotal,
            items: {
              create: items.map((item) => ({
                variantId: item.variantId,
                quantity: item.quantity,
                unitPrice: Number(item.variant.price),
                totalPrice:
                  Math.round(Number(item.variant.price) * item.quantity * 100) /
                  100,
              })),
            },
          },
        });
      }

      // 9. Decrement stock — one UPDATE per variant (intentional: each row needs its own decrement value)
      for (const item of freshCart.items) {
        await tx.variant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // 10. Atomically increment promo usage, guarded by the limit condition.
      // Using a raw UPDATE so the check-and-increment is a single DB operation,
      // preventing race conditions where two concurrent transactions both pass
      // the usageCount check and both commit (exceeding the limit).
      if (promoId) {
        const affected = await tx.$executeRaw`
                    UPDATE "promo_codes"
                    SET "usageCount" = "usageCount" + 1
                    WHERE id::text = ${promoId}
                    AND ("usageLimit" IS NULL OR "usageCount" < "usageLimit")
                `;
        if (affected === 0) {
          throw ApiError.badRequest('Promo code usage limit reached');
        }
      }

      // 11. Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: freshCart.id } });

      // 12. Return full order
      return tx.order.findUniqueOrThrow({
        where: { id: createdOrder.id },
        include: {
          vendorOrders: {
            include: {
              items: {
                include: {
                  variant: {
                    select: { sku: true, size: true, color: true, price: true },
                  },
                },
              },
            },
          },
          address: true,
          promoCode: {
            select: { code: true, discountType: true, discountValue: true },
          },
        },
      });
    });

    return order;
  }

  async getOrders(userId: string, query: GetOrdersQueryInput) {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;

    // Uses `some` semantics: an order appears if *at least one* vendor order
    // matches the status. In a multi-vendor order this means the same order
    // can appear under multiple status filters (e.g. one vendor SHIPPED,
    // another CANCELLED). This is intentional — customers see every order
    // that has activity matching their filter.
    const where: Prisma.OrderWhereInput = {
      userId,
      ...(status && {
        vendorOrders: { some: { status } },
      }),
    };

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vendorOrders: {
            include: {
              _count: { select: { items: true } },
            },
          },
          payment: {
            select: { status: true, method: true, paidAt: true },
          },
        },
      }),
    ]);

    return {
      items: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getOrderById(userId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        vendorOrders: {
          include: {
            items: {
              include: {
                variant: {
                  select: {
                    sku: true,
                    size: true,
                    color: true,
                    price: true,
                    product: { select: { name: true, images: true } },
                  },
                },
              },
            },
          },
        },
        address: true,
        payment: true,
        promoCode: {
          select: { code: true, discountType: true, discountValue: true },
        },
      },
    });

    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    return order;
  }

  async cancelOrder(userId: string, orderId: string, input: CancelOrderInput) {
    // Two-phase approach: DB transaction first, then Stripe calls after commit.
    // This prevents the scenario where Stripe refund succeeds but the DB
    // transaction rolls back, leaving money refunded with no DB record.

    const { paymentIntentId, previousPaymentStatus } =
      await prisma.$transaction(async (tx) => {
        // 1. Fetch order inside the transaction to prevent TOCTOU race conditions
        const order = await tx.order.findFirst({
          where: { id: orderId, userId },
          include: {
            vendorOrders: { include: { items: true } },
            payment: true,
          },
        });

        if (!order) {
          throw ApiError.notFound('Order not found');
        }

        // 2. Verify all vendor orders are in a cancellable state
        const nonCancellable = order.vendorOrders.find(
          (vo) => !CANCELLABLE_STATUSES.includes(vo.status)
        );
        if (nonCancellable) {
          throw ApiError.badRequest(
            `Order cannot be cancelled — vendor order ${nonCancellable.id} is already ${nonCancellable.status}`
          );
        }

        // 3. Update all vendor orders to CANCELLED
        await tx.vendorOrder.updateMany({
          where: { orderId },
          data: { status: 'CANCELLED' },
        });

        // 4. Restore stock for every item
        for (const vo of order.vendorOrders) {
          for (const item of vo.items) {
            await tx.variant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }

        // 5. Store cancellation reason in dedicated field (preserves original notes)
        if (input.reason) {
          await tx.order.update({
            where: { id: orderId },
            data: { cancellationReason: input.reason },
          });
        }

        // 6. Mark payment with transitional status for Stripe processing after commit
        let intentId: string | null = null;
        let prevStatus: string | null = null;

        if (order.payment?.stripePaymentIntentId) {
          intentId = order.payment.stripePaymentIntentId;
          prevStatus = order.payment.status;

          if (order.payment.status === 'SUCCEEDED') {
            await tx.payment.update({
              where: { orderId },
              data: { status: 'REFUNDED' },
            });
          } else if (order.payment.status === 'PROCESSING') {
            await tx.payment.update({
              where: { orderId },
              data: { status: 'CANCELLED' },
            });
          }
        }

        return { paymentIntentId: intentId, previousPaymentStatus: prevStatus };
      });

    // Phase 2: Call Stripe after DB transaction has committed successfully.
    // If Stripe fails, the DB already reflects the cancellation — a background
    // job or manual intervention can retry the refund.
    if (paymentIntentId) {
      if (previousPaymentStatus === 'SUCCEEDED') {
        await stripe.refunds.create({ payment_intent: paymentIntentId });
      } else if (previousPaymentStatus === 'PROCESSING') {
        await stripe.paymentIntents.cancel(paymentIntentId);
      }
    }

    // Return the updated order
    const cancelled = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        vendorOrders: {
          include: {
            items: {
              include: {
                variant: {
                  select: { sku: true, size: true, color: true, price: true },
                },
              },
            },
          },
        },
        payment: true,
      },
    });

    return cancelled;
  }
}
