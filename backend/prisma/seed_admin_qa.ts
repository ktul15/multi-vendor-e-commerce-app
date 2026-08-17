import 'dotenv/config';
import { createHash } from 'crypto';
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

// Stable identifiers make the documented QA accounts easy to find and reuse.
const RUN_ID = 'REALWORLD';
const EMAIL_RUN_ID = RUN_ID.toLowerCase();
const PASSWORD = 'password123';
const ADMIN_PASSWORD = 'admin123';
const PLATFORM_COMMISSION_RATE = '12.50';
const RESET_CONFIRMATION = 'DELETE_E2E_DATA';

type WorkflowCommand = 'cleanup' | 'seed';

function stableId(label: string): string {
  const hex = createHash('sha256')
    .update(`web-e2e:${RUN_ID}:${label}`)
    .digest('hex')
    .slice(0, 32)
    .split('');
  hex[12] = '5';
  hex[16] = ((Number.parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16);
  const value = hex.join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function parseCommand(value: string | undefined): WorkflowCommand {
  const command = value ?? 'seed';
  if (command !== 'seed' && command !== 'cleanup') {
    throw new Error(`Unknown web E2E data command: ${command}`);
  }
  return command;
}

function assertSafeDatabaseReset(): string {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error('Web E2E data commands are disabled in production.');
  }
  if (process.env['WEB_E2E_RESET_CONFIRMATION'] !== RESET_CONFIRMATION) {
    throw new Error(
      `Set WEB_E2E_RESET_CONFIRMATION=${RESET_CONFIRMATION} to confirm the dedicated test database reset.`
    );
  }

  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for web E2E data commands.');
  }

  const databaseUrl = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
    throw new Error('Web E2E data commands require a PostgreSQL DATABASE_URL.');
  }
  const databaseName = decodeURIComponent(databaseUrl.pathname.slice(1));
  const isDedicatedTestDatabase =
    databaseName === 'testdb' ||
    /(?:^|[_-])(?:e2e|test)(?:$|[_-])/i.test(databaseName);
  if (!isDedicatedTestDatabase) {
    throw new Error(
      `Refusing to reset database "${databaseName}"; use a dedicated database whose name contains "test" or "e2e".`
    );
  }
  return databaseName;
}

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
  console.log(
    '🧹 Clearing all application data from the dedicated E2E database...'
  );

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
  await db.user.deleteMany();
}

async function ensureAdmin() {
  const password = await hashPassword(ADMIN_PASSWORD);
  await db.user.upsert({
    where: { email: 'alice.admin@example.com' },
    update: {
      name: 'Alice Admin',
      password,
      role: Role.ADMIN,
      isVerified: true,
      isBanned: false,
    },
    create: {
      id: stableId('user:alice.admin@example.com'),
      name: 'Alice Admin',
      email: 'alice.admin@example.com',
      password,
      role: Role.ADMIN,
      isVerified: true,
    },
  });
  console.log('  ✅ Admin persona ready: alice.admin@example.com / admin123');
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
    const personas = [
      { name: 'Ava New Shopper', email: 'ava.customer@example.com' },
      { name: 'Ben Returning Shopper', email: 'ben.customer@example.com' },
      { name: 'Mallory Unauthorized User', email: 'mallory.user@example.com' },
    ];
    return {
      name:
        personas[index]?.name ??
        (number === 4
          ? `QA Customer With A Very Long Name For Layout Regression ${RUN_ID} ${number}`
          : number === 7
            ? `QA Customer <script>alert("xss")</script> ${RUN_ID}`
            : `QA Customer ${RUN_ID} ${number.toString().padStart(2, '0')}`),
      email:
        personas[index]?.email ??
        `qa.customer.${EMAIL_RUN_ID}.${number}@example.com`,
      isBanned: number === 5 || number === 12,
      isVerified: number !== 6,
    };
  });

  for (const spec of customerSpecs) {
    const user = await db.user.create({
      data: {
        id: stableId(`user:${spec.email}`),
        ...spec,
        password: passwordHash,
        role: Role.CUSTOMER,
      },
    });
    const address = await db.address.create({
      data: {
        id: stableId(`address:${spec.email}:primary`),
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

    if (spec.email === 'ben.customer@example.com') {
      await db.address.create({
        data: {
          id: stableId(`address:${spec.email}:secondary`),
          userId: user.id,
          fullName: 'Ben Returning Shopper',
          phone: '+15550009999',
          street: '42 Secondary Address Lane, Apt #5B',
          city: 'Austin',
          state: 'TX',
          country: 'USA',
          zipCode: '73301',
          isDefault: false,
        },
      });
    }
  }

  const vendorPersonas = [
    {
      name: 'Vera Pending Vendor',
      email: 'vera.vendor@example.com',
      store: 'Vera New Goods',
      status: VendorProfileStatus.PENDING,
    },
    {
      name: 'Victor Approved Vendor',
      email: 'victor.vendor@example.com',
      store: 'Victor Marketplace',
      status: VendorProfileStatus.APPROVED,
      stripeStarted: false,
    },
    {
      name: 'Nina Suspended Vendor',
      email: 'nina.vendor@example.com',
      store: 'Nina Restricted Store',
      status: VendorProfileStatus.SUSPENDED,
    },
    {
      name: 'Riley Rejected Vendor',
      email: 'riley.vendor@example.com',
      store: 'Riley Rejected Goods',
      status: VendorProfileStatus.REJECTED,
    },
    {
      name: 'Olivia Approved Vendor',
      email: 'olivia.vendor@example.com',
      store: 'Olivia Home & Style',
      status: VendorProfileStatus.APPROVED,
    },
  ];

  for (let index = 0; index < 18; index += 1) {
    const number = index + 1;
    const persona = vendorPersonas[index];
    const fallbackStatuses = [
      VendorProfileStatus.PENDING,
      VendorProfileStatus.APPROVED,
      VendorProfileStatus.REJECTED,
      VendorProfileStatus.SUSPENDED,
    ];
    const status =
      persona?.status ?? fallbackStatuses[index % fallbackStatuses.length]!;
    const storeName =
      persona?.store ??
      (number === 7
        ? `QA Vendor <script>store</script> ${RUN_ID}`
        : number === 8
          ? `QA Vendor Store With An Intentionally Long Name For Table Layout ${RUN_ID}`
          : `QA Vendor Store ${RUN_ID} ${number.toString().padStart(2, '0')}`);
    const user = await db.user.create({
      data: {
        id: stableId(
          `user:${persona?.email ?? `qa.vendor.${EMAIL_RUN_ID}.${number}@example.com`}`
        ),
        name:
          persona?.name ??
          `QA Vendor Owner ${RUN_ID} ${number.toString().padStart(2, '0')}`,
        email:
          persona?.email ?? `qa.vendor.${EMAIL_RUN_ID}.${number}@example.com`,
        password: passwordHash,
        role: Role.VENDOR,
        isVerified: true,
        isBanned: number === 7,
        vendorProfile: {
          create: {
            id: stableId(`vendor-profile:${number}`),
            storeName,
            storeLogo: `https://picsum.photos/seed/qa-vendor-logo-${RUN_ID}-${number}/240/240`,
            storeBanner: `https://picsum.photos/seed/qa-vendor-banner-${RUN_ID}-${number}/960/320`,
            description: `QA vendor profile for admin status, pagination, and detail testing ${number}.`,
            status,
            stripeAccountId:
              persona?.stripeStarted === false
                ? null
                : `acct_qa_${RUN_ID}_${number}`,
            stripeOnboardingStatus:
              persona?.stripeStarted === false
                ? VendorOnboardingStatus.NOT_STARTED
                : status === VendorProfileStatus.APPROVED
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
      id: stableId('category:electronics'),
      name: `QA_CAT_${RUN_ID}_Electronics`,
      slug: `qa-cat-${RUN_ID}-electronics`,
      image: `https://picsum.photos/seed/qa-cat-${RUN_ID}-electronics/800/500`,
    },
  });
  const fashion = await db.category.create({
    data: {
      id: stableId('category:fashion'),
      name: `QA_CAT_${RUN_ID}_Fashion`,
      slug: `qa-cat-${RUN_ID}-fashion`,
      image: `https://picsum.photos/seed/qa-cat-${RUN_ID}-fashion/800/500`,
    },
  });
  const home = await db.category.create({
    data: {
      id: stableId('category:home'),
      name: `QA_CAT_${RUN_ID}_Home & Living`,
      slug: `qa-cat-${RUN_ID}-home-living`,
      image: `https://picsum.photos/seed/qa-cat-${RUN_ID}-home/800/500`,
    },
  });
  const special = await db.category.create({
    data: {
      id: stableId('category:special'),
      name: `QA_CAT_${RUN_ID}_<script>Safety</script> Long Category Name For Layout Testing`,
      slug: `qa-cat-${RUN_ID}-script-safety-layout`,
      image: `https://picsum.photos/seed/qa-cat-${RUN_ID}-safe/800/500`,
    },
  });

  const phones = await db.category.create({
    data: {
      id: stableId('category:phones'),
      name: `QA_CAT_${RUN_ID}_Phones`,
      slug: `qa-cat-${RUN_ID}-phones`,
      image: `https://picsum.photos/seed/qa-cat-${RUN_ID}-phones/800/500`,
      parentId: electronics.id,
    },
  });
  const laptops = await db.category.create({
    data: {
      id: stableId('category:laptops'),
      name: `QA_CAT_${RUN_ID}_Laptops`,
      slug: `qa-cat-${RUN_ID}-laptops`,
      image: `https://picsum.photos/seed/qa-cat-${RUN_ID}-laptops/800/500`,
      parentId: electronics.id,
    },
  });
  const mens = await db.category.create({
    data: {
      id: stableId('category:menswear'),
      name: `QA_CAT_${RUN_ID}_Menswear`,
      slug: `qa-cat-${RUN_ID}-menswear`,
      image: `https://picsum.photos/seed/qa-cat-${RUN_ID}-menswear/800/500`,
      parentId: fashion.id,
    },
  });
  const shoes = await db.category.create({
    data: {
      id: stableId('category:shoes'),
      name: `QA_CAT_${RUN_ID}_Shoes`,
      slug: `qa-cat-${RUN_ID}-shoes`,
      image: `https://picsum.photos/seed/qa-cat-${RUN_ID}-shoes/800/500`,
      parentId: mens.id,
    },
  });
  const womens = await db.category.create({
    data: {
      id: stableId('category:womenswear'),
      name: `QA_CAT_${RUN_ID}_Womenswear`,
      slug: `qa-cat-${RUN_ID}-womenswear`,
      image: `https://picsum.photos/seed/qa-cat-${RUN_ID}-womenswear/800/500`,
      parentId: fashion.id,
    },
  });
  const kitchen = await db.category.create({
    data: {
      id: stableId('category:kitchen'),
      name: `QA_CAT_${RUN_ID}_Kitchen`,
      slug: `qa-cat-${RUN_ID}-kitchen`,
      image: `https://picsum.photos/seed/qa-cat-${RUN_ID}-kitchen/800/500`,
      parentId: home.id,
    },
  });
  const decor = await db.category.create({
    data: {
      id: stableId('category:decor'),
      name: `QA_CAT_${RUN_ID}_Home Decor`,
      slug: `qa-cat-${RUN_ID}-home-decor`,
      image: `https://picsum.photos/seed/qa-cat-${RUN_ID}-decor/800/500`,
      parentId: home.id,
    },
  });

  console.log(
    '  ✅ Categories seeded: roots, children, and nested grandchildren'
  );
  return {
    electronics,
    fashion,
    home,
    special,
    phones,
    laptops,
    mens,
    shoes,
    womens,
    kitchen,
    decor,
  };
}

async function seedProducts(
  vendors: SeedVendor[],
  categories: Awaited<ReturnType<typeof seedCategories>>
) {
  const approvedVendorUsers = await db.user.findMany({
    where: { vendorProfile: { status: VendorProfileStatus.APPROVED } },
    include: { vendorProfile: true },
    orderBy: { email: 'asc' },
  });
  const approvedVendors: SeedVendor[] = approvedVendorUsers.map(
    (vendor: any) => ({
      id: vendor.id,
      email: vendor.email,
      profileId: vendor.vendorProfile.id,
      storeName: vendor.vendorProfile.storeName,
    })
  );
  const categoryIds = [
    categories.phones.id,
    categories.laptops.id,
    categories.shoes.id,
    categories.home.id,
    categories.special.id,
  ];
  const products: SeedProduct[] = [];

  for (let index = 0; index < 25; index += 1) {
    const number = index + 1;
    const vendor = approvedVendors[index % approvedVendors.length];
    const price = 19.99 + number * 7.35;
    const product = await db.product.create({
      data: {
        id: stableId(`product:${number}`),
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
        images:
          number === 2
            ? []
            : [
                `https://picsum.photos/seed/qa-product-${RUN_ID}-${number}/900/700`,
                `https://picsum.photos/seed/qa-product-alt-${RUN_ID}-${number}/900/700`,
              ],
        isActive: number <= 20,
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
              id: stableId(`variant:${number}:primary`),
              size: number % 2 === 0 ? 'M' : null,
              color: number % 3 === 0 ? 'Black' : 'Blue',
              price: money(price),
              stock: number % 5 === 0 ? 0 : 25 + number,
              sku: `QA-${RUN_ID}-${number.toString().padStart(2, '0')}-A`,
            },
            ...(number === 1
              ? [
                  {
                    id: stableId(`variant:${number}:secondary`),
                    size: 'L',
                    color: 'Red',
                    price: money(price + 5),
                    stock: 0,
                    sku: `QA-${RUN_ID}-${number.toString().padStart(2, '0')}-B`,
                  },
                ]
              : []),
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
        id: stableId(`promo:${number}`),
        code:
          number === 1
            ? 'SAVE10'
            : number === 2
              ? 'FIXED15'
              : number === 3
                ? 'EXPIRED20'
                : number === 4
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
        isActive: number === 3 ? false : number % 4 !== 0,
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
    // Keep Ava pristine for the first-visit journey; seed history on returning users.
    const customer = customers[(index % (customers.length - 1)) + 1];
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
        id: stableId(`order:${number}`),
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
              id: stableId(`vendor-order:${number}`),
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
                    id: stableId(`order-item:${number}`),
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
            id: stableId(`payment:${number}`),
            amount: money(total),
            currency: Currency.INR,
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
          id: stableId(`promo-usage:${number}`),
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
          id: stableId(`vendor-earning:${number}`),
          vendorProfileId: product.vendorProfileId,
          vendorOrderId: order.vendorOrders[0]!.id,
          orderId: order.id,
          grossAmount: money(subtotal),
          commissionRate: money(commissionRate),
          commissionAmount: money(commissionAmount),
          netAmount: money(netAmount),
          currency: Currency.INR,
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
        id: stableId(`review:${index + 1}`),
        userId: customers[index + 1]!.id,
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
        id: stableId(`wishlist-item:${index + 1}`),
        userId: customers[index + 1]!.id,
        productId: products[index + 6]!.id,
      },
    });
  }

  const cart = await db.cart.create({
    data: {
      id: stableId('cart:ben.customer@example.com'),
      userId: customers[1]!.id,
      items: {
        create: [
          {
            id: stableId('cart-item:ben:1'),
            variantId: products[19]!.variantId,
            quantity: 2,
          },
          {
            id: stableId('cart-item:ben:2'),
            variantId: products[20]!.variantId,
            quantity: 1,
          },
        ],
      },
    },
  });

  console.log(`  ✅ Reviews, wishlists, and cart seeded: ${cart.id}`);
}

async function seedNotifications(customers: SeedCustomer[]) {
  const ben = customers.find(
    (customer) => customer.email === 'ben.customer@example.com'
  )!;
  await db.notification.createMany({
    data: [
      {
        id: stableId('notification:ben:order-shipped'),
        userId: ben.id,
        type: 'ORDER_SHIPPED',
        title: 'Your order is on the way',
        body: 'Track your package with the seeded shipment details.',
        data: { scenario: 'REAL_WORLD_USER_TEST_SCENARIOS' },
        isRead: false,
      },
      {
        id: stableId('notification:ben:promo'),
        userId: ben.id,
        type: 'PROMO',
        title: 'Welcome-back discount',
        body: 'A seeded promotion is available for your next checkout.',
        data: { code: 'SAVE10' },
        isRead: true,
      },
    ],
  });
  console.log('  ✅ Read and unread notifications seeded for Ben');
}

async function seedBanners() {
  for (let index = 0; index < 24; index += 1) {
    const number = index + 1;
    await db.banner.create({
      data: {
        id: stableId(`banner:${number}`),
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
        id: stableId(`vendor-payout:${index + 1}`),
        vendorProfileId: vendors[index]!.profileId,
        stripePayoutId: `po_qa_${RUN_ID}_${index + 1}`,
        amount: money(75 + index * 25.5),
        currency: Currency.INR,
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
  const command = parseCommand(process.argv[2]);
  const databaseName = assertSafeDatabaseReset();
  console.log(
    command === 'seed'
      ? `🌱 Seeding dedicated web E2E database "${databaseName}"...`
      : `🧹 Cleaning dedicated web E2E database "${databaseName}"...`
  );

  await prisma.$transaction(
    async (tx) => {
      db = tx;

      await clearExistingData();
      if (command === 'cleanup') {
        return;
      }
      await ensureAdmin();
      await seedPlatformSettings();

      const passwordHash = await hashPassword(PASSWORD);
      const { customers, vendors } = await seedUsersAndVendors(passwordHash);
      const categories = await seedCategories();
      const products = await seedProducts(vendors, categories);
      const promos = await seedPromos();
      await seedOrders(customers, products, promos);
      await seedReviewsWishlistsAndCarts(customers, products);
      await seedNotifications(customers);
      await seedBanners();
      await seedVendorPayouts(vendors);
    },
    { maxWait: 10000, timeout: 120000 }
  );

  db = prisma;

  console.log('');
  if (command === 'cleanup') {
    console.log('✅ Web E2E database cleanup complete.');
    return;
  }

  console.log('✅ Web E2E seed complete.');
  console.log(
    `   Test account password for QA customer/vendor users: ${PASSWORD}`
  );
  console.log('   Admin: alice.admin@example.com / admin123');
  console.log('   Ava: ava.customer@example.com / password123');
  console.log('   Ben: ben.customer@example.com / password123');
  console.log('   Vera: vera.vendor@example.com / password123');
  console.log('   Victor: victor.vendor@example.com / password123');
  console.log('   Nina: nina.vendor@example.com / password123');
  console.log('   Mallory: mallory.user@example.com / password123');
  console.log('   Promos: SAVE10, FIXED15, EXPIRED20 (inactive)');
}

main()
  .catch((error) => {
    console.error('❌ Web E2E data workflow failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
