import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { AddCartItemInput, UpdateCartItemInput } from './cart.validation';
import { DiscountType, Prisma } from '../../generated/prisma/client';

// Shape returned for the full cart (including computed totals)
interface CartWithTotals {
  id: string;
  userId: string;
  items: CartItemDetail[];
  subtotal: number;
  createdAt: Date;
  updatedAt: Date;
}

interface CartItemDetail {
  id: string;
  cartId: string;
  quantity: number;
  variant: {
    id: string;
    size: string | null;
    color: string | null;
    price: number;
    stock: number;
    sku: string;
    product: {
      id: string;
      name: string;
      images: string[];
      isActive: boolean;
      vendorId: string;
      vendor: { name: string };
    };
  };
}

const cartInclude = {
  items: {
    include: {
      variant: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              images: true,
              isActive: true,
              vendorId: true,
              vendor: { select: { name: true } },
            },
          },
        },
      },
    },
  },
} as const;

export class CartService {
  private toCartWithTotals(
    cart: Prisma.CartGetPayload<{ include: typeof cartInclude }>
  ): CartWithTotals {
    const items = cart.items.map((item) => ({
      ...item,
      variant: {
        ...item.variant,
        price: Number(item.variant.price),
      },
    }));
    const subtotal = items.reduce(
      (sum, item) => sum + item.variant.price * item.quantity,
      0
    );
    return { ...cart, items, subtotal };
  }

  async getCart(userId: string): Promise<CartWithTotals> {
    const cart = await prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: cartInclude,
    });
    return this.toCartWithTotals(cart);
  }

  async addItem(
    userId: string,
    input: AddCartItemInput
  ): Promise<CartWithTotals> {
    const { variantId, quantity } = input;

    const updatedCart = await prisma.$transaction(async (tx) => {
      // Re-read variant inside the transaction for a fresh, consistent view
      const variant = await tx.variant.findUnique({
        where: { id: variantId },
        include: { product: { select: { isActive: true } } },
      });

      if (!variant) throw ApiError.notFound('Variant not found');
      if (!variant.product.isActive)
        throw ApiError.badRequest('This product is no longer available');

      // Find or create cart inside the same transaction
      const cart = await tx.cart.upsert({
        where: { userId },
        create: { userId },
        update: {},
        select: { id: true },
      });

      // Get existing quantity already in cart for this variant
      const existingItem = await tx.cartItem.findUnique({
        where: { cartId_variantId: { cartId: cart.id, variantId } },
        select: { quantity: true },
      });

      const currentQty = existingItem?.quantity ?? 0;
      const totalQty = currentQty + quantity;

      if (variant.stock < totalQty) {
        throw ApiError.badRequest(
          `Insufficient stock. Available: ${variant.stock}, requested total: ${totalQty}`
        );
      }

      await tx.cartItem.upsert({
        where: { cartId_variantId: { cartId: cart.id, variantId } },
        create: { cartId: cart.id, variantId, quantity },
        update: { quantity: { increment: quantity } },
      });

      return tx.cart.findUniqueOrThrow({
        where: { id: cart.id },
        include: cartInclude,
      });
    });

    return this.toCartWithTotals(updatedCart);
  }

  async updateItem(
    userId: string,
    itemId: string,
    input: UpdateCartItemInput
  ): Promise<CartWithTotals> {
    const { quantity } = input;

    const updatedCart = await prisma.$transaction(async (tx) => {
      const item = await tx.cartItem.findUnique({
        where: { id: itemId },
        include: { cart: true, variant: true },
      });

      if (!item || item.cart.userId !== userId)
        throw ApiError.notFound('Cart item not found');

      if (item.variant.stock < quantity) {
        throw ApiError.badRequest(
          `Insufficient stock. Available: ${item.variant.stock}, requested: ${quantity}`
        );
      }

      await tx.cartItem.update({ where: { id: itemId }, data: { quantity } });

      return tx.cart.findUniqueOrThrow({
        where: { userId },
        include: cartInclude,
      });
    });

    return this.toCartWithTotals(updatedCart);
  }

  async removeItem(userId: string, itemId: string): Promise<CartWithTotals> {
    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!item || item.cart.userId !== userId)
      throw ApiError.notFound('Cart item not found');

    await prisma.cartItem.delete({ where: { id: itemId } });

    const updatedCart = await prisma.cart.findUniqueOrThrow({
      where: { userId },
      include: cartInclude,
    });
    return this.toCartWithTotals(updatedCart);
  }

  async clearCart(userId: string): Promise<void> {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) return;
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }

  /**
   * Preview what discount a promo code would give for the current cart.
   * Does NOT persist anything — usageCount is incremented atomically at order creation.
   */
  async previewPromo(
    userId: string,
    code: string
  ): Promise<{
    code: string;
    discountType: DiscountType;
    discountValue: number;
    maxDiscount: number | null;
    discountAmount: number;
    subtotal: number;
    total: number;
  }> {
    const promo = await prisma.promoCode.findUnique({ where: { code } });

    if (!promo) throw ApiError.notFound('Promo code not found');
    if (!promo.isActive) throw ApiError.badRequest('Promo code is inactive');
    if (promo.expiresAt && promo.expiresAt < new Date())
      throw ApiError.badRequest('Promo code has expired');
    if (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit) {
      throw ApiError.badRequest('Promo code usage limit reached');
    }
    if (promo.perUserLimit !== null) {
      const userUsageCount = await prisma.promoUsage.count({
        where: { userId, promoCodeId: promo.id },
      });
      if (userUsageCount >= promo.perUserLimit) {
        throw ApiError.badRequest(
          'You have already used this promo code the maximum number of times'
        );
      }
    }

    // Require a non-empty cart before computing the discount
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: cartInclude,
    });
    if (!cart || cart.items.length === 0)
      throw ApiError.badRequest('Your cart is empty');

    const subtotal = cart.items.reduce(
      (sum, item) => sum + Number(item.variant.price) * item.quantity,
      0
    );

    if (
      promo.minOrderValue !== null &&
      subtotal < Number(promo.minOrderValue)
    ) {
      throw ApiError.badRequest(
        `Minimum order value of ${promo.minOrderValue} required for this promo code`
      );
    }

    const discountValue = Number(promo.discountValue);
    const maxDiscount =
      promo.maxDiscount !== null ? Number(promo.maxDiscount) : null;

    let discountAmount: number;
    if (promo.discountType === DiscountType.PERCENTAGE) {
      discountAmount = (subtotal * discountValue) / 100;
      if (maxDiscount !== null)
        discountAmount = Math.min(discountAmount, maxDiscount);
    } else {
      discountAmount = Math.min(discountValue, subtotal);
    }

    discountAmount = Math.round(discountAmount * 100) / 100;
    const total =
      Math.round(Math.max(0, subtotal - discountAmount) * 100) / 100;

    return {
      code: promo.code,
      discountType: promo.discountType,
      discountValue,
      maxDiscount,
      discountAmount,
      subtotal,
      total,
    };
  }
}
