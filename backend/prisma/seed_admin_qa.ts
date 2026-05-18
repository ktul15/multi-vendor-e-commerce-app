import 'dotenv/config';
import { randomUUID } from 'crypto';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  Currency,
  DiscountType,
  EarningStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PayoutStatus,
  PrismaClient,
  Role,
  VendorOnboardingStatus,
  VendorProfileStatus,
} from '../src/generated/prisma/client';
import { hashPassword } from '../src/utils/password';

const RUN_ID = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const PASSWORD = 'password123';
const ADMIN_PASSWORD = 'admin123';
const PLATFORM_COMMISSION_RATE = '12.50';

const pool = new pg.Pool({
  connectionString: process.env['DATABASE_URL'],
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
let db: any = prisma;

type SeedVendor = {
  id: string;
  email: string;
  profileId: string;
  storeName: string;
};

type SeedCustomer = {
  id: string;
  email: string;
  addressId: string;
};

type SeedProduct = {
  id: string;
  variantId: string;
  vendorId: string;
  vendorProfileId: string;
  name: string;
  price: number;
};

function money(value: number): string {
  return value.toFixed(2);
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setUTCHours(10, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setUTCHours(23, 59, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

async function clearExistingData() {
  console.log('🧹 Clearing existing data while preserving ADMIN users...');

  await db.promoUsage.deleteMany();
  await db.vendorEarning.deleteMany();
  await db.vendorPayout.deleteMany();
  await db.payment.deleteMany();
  await db.orderItem.deleteMany();
  await db.vendorOrder.deleteMany();
  await db.order.deleteMany();
  await db.cartItem.deleteMany();
  await db.cart.deleteMany();
  await db.wishlistItem.deleteMany();
  await db.review.deleteMany();
  await db.notification.deleteMany();
  await db.variant.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();
  await db.banner.deleteMany();
  await db.promoCode.deleteMany();
  await db.address.deleteMany();
  await db.vendorProfile.deleteMany();
  await db.platformSetting.deleteMany();
  await db.user.deleteMany({ where: { role: { not: Role.ADMIN } } });
}

async function ensureAdmin() {
  const adminCount = await db.user.count({ where: { role: Role.ADMIN } });
  if (adminCount > 0) {
    console.log(`  ✅ Preserved ${adminCount} existing ADMIN user(s)`);
    return;
  }

  const password = await hashPassword(ADMIN_PASSWORD);
  await db.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@ecommerce.com',
      password,
      role: Role.ADMIN,
      isVerified: true,
    },
  });
  console.log('  ✅ Created fallback admin: admin@ecommerce.com / admin123');
}

async function seedPlatformSettings() {
  await db.platformSetting.create({
    data: {
      key: 'defaultCommissionRate',
      value: PLATFORM_COMMISSION_RATE,
    },
  });
  console.log(`  ✅ Platform commission seeded: ${PLATFORM_COMMISSION_RATE}%`);
}

async function seedUsersAndVendors(passwordHash: string) {
  const customers: SeedCustomer[] = [];
  const vendors: SeedVendor[] = [];

  const customerSpecs = Array.from({ length: 22 }, (_, index) => {
    const number = index + 1;
    return {
      name:
        number === 3
          ? `QA Customer <script>alert("xss")</script> ${RUN_ID}`
          : number === 4
            ? `QA Customer With A Very Long Name For Layout Regression ${RUN_ID} ${number}`
            : `QA Customer ${RUN_ID} ${number.toString().padStart(2, '0')}`,
      email: `qa.customer.${RUN_ID}.${number}@example.com`,
      isBanned: number === 5 || number === 12,
      isVerified: number !== 6,
    };
  });

  for (const spec of customerSpecs) {
    const user = await db.user.create({
      data: {
        ...spec,
        password: passwordHash,
        role: Role.CUSTOMER,
      },
    });
    const address = await db.address.create({
      data: {
        userId: user.id,
        fullName: spec.name,
        phone: `+1555000${customers.length.toString().padStart(4, '0')}`,
        street: `${100 + customers.length} QA Market Street`,
        city: customers.length % 2 === 0 ? 'San Francisco' : 'Austin',
        state: customers.length % 2 === 0 ? 'CA' : 'TX',
        country: 'USA',
        zipCode: customers.length % 2 === 0 ? '94105' : '73301',
        isDefault: true,
      },
    });
    customers.push({ id: user.id, email: user.email, addressId: address.id });
  }

  const vendorStatuses = [
    VendorProfileStatus.PENDING,
    VendorProfileStatus.APPROVED,
    VendorProfileStatus.REJECTED,
    VendorProfileStatus.SUSPENDED,
  ];

  for (let index = 0; index < 18; index += 1) {
    const number = index + 1;
    const status = vendorStatuses[index % vendorStatuses.length];
    const storeName =
      number === 2
        ? `QA Vendor <script>store</script> ${RUN_ID}`
        : number === 3
          ? `QA Vendor Store With An Intentionally Long Name For Table Layout ${RUN_ID}`
          : `QA Vendor Store ${RUN_ID} ${number.toString().padStart(2, '0')}`;
    const user = await db.user.create({
      data: {
        name: `QA Vendor Owner ${RUN_ID} ${number.toString().padStart(2, '0')}`,
        email: `qa.vendor.${RUN_ID}.${number}@example.com`,
        password: passwordHash,
        role: Role.VENDOR,
        isVerified: true,
        isBanned: number === 7,
        vendorProfile: {
          create: {
            storeName,
            storeLogo: `https://picsum.photos/seed/qa-vendor-logo-${RUN_ID}-${number}/240/240`,
            storeBanner: `https://picsum.photos/seed/qa-vendor-banner-${RUN_ID}-${number}/960/320`,
            description: `QA vendor profile for admin status, pagination, and detail testing ${number}.`,
            status,
            stripeAccountId: `acct_qa_${RUN_ID}_${number}`,
            stripeOnboardingStatus:
              status === VendorProfileStatus.APPROVED
                ? VendorOnboardingStatus.COMPLETE
                : VendorOnboardingStatus.PENDING,
            commissionRate:
              number % 3 === 0 ? null : money(8 + (number % 5) * 1.25),
            bankDetails: {
              accountHolderName: `QA Vendor Owner ${number}`,
              bankName: 'QA Test Bank',
              accountNumber: `00012345${number}`,
              routingNumber: '110000000',
            },
          },
        },
      },
      include: { vendorProfile: true },
    });

    vendors.push({
      id: user.id,
      email: user.email,
      profileId: user.vendorProfile!.id,
      storeName,
    });
  }

  console.log(
    `  ✅ Users seeded: ${customers.length} customers, ${vendors.length} vendors`
  );
  return { customers, vendors };
}

async function seedCategories() {
  const electronics = await db.category.create({
    data: {
      name: `QA_CAT_${RUN_ID}_Electronics`,
      slug: `qa-cat-${RUN_ID}-electronics`,
      image: `https://picsum.photos/seed/qa-cat-${RUN_ID}-electronics/800/500`,
    },
  });
  const fashion = await db.category.create({
    data: {
      name: `QA_CAT_${RUN_ID}_Fashion`,
      slug: `qa-cat-${RUN_ID}-fashion`,
      image: `https://picsum.photos/seed/qa-cat-${RUN_ID}-fashion/800/500`,
    },
  });
  const home = await db.category.create({
    data: {
      name: `QA_CAT_${RUN_ID}_Home & Living`,
      slug: `qa-cat-${RUN_ID}-home-living`,
      image: `https://picsum.photos/seed/qa-cat-${RUN_ID}-home/800/500`,
    },
  });
  const special = await db.category.create({
    data: {
      name: `QA_CAT_${RUN_ID}_<script>Safety</script> Long Category Name For Layout Testing`,
      slug: `qa-cat-${RUN_ID}-script-safety-layout`,
      image: `https://picsum.photos/seed/qa-cat-${RUN_ID}-safe/800/500`,
    },
  });

  const phones = await db.category.create({
    data: {
      name: `QA_CAT_${RUN_ID}_Phones`,
      slug: `qa-cat-${RUN_ID}-phones`,
      image: `https://picsum.photos/seed/qa-cat-${RUN_ID}-phones/800/500`,
      parentId: electronics.id,
    },
  });
  const laptops = await db.category.create({
    data: {
      name: `QA_CAT_${RUN_ID}_Laptops`,
      slug: `qa-cat-${RUN_ID}-laptops`,
      image: `https://picsum.photos/seed/qa-cat-${RUN_ID}-laptops/800/500`,
      parentId: electronics.id,
    },
  });
  const mens = await db.category.create({
    data: {
      name: `QA_CAT_${RUN_ID}_Menswear`,
      slug: `qa-cat-${RUN_ID}-menswear`,
      image: `https://picsum.photos/seed/qa-cat-${RUN_ID}-menswear/800/500`,
      parentId: fashion.id,
    },
  });
  const shoes = await db.category.create({
    data: {
      name: `QA_CAT_${RUN_ID}_Shoes`,
      slug: `qa-cat-${RUN_ID}-shoes`,
      image: `https://picsum.photos/seed/qa-cat-${RUN_ID}-shoes/800/500`,
      parentId: mens.id,
    },
  });

  console.log(
    '  ✅ Categories seeded: roots, children, and nested grandchildren'
  );
  return { electronics, fashion, home, special, phones, laptops, mens, shoes };
}

async function seedProducts(
  vendors: SeedVendor[],
  categories: Awaited<ReturnType<typeof seedCategories>>
) {
  const approvedVendors = vendors.slice(0, 14);
  const categoryIds = [
    categories.phones.id,
    categories.laptops.id,
    categories.shoes.id,
    categories.home.id,
    categories.special.id,
  ];
  const products: SeedProduct[] = [];

  for (let index = 0; index < 24; index += 1) {
    const number = index + 1;
    const vendor = approvedVendors[index % approvedVendors.length];
    const price = 19.99 + number * 7.35;
    const product = await db.product.create({
      data: {
        vendorId: vendor.id,
        categoryId: categoryIds[index % categoryIds.length],
        name:
          number === 4
            ? `QA Product <script>alert("xss")</script> ${RUN_ID}`
            : number === 5
              ? `QA Product With An Extremely Long Name For Product Table Layout Verification ${RUN_ID}`
              : `QA Product ${RUN_ID} ${number.toString().padStart(2, '0')}`,
        description: `QA seeded product ${number} for active/inactive, detail, search, and delete behavior.`,
        basePrice: money(price),
        images: [
          `https://picsum.photos/seed/qa-product-${RUN_ID}-${number}/900/700`,
          `https://picsum.photos/seed/qa-product-alt-${RUN_ID}-${number}/900/700`,
        ],
        isActive: number % 4 !== 0,
        avgRating: money(number % 6 === 0 ? 0 : 2.5 + (number % 5) * 0.45),
        reviewCount: number % 6 === 0 ? 0 : number * 3,
        tags: [
          'qa',
          number % 2 === 0 ? 'layout' : 'filter',
          number % 3 === 0 ? 'sale' : 'standard',
        ],
        createdAt: daysAgo(40 - index),
        variants: {
          create: [
            {
              size: number % 2 === 0 ? 'M' : null,
              color: number % 3 === 0 ? 'Black' : 'Blue',
              price: money(price),
              stock: number % 5 === 0 ? 0 : 25 + number,
              sku: `QA-${RUN_ID}-${randomUUID().slice(0, 8)}`,
            },
          ],
        },
      },
      include: { variants: true },
    });

    products.push({
      id: product.id,
      variantId: product.variants[0]!.id,
      vendorId: vendor.id,
      vendorProfileId: vendor.profileId,
      name: product.name,
      price,
    });
  }

  console.log(
    `  ✅ Products seeded: ${products.length} active/inactive records`
  );
  return products;
}

async function seedPromos() {
  const promos = [];
  for (let index = 0; index < 24; index += 1) {
    const number = index + 1;
    const isPercentage = number % 2 === 1;
    const promo = await db.promoCode.create({
      data: {
        code:
          number === 4
            ? `QA_LONG_PROMO_CODE_${RUN_ID}_LAYOUT_04`
            : `QA_PROMO_${RUN_ID}_${number.toString().padStart(2, '0')}`,
        discountType: isPercentage
          ? DiscountType.PERCENTAGE
          : DiscountType.FIXED,
        discountValue: isPercentage
          ? money(Math.min(95, 5 + number))
          : money(3 + number * 1.5),
        minOrderValue: number % 3 === 0 ? null : money(25 + number),
        maxDiscount:
          isPercentage && number % 4 !== 0 ? money(15 + number) : null,
        usageLimit: number % 5 === 0 ? null : 50 + number,
        usageCount: number % 6 === 0 ? 5 : 0,
        perUserLimit: number % 4 === 0 ? null : 1 + (number % 3),
        isActive: number % 4 !== 0,
        expiresAt:
          number % 6 === 0
            ? daysAgo(5)
            : number % 5 === 0
              ? null
              : daysFromNow(10 + number),
        createdAt: daysAgo(30 - index),
      },
    });
    promos.push(promo);
  }
  console.log(
    `  ✅ Promo codes seeded: ${promos.length} active/inactive, fixed/percentage`
  );
  return promos;
}

async function seedOrders(
  customers: SeedCustomer[],
  products: SeedProduct[],
  promos: Awaited<ReturnType<typeof seedPromos>>
) {
  const statuses = [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.PROCESSING,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
  ];

  for (let index = 0; index < 28; index += 1) {
    const number = index + 1;
    const customer = customers[index % customers.length];
    const product = products[index % 18];
    const status = statuses[index % statuses.length];
    const quantity = (index % 3) + 1;
    const subtotal = product.price * quantity;
    const tax = subtotal * 0.0825;
    const promo = index % 4 === 0 ? promos[index % promos.length] : null;
    const discount = promo ? Math.min(12 + (index % 5), subtotal * 0.2) : 0;
    const total = subtotal + tax - discount;
    const commissionRate = 12.5;
    const commissionAmount = subtotal * (commissionRate / 100);
    const netAmount = subtotal - commissionAmount;

    const order = await db.order.create({
      data: {
        orderNumber: `QA-${RUN_ID}-${number.toString().padStart(5, '0')}`,
        userId: customer.id,
        addressId: customer.addressId,
        promoCodeId: promo?.id,
        shippingAddress: {
          fullName: `QA Recipient ${number}`,
          phone: '+15551234567',
          street: `${number} QA Seed Avenue`,
          city: number % 2 === 0 ? 'San Francisco' : 'Austin',
          state: number % 2 === 0 ? 'CA' : 'TX',
          country: 'USA',
          zipCode: number % 2 === 0 ? '94105' : '73301',
        },
        subtotal: money(subtotal),
        discount: money(discount),
        tax: money(tax),
        total: money(total),
        notes: number % 6 === 0 ? 'QA order with notes for detail view.' : null,
        cancellationReason:
          status === OrderStatus.CANCELLED
            ? 'QA seeded cancellation reason'
            : null,
        createdAt: daysAgo(27 - index),
        vendorOrders: {
          create: [
            {
              vendorId: product.vendorId,
              status,
              subtotal: money(subtotal),
              trackingNumber:
                status === OrderStatus.SHIPPED ||
                status === OrderStatus.DELIVERED
                  ? `QA-TRACK-${RUN_ID}-${number}`
                  : null,
              trackingCarrier:
                status === OrderStatus.SHIPPED ||
                status === OrderStatus.DELIVERED
                  ? 'QA Carrier'
                  : null,
              items: {
                create: [
                  {
                    variantId: product.variantId,
                    quantity,
                    unitPrice: money(product.price),
                    totalPrice: money(subtotal),
                  },
                ],
              },
            },
          ],
        },
        payment: {
          create: {
            amount: money(total),
            currency: Currency.USD,
            method:
              number % 5 === 0
                ? PaymentMethod.CASH_ON_DELIVERY
                : PaymentMethod.CARD,
            status:
              status === OrderStatus.CANCELLED
                ? PaymentStatus.CANCELLED
                : status === OrderStatus.REFUNDED
                  ? PaymentStatus.REFUNDED
                  : PaymentStatus.SUCCEEDED,
            stripePaymentIntentId:
              number % 5 === 0 ? null : `pi_qa_${RUN_ID}_${number}`,
            paidAt:
              status === OrderStatus.CANCELLED || status === OrderStatus.PENDING
                ? null
                : daysAgo(27 - index),
          },
        },
      },
      include: { vendorOrders: true },
    });

    if (promo) {
      await db.promoUsage.create({
        data: {
          userId: customer.id,
          promoCodeId: promo.id,
          orderId: order.id,
          usedAt: order.createdAt,
        },
      });
    }

    if (
      status !== OrderStatus.CANCELLED &&
      status !== OrderStatus.REFUNDED &&
      number % 2 === 0
    ) {
      await db.vendorEarning.create({
        data: {
          vendorProfileId: product.vendorProfileId,
          vendorOrderId: order.vendorOrders[0]!.id,
          orderId: order.id,
          grossAmount: money(subtotal),
          commissionRate: money(commissionRate),
          commissionAmount: money(commissionAmount),
          netAmount: money(netAmount),
          currency: Currency.USD,
          status:
            number % 4 === 0
              ? EarningStatus.TRANSFERRED
              : EarningStatus.PENDING,
          stripeTransferId:
            number % 4 === 0 ? `tr_qa_${RUN_ID}_${number}` : null,
          transferredAt: number % 4 === 0 ? daysAgo(20 - index) : null,
          createdAt: order.createdAt,
        },
      });
    }
  }

  console.log('  ✅ Orders seeded: 28 orders across every admin status');
}

async function seedReviewsWishlistsAndCarts(
  customers: SeedCustomer[],
  products: SeedProduct[]
) {
  for (let index = 0; index < 8; index += 1) {
    await db.review.create({
      data: {
        userId: customers[index]!.id,
        productId: products[index]!.id,
        rating: (index % 5) + 1,
        comment:
          index === 2
            ? 'QA review containing <script>safe text</script> for display checks.'
            : `QA review ${index + 1}`,
      },
    });
  }

  for (let index = 0; index < 6; index += 1) {
    await db.wishlistItem.create({
      data: {
        userId: customers[index]!.id,
        productId: products[index + 6]!.id,
      },
    });
  }

  const cart = await db.cart.create({
    data: {
      userId: customers[0]!.id,
      items: {
        create: [
          { variantId: products[19]!.variantId, quantity: 2 },
          { variantId: products[20]!.variantId, quantity: 1 },
        ],
      },
    },
  });

  console.log(`  ✅ Reviews, wishlists, and cart seeded: ${cart.id}`);
}

async function seedBanners() {
  for (let index = 0; index < 24; index += 1) {
    const number = index + 1;
    await db.banner.create({
      data: {
        title:
          number === 3
            ? `QA_BANNER_${RUN_ID}_<script>Layout</script>`
            : number === 4
              ? `QA_BANNER_${RUN_ID}_Extremely Long Banner Title For Admin Table Layout Validation 04`
              : `QA_BANNER_${RUN_ID}_${number.toString().padStart(2, '0')}`,
        imageUrl: `https://picsum.photos/seed/qa-banner-${RUN_ID}-${number}/1280/420`,
        imagePublicId: `qa/banner/${RUN_ID}/${number}`,
        linkUrl:
          number % 3 === 0
            ? null
            : `https://example.com/qa-banner-${RUN_ID}-${number}`,
        position: number % 7,
        isActive: number % 4 !== 0,
        createdAt: daysAgo(24 - index),
      },
    });
  }

  console.log(
    '  ✅ Banners seeded: 24 active/inactive, linked/unlinked records'
  );
}

async function seedVendorPayouts(vendors: SeedVendor[]) {
  for (let index = 0; index < 8; index += 1) {
    await db.vendorPayout.create({
      data: {
        vendorProfileId: vendors[index]!.profileId,
        stripePayoutId: `po_qa_${RUN_ID}_${index + 1}`,
        amount: money(75 + index * 25.5),
        currency: Currency.USD,
        status:
          index % 3 === 0
            ? PayoutStatus.PAID
            : index % 3 === 1
              ? PayoutStatus.PENDING
              : PayoutStatus.FAILED,
        arrivalDate: daysFromNow(index + 1),
        failureReason: index % 3 === 2 ? 'QA seeded payout failure' : null,
      },
    });
  }

  console.log('  ✅ Vendor payouts seeded');
}

async function main() {
  console.log('🌱 Seeding admin QA database...');

  await prisma.$transaction(
    async (tx) => {
      db = tx;

      await clearExistingData();
      await ensureAdmin();
      await seedPlatformSettings();

      const passwordHash = await hashPassword(PASSWORD);
      const { customers, vendors } = await seedUsersAndVendors(passwordHash);
      const categories = await seedCategories();
      const products = await seedProducts(vendors, categories);
      const promos = await seedPromos();
      await seedOrders(customers, products, promos);
      await seedReviewsWishlistsAndCarts(customers, products);
      await seedBanners();
      await seedVendorPayouts(vendors);
    },
    { maxWait: 10000, timeout: 120000 }
  );

  db = prisma;

  console.log('');
  console.log('✅ Admin QA seed complete.');
  console.log(
    `   Test account password for QA customer/vendor users: ${PASSWORD}`
  );
  console.log('   Existing ADMIN users were preserved.');
  console.log(
    '   Fallback admin is only created if no ADMIN existed: admin@ecommerce.com / admin123'
  );
}

main()
  .catch((error) => {
    console.error('❌ Admin QA seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
