import swaggerJsdoc from 'swagger-jsdoc';

type OpenApiSchema = Record<string, unknown>;
const stringSchema = { type: 'string' };
const numberSchema = { type: 'number' };
const integerSchema = { type: 'integer' };
const booleanSchema = { type: 'boolean' };
const nullableString = { type: 'string', nullable: true };
const objectSchema = (
  properties: Record<string, OpenApiSchema>,
  required = Object.keys(properties)
): OpenApiSchema => ({ type: 'object', required, properties });
const arraySchema = (items: OpenApiSchema): OpenApiSchema => ({
  type: 'array',
  items,
});
const ref = (name: string): OpenApiSchema => ({
  $ref: `#/components/schemas/${name}`,
});
const successEnvelope = (data: OpenApiSchema): OpenApiSchema =>
  objectSchema({
    success: { type: 'boolean', enum: [true] },
    message: stringSchema,
    data,
  });

const dashboardSchemas: Record<string, OpenApiSchema> = {
  Pagination: objectSchema({
    total: integerSchema,
    page: integerSchema,
    limit: integerSchema,
    totalPages: integerSchema,
  }),
  UserProfile: objectSchema({
    id: stringSchema,
    name: stringSchema,
    email: stringSchema,
    role: { type: 'string', enum: ['CUSTOMER', 'VENDOR', 'ADMIN'] },
    avatar: nullableString,
    isVerified: booleanSchema,
    createdAt: { type: 'string', format: 'date-time' },
  }),
  AuthTokens: objectSchema({
    accessToken: stringSchema,
    refreshToken: stringSchema,
  }),
  LoginSuccess: {
    oneOf: [
      successEnvelope(
        objectSchema({
          user: ref('UserProfile'),
          tokens: ref('AuthTokens'),
        })
      ),
      successEnvelope(objectSchema({ user: ref('UserProfile') })),
    ],
  },
  RefreshSuccess: {
    oneOf: [
      successEnvelope(ref('AuthTokens')),
      successEnvelope({ nullable: true }),
    ],
  },
  LogoutSuccess: successEnvelope({ nullable: true }),
  ProfileSuccess: successEnvelope(ref('UserProfile')),
  AdminDashboardSuccess: successEnvelope(
    objectSchema({
      totalUsers: integerSchema,
      bannedUsers: integerSchema,
      totalVendors: integerSchema,
      pendingVendors: integerSchema,
      totalProducts: integerSchema,
      totalOrders: integerSchema,
      platformRevenue: stringSchema,
    })
  ),
  RevenueBucket: objectSchema({
    periodStart: stringSchema,
    orderCount: integerSchema,
    revenue: stringSchema,
  }),
  AdminRevenueSuccess: successEnvelope(
    objectSchema({
      period: { type: 'string', enum: ['day', 'week', 'month'] },
      series: arraySchema(ref('RevenueBucket')),
      dateRange: objectSchema({
        startDate: stringSchema,
        endDate: stringSchema,
      }),
    })
  ),
  AdminVendorProfileDetail: objectSchema(
    {
      id: stringSchema,
      userId: stringSchema,
      storeName: stringSchema,
      storeLogo: nullableString,
      storeBanner: nullableString,
      description: nullableString,
      status: {
        type: 'string',
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'],
      },
      stripeOnboardingStatus: {
        type: 'string',
        enum: ['NOT_STARTED', 'PENDING', 'COMPLETE', 'RESTRICTED'],
      },
      commissionRate: nullableString,
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    [
      'id',
      'userId',
      'storeName',
      'storeLogo',
      'storeBanner',
      'description',
      'status',
      'stripeOnboardingStatus',
      'commissionRate',
      'createdAt',
      'updatedAt',
    ]
  ),
  AdminUserDetail: objectSchema(
    {
      id: stringSchema,
      name: stringSchema,
      email: stringSchema,
      role: { type: 'string', enum: ['CUSTOMER', 'VENDOR', 'ADMIN'] },
      avatar: nullableString,
      isBanned: booleanSchema,
      isVerified: booleanSchema,
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
      vendorProfile: {
        allOf: [ref('AdminVendorProfileDetail')],
        nullable: true,
      },
    },
    [
      'id',
      'name',
      'email',
      'role',
      'avatar',
      'isBanned',
      'isVerified',
      'createdAt',
      'updatedAt',
      'vendorProfile',
    ]
  ),
  AdminUserDetailSuccess: successEnvelope(ref('AdminUserDetail')),
  AdminUserSummary: objectSchema(
    {
      id: stringSchema,
      name: stringSchema,
      email: stringSchema,
      role: { type: 'string', enum: ['CUSTOMER', 'VENDOR', 'ADMIN'] },
      isBanned: booleanSchema,
      isVerified: booleanSchema,
      createdAt: { type: 'string', format: 'date-time' },
      vendorProfile: {
        type: 'object',
        nullable: true,
        required: ['id', 'storeName', 'status'],
        properties: {
          id: stringSchema,
          storeName: stringSchema,
          status: {
            type: 'string',
            enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'],
          },
        },
      },
    },
    [
      'id',
      'name',
      'email',
      'role',
      'isBanned',
      'isVerified',
      'createdAt',
      'vendorProfile',
    ]
  ),
  AdminUsersSuccess: successEnvelope(
    objectSchema({
      items: arraySchema(ref('AdminUserSummary')),
      meta: ref('Pagination'),
    })
  ),
  AdminUserBanMutationSuccess: successEnvelope(
    objectSchema({
      id: stringSchema,
      name: stringSchema,
      email: stringSchema,
      isBanned: booleanSchema,
    })
  ),
  AdminVendorOwner: objectSchema({
    id: stringSchema,
    name: stringSchema,
    email: stringSchema,
    avatar: nullableString,
    isBanned: booleanSchema,
    isVerified: booleanSchema,
    createdAt: { type: 'string', format: 'date-time' },
  }),
  AdminVendorDetail: objectSchema({
    id: stringSchema,
    userId: stringSchema,
    storeName: stringSchema,
    storeLogo: nullableString,
    storeBanner: nullableString,
    description: nullableString,
    status: {
      type: 'string',
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'],
    },
    stripeOnboardingStatus: {
      type: 'string',
      enum: ['NOT_STARTED', 'PENDING', 'COMPLETE', 'RESTRICTED'],
    },
    commissionRate: nullableString,
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    user: ref('AdminVendorOwner'),
  }),
  AdminVendorDetailSuccess: successEnvelope(ref('AdminVendorDetail')),
  AdminVendorSummary: objectSchema({
    id: stringSchema,
    storeName: stringSchema,
    status: {
      type: 'string',
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'],
    },
    commissionRate: nullableString,
    stripeOnboardingStatus: {
      type: 'string',
      enum: ['NOT_STARTED', 'PENDING', 'COMPLETE', 'RESTRICTED'],
    },
    createdAt: { type: 'string', format: 'date-time' },
    user: objectSchema({
      id: stringSchema,
      name: stringSchema,
      email: stringSchema,
      isBanned: booleanSchema,
    }),
  }),
  AdminVendorsSuccess: successEnvelope(
    objectSchema({
      items: arraySchema(ref('AdminVendorSummary')),
      meta: ref('Pagination'),
    })
  ),
  AdminVendorLifecycle: objectSchema({
    id: stringSchema,
    userId: stringSchema,
    storeName: stringSchema,
    status: {
      type: 'string',
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'],
    },
  }),
  AdminVendorLifecycleSuccess: successEnvelope(ref('AdminVendorLifecycle')),
  VendorCommissionMutationSuccess: successEnvelope(
    objectSchema({
      id: stringSchema,
      storeName: stringSchema,
      commissionRate: nullableString,
    })
  ),
  AdminProductVendor: objectSchema(
    {
      id: stringSchema,
      name: stringSchema,
      email: stringSchema,
      vendorProfile: {
        type: 'object',
        nullable: true,
        required: ['id', 'storeName', 'status'],
        properties: {
          id: stringSchema,
          storeName: stringSchema,
          status: {
            type: 'string',
            enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'],
          },
        },
      },
    },
    ['id', 'name', 'email', 'vendorProfile']
  ),
  AdminProductDetail: objectSchema({
    id: stringSchema,
    vendorId: stringSchema,
    categoryId: stringSchema,
    name: stringSchema,
    description: stringSchema,
    basePrice: stringSchema,
    images: arraySchema(stringSchema),
    media: arraySchema(ref('ProductMedia')),
    isActive: booleanSchema,
    avgRating: stringSchema,
    reviewCount: integerSchema,
    tags: arraySchema(stringSchema),
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    vendor: ref('AdminProductVendor'),
    category: objectSchema(
      {
        id: stringSchema,
        name: stringSchema,
        slug: stringSchema,
        parentId: nullableString,
      },
      ['id', 'name', 'slug', 'parentId']
    ),
    variants: arraySchema(ref('ProductVariant')),
  }),
  AdminProductDetailSuccess: successEnvelope(ref('AdminProductDetail')),
  AdminProductListItem: objectSchema({
    id: stringSchema,
    name: stringSchema,
    basePrice: stringSchema,
    isActive: booleanSchema,
    avgRating: stringSchema,
    reviewCount: integerSchema,
    createdAt: { type: 'string', format: 'date-time' },
    vendor: objectSchema({
      id: stringSchema,
      name: stringSchema,
      email: stringSchema,
    }),
    category: objectSchema({ id: stringSchema, name: stringSchema }),
    _count: objectSchema({ variants: integerSchema }),
  }),
  AdminProductsSuccess: successEnvelope(
    objectSchema({
      items: arraySchema(ref('AdminProductListItem')),
      meta: ref('Pagination'),
    })
  ),
  AdminProductStatusMutationSuccess: successEnvelope(
    objectSchema({
      id: stringSchema,
      name: stringSchema,
      isActive: booleanSchema,
    })
  ),
  AdminFulfillmentStatus: objectSchema(
    {
      kind: { type: 'string', enum: ['NONE', 'SINGLE', 'MIXED'] },
      status: {
        type: 'string',
        enum: [
          'PENDING',
          'CONFIRMED',
          'PROCESSING',
          'SHIPPED',
          'DELIVERED',
          'CANCELLED',
          'REFUNDED',
        ],
        nullable: true,
      },
      statuses: arraySchema({
        type: 'string',
        enum: [
          'PENDING',
          'CONFIRMED',
          'PROCESSING',
          'SHIPPED',
          'DELIVERED',
          'CANCELLED',
          'REFUNDED',
        ],
      }),
    },
    ['kind', 'status', 'statuses']
  ),
  AdminOrderVendorSummary: objectSchema({
    id: stringSchema,
    status: {
      type: 'string',
      enum: [
        'PENDING',
        'CONFIRMED',
        'PROCESSING',
        'SHIPPED',
        'DELIVERED',
        'CANCELLED',
        'REFUNDED',
      ],
    },
    vendorId: stringSchema,
    subtotal: stringSchema,
    vendor: objectSchema({
      vendorProfile: {
        type: 'object',
        nullable: true,
        required: ['storeName'],
        properties: { storeName: stringSchema },
      },
    }),
  }),
  AdminOrderPaymentSummary: objectSchema({
    status: {
      type: 'string',
      enum: [
        'PENDING',
        'PROCESSING',
        'SUCCEEDED',
        'FAILED',
        'REFUNDED',
        'CANCELLED',
      ],
    },
    method: {
      type: 'string',
      enum: ['CARD', 'CASH_ON_DELIVERY', 'WALLET'],
    },
  }),
  AdminOrderSummary: objectSchema({
    id: stringSchema,
    orderNumber: stringSchema,
    subtotal: stringSchema,
    discount: stringSchema,
    tax: stringSchema,
    total: stringSchema,
    createdAt: { type: 'string', format: 'date-time' },
    user: objectSchema({
      id: stringSchema,
      name: stringSchema,
      email: stringSchema,
    }),
    vendorOrders: arraySchema(ref('AdminOrderVendorSummary')),
    payment: {
      allOf: [ref('AdminOrderPaymentSummary')],
      nullable: true,
    },
    fulfillmentStatus: ref('AdminFulfillmentStatus'),
  }),
  AdminOrdersSuccess: successEnvelope(
    objectSchema({
      items: arraySchema(ref('AdminOrderSummary')),
      meta: ref('Pagination'),
    })
  ),
  AdminOrderItem: objectSchema({
    id: stringSchema,
    quantity: integerSchema,
    unitPrice: stringSchema,
    totalPrice: stringSchema,
    variant: objectSchema({
      sku: stringSchema,
      size: nullableString,
      color: nullableString,
      price: stringSchema,
      product: objectSchema({
        name: stringSchema,
        images: arraySchema(stringSchema),
      }),
    }),
  }),
  AdminOrderVendorDetail: objectSchema({
    id: stringSchema,
    status: {
      type: 'string',
      enum: [
        'PENDING',
        'CONFIRMED',
        'PROCESSING',
        'SHIPPED',
        'DELIVERED',
        'CANCELLED',
        'REFUNDED',
      ],
    },
    subtotal: stringSchema,
    trackingNumber: nullableString,
    trackingCarrier: nullableString,
    vendorId: stringSchema,
    vendor: objectSchema({
      vendorProfile: {
        type: 'object',
        nullable: true,
        required: ['id', 'storeName'],
        properties: { id: stringSchema, storeName: stringSchema },
      },
    }),
    items: arraySchema(ref('AdminOrderItem')),
  }),
  AdminOrderDetail: objectSchema({
    id: stringSchema,
    orderNumber: stringSchema,
    subtotal: stringSchema,
    discount: stringSchema,
    tax: stringSchema,
    total: stringSchema,
    notes: nullableString,
    cancellationReason: nullableString,
    shippingAddress: { type: 'object', additionalProperties: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    user: objectSchema({
      id: stringSchema,
      name: stringSchema,
      email: stringSchema,
    }),
    vendorOrders: arraySchema(ref('AdminOrderVendorDetail')),
    address: { type: 'object', additionalProperties: stringSchema },
    payment: {
      allOf: [ref('VendorOrderPayment')],
      nullable: true,
    },
    promoCode: {
      type: 'object',
      nullable: true,
      required: ['code', 'discountType', 'discountValue'],
      properties: {
        code: stringSchema,
        discountType: { type: 'string', enum: ['PERCENTAGE', 'FIXED'] },
        discountValue: stringSchema,
      },
    },
    fulfillmentStatus: ref('AdminFulfillmentStatus'),
  }),
  AdminOrderDetailSuccess: successEnvelope(ref('AdminOrderDetail')),
  CommissionSuccess: successEnvelope(
    objectSchema(
      {
        rate: numberSchema,
        source: { type: 'string', enum: ['database', 'env_fallback'] },
      },
      ['rate']
    )
  ),
  CommissionMutationSuccess: successEnvelope(
    objectSchema({ rate: numberSchema })
  ),
  VendorAnalyticsSummarySuccess: successEnvelope(
    objectSchema({
      orders: objectSchema({
        totalOrders: integerSchema,
        billableOrders: integerSchema,
        byStatus: { type: 'object', additionalProperties: integerSchema },
      }),
      revenue: objectSchema({
        gross: stringSchema,
        net: stringSchema,
        commission: stringSchema,
      }),
      dateRange: objectSchema({
        startDate: nullableString,
        endDate: nullableString,
      }),
    })
  ),
  VendorSalesSuccess: successEnvelope(
    objectSchema({
      period: { type: 'string', enum: ['day', 'week', 'month'] },
      series: arraySchema(ref('RevenueBucket')),
      dateRange: objectSchema({
        startDate: stringSchema,
        endDate: stringSchema,
      }),
    })
  ),
  VendorTopProductsSuccess: successEnvelope(
    objectSchema({
      products: arraySchema(
        objectSchema({
          rank: integerSchema,
          productId: stringSchema,
          productName: stringSchema,
          orderCount: integerSchema,
          totalRevenue: stringSchema,
        })
      ),
      dateRange: objectSchema({
        startDate: nullableString,
        endDate: nullableString,
      }),
    })
  ),
  Banner: objectSchema(
    {
      id: stringSchema,
      title: stringSchema,
      imageUrl: stringSchema,
      linkUrl: nullableString,
      position: integerSchema,
      isActive: booleanSchema,
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    [
      'id',
      'title',
      'imageUrl',
      'linkUrl',
      'position',
      'isActive',
      'createdAt',
      'updatedAt',
    ]
  ),
  PublicBanner: objectSchema(
    {
      id: stringSchema,
      title: stringSchema,
      imageUrl: stringSchema,
      linkUrl: nullableString,
      position: integerSchema,
    },
    ['id', 'title', 'imageUrl', 'linkUrl', 'position']
  ),
  PublicBannersSuccess: successEnvelope(arraySchema(ref('PublicBanner'))),
  BannerSuccess: successEnvelope(ref('Banner')),
  BannerListSuccess: successEnvelope(
    objectSchema({ items: arraySchema(ref('Banner')), meta: ref('Pagination') })
  ),
  Category: objectSchema(
    {
      id: stringSchema,
      name: stringSchema,
      slug: stringSchema,
      image: nullableString,
      parentId: nullableString,
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    ['id', 'name', 'slug', 'image', 'parentId', 'createdAt', 'updatedAt']
  ),
  CategoryTreeNode: objectSchema(
    {
      id: stringSchema,
      name: stringSchema,
      slug: stringSchema,
      image: nullableString,
      parentId: nullableString,
      children: arraySchema(ref('CategoryTreeNode')),
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    [
      'id',
      'name',
      'slug',
      'image',
      'parentId',
      'children',
      'createdAt',
      'updatedAt',
    ]
  ),
  CategoriesSuccess: successEnvelope(arraySchema(ref('CategoryTreeNode'))),
  CategorySuccess: successEnvelope(ref('Category')),
  ProductVariant: objectSchema(
    {
      id: stringSchema,
      productId: stringSchema,
      size: nullableString,
      color: nullableString,
      price: stringSchema,
      stock: integerSchema,
      sku: stringSchema,
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    ['id', 'productId', 'price', 'stock', 'sku', 'createdAt', 'updatedAt']
  ),
  ProductMedia: objectSchema({
    id: { type: 'string', format: 'uuid' },
    url: { type: 'string', format: 'uri' },
    position: { type: 'integer', minimum: 0 },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  }),
  ProductMediaSuccess: successEnvelope(arraySchema(ref('ProductMedia'))),
  ProductSummary: objectSchema({
    id: stringSchema,
    vendorId: stringSchema,
    categoryId: stringSchema,
    name: stringSchema,
    description: stringSchema,
    basePrice: stringSchema,
    images: arraySchema(stringSchema),
    media: arraySchema(ref('ProductMedia')),
    isActive: booleanSchema,
    tags: arraySchema(stringSchema),
    avgRating: stringSchema,
    reviewCount: integerSchema,
    variants: arraySchema(ref('ProductVariant')),
    vendor: objectSchema({ id: stringSchema, name: stringSchema }),
    category: objectSchema({ id: stringSchema, name: stringSchema }),
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  }),
  ProductsSuccess: successEnvelope(
    objectSchema({
      items: arraySchema(ref('ProductSummary')),
      meta: ref('Pagination'),
    })
  ),
  ProductMutation: objectSchema(
    {
      id: stringSchema,
      vendorId: stringSchema,
      categoryId: stringSchema,
      name: stringSchema,
      description: stringSchema,
      basePrice: stringSchema,
      images: arraySchema(stringSchema),
      media: arraySchema(ref('ProductMedia')),
      isActive: booleanSchema,
      tags: arraySchema(stringSchema),
      avgRating: stringSchema,
      reviewCount: integerSchema,
      variants: arraySchema(ref('ProductVariant')),
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    [
      'id',
      'vendorId',
      'categoryId',
      'name',
      'description',
      'basePrice',
      'images',
      'media',
      'isActive',
      'tags',
      'avgRating',
      'reviewCount',
      'createdAt',
      'updatedAt',
    ]
  ),
  ProductMutationSuccess: successEnvelope(ref('ProductMutation')),
  ProductVariantSuccess: successEnvelope(ref('ProductVariant')),
  NullSuccess: successEnvelope({ nullable: true, enum: [null] }),
  VendorOrderItem: objectSchema({
    id: stringSchema,
    vendorOrderId: stringSchema,
    variantId: stringSchema,
    quantity: integerSchema,
    unitPrice: stringSchema,
    totalPrice: stringSchema,
    variant: objectSchema({
      id: stringSchema,
      sku: stringSchema,
      size: nullableString,
      color: nullableString,
      price: stringSchema,
      product: objectSchema({
        id: stringSchema,
        name: stringSchema,
        images: arraySchema(stringSchema),
      }),
    }),
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  }),
  VendorOrderPayment: objectSchema({
    status: {
      type: 'string',
      enum: [
        'PENDING',
        'PROCESSING',
        'SUCCEEDED',
        'FAILED',
        'REFUNDED',
        'CANCELLED',
      ],
    },
    method: {
      type: 'string',
      enum: ['CARD', 'CASH_ON_DELIVERY', 'WALLET'],
    },
    paidAt: { type: 'string', format: 'date-time', nullable: true },
  }),
  VendorOrderDetail: objectSchema(
    {
      id: stringSchema,
      orderId: stringSchema,
      vendorId: stringSchema,
      status: {
        type: 'string',
        enum: [
          'PENDING',
          'CONFIRMED',
          'PROCESSING',
          'SHIPPED',
          'DELIVERED',
          'CANCELLED',
          'REFUNDED',
        ],
      },
      subtotal: stringSchema,
      trackingNumber: nullableString,
      trackingCarrier: nullableString,
      items: arraySchema(ref('VendorOrderItem')),
      order: objectSchema(
        {
          id: stringSchema,
          orderNumber: stringSchema,
          shippingAddress: { type: 'object', additionalProperties: true },
          notes: nullableString,
          user: objectSchema({
            id: stringSchema,
            name: stringSchema,
            email: stringSchema,
          }),
          payment: { allOf: [ref('VendorOrderPayment')], nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        [
          'id',
          'orderNumber',
          'shippingAddress',
          'notes',
          'user',
          'payment',
          'createdAt',
          'updatedAt',
        ]
      ),
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    [
      'id',
      'orderId',
      'vendorId',
      'status',
      'subtotal',
      'trackingNumber',
      'trackingCarrier',
      'items',
      'order',
      'createdAt',
      'updatedAt',
    ]
  ),
  VendorOrderDetailSuccess: successEnvelope(ref('VendorOrderDetail')),
  VendorOrdersSuccess: successEnvelope(
    objectSchema({
      items: arraySchema(ref('VendorOrderDetail')),
      meta: ref('Pagination'),
    })
  ),
  PromoCode: objectSchema(
    {
      id: stringSchema,
      code: stringSchema,
      discountType: { type: 'string', enum: ['PERCENTAGE', 'FIXED'] },
      discountValue: stringSchema,
      minOrderValue: nullableString,
      maxDiscount: nullableString,
      usageLimit: { type: 'integer', nullable: true },
      usageCount: integerSchema,
      perUserLimit: { type: 'integer', nullable: true },
      isActive: booleanSchema,
      deletedAt: { type: 'string', format: 'date-time', nullable: true },
      expiresAt: { type: 'string', format: 'date-time', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    [
      'id',
      'code',
      'discountType',
      'discountValue',
      'minOrderValue',
      'maxDiscount',
      'usageLimit',
      'usageCount',
      'perUserLimit',
      'isActive',
      'deletedAt',
      'expiresAt',
      'createdAt',
      'updatedAt',
    ]
  ),
  PromoCodeWithCounts: {
    allOf: [
      ref('PromoCode'),
      objectSchema({
        _count: objectSchema({ orders: integerSchema, usages: integerSchema }),
      }),
    ],
  },
  PromoCodeDetail: {
    allOf: [
      ref('PromoCodeWithCounts'),
      objectSchema({
        usages: arraySchema(
          objectSchema({
            id: stringSchema,
            userId: stringSchema,
            promoCodeId: stringSchema,
            orderId: stringSchema,
            usedAt: { type: 'string', format: 'date-time' },
            user: objectSchema({
              id: stringSchema,
              name: stringSchema,
              email: stringSchema,
            }),
          })
        ),
      }),
    ],
  },
  PromoCodeSuccess: successEnvelope(ref('PromoCode')),
  PromoCodeDetailSuccess: successEnvelope(ref('PromoCodeDetail')),
  PromoCodesSuccess: successEnvelope(
    objectSchema({
      items: arraySchema(ref('PromoCodeWithCounts')),
      meta: ref('Pagination'),
    })
  ),
  ConnectOnboardingSuccess: successEnvelope(
    objectSchema({ url: { type: 'string', format: 'uri' } })
  ),
  ConnectStatusSuccess: successEnvelope(
    objectSchema({
      onboardingStatus: {
        type: 'string',
        enum: ['NOT_STARTED', 'PENDING', 'COMPLETE', 'RESTRICTED'],
      },
      chargesEnabled: booleanSchema,
      payoutsEnabled: booleanSchema,
      detailsSubmitted: booleanSchema,
    })
  ),
  EarningsAmounts: objectSchema({
    count: integerSchema,
    grossAmount: numberSchema,
    commissionAmount: numberSchema,
    netAmount: numberSchema,
  }),
  EarningsSummarySuccess: successEnvelope(
    objectSchema({
      pending: ref('EarningsAmounts'),
      transferred: ref('EarningsAmounts'),
      failed: ref('EarningsAmounts'),
      reversed: ref('EarningsAmounts'),
    })
  ),
  VendorEarning: objectSchema(
    {
      id: stringSchema,
      vendorProfileId: stringSchema,
      vendorOrderId: stringSchema,
      orderId: stringSchema,
      grossAmount: stringSchema,
      commissionRate: stringSchema,
      commissionAmount: stringSchema,
      netAmount: stringSchema,
      currency: {
        type: 'string',
        enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'],
      },
      status: {
        type: 'string',
        enum: ['PENDING', 'TRANSFERRED', 'FAILED', 'REVERSED'],
      },
      stripeTransferId: nullableString,
      transferredAt: { type: 'string', format: 'date-time', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
      order: objectSchema({ orderNumber: stringSchema }),
    },
    [
      'id',
      'vendorProfileId',
      'vendorOrderId',
      'orderId',
      'grossAmount',
      'commissionRate',
      'commissionAmount',
      'netAmount',
      'currency',
      'status',
      'stripeTransferId',
      'transferredAt',
      'createdAt',
      'updatedAt',
      'order',
    ]
  ),
  VendorEarningsSuccess: successEnvelope(
    objectSchema({
      earnings: arraySchema(ref('VendorEarning')),
      pagination: ref('Pagination'),
    })
  ),
  VendorPayout: objectSchema(
    {
      id: stringSchema,
      vendorProfileId: stringSchema,
      stripePayoutId: stringSchema,
      amount: stringSchema,
      currency: {
        type: 'string',
        enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'],
      },
      status: { type: 'string', enum: ['PENDING', 'PAID', 'FAILED'] },
      arrivalDate: { type: 'string', format: 'date-time', nullable: true },
      failureReason: nullableString,
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    [
      'id',
      'vendorProfileId',
      'stripePayoutId',
      'amount',
      'currency',
      'status',
      'arrivalDate',
      'failureReason',
      'createdAt',
      'updatedAt',
    ]
  ),
  VendorPayoutsSuccess: successEnvelope(
    objectSchema({
      payouts: arraySchema(ref('VendorPayout')),
      pagination: ref('Pagination'),
    })
  ),
  VendorPayoutCommissionSuccess: successEnvelope(
    objectSchema({ vendorId: stringSchema, commissionRate: numberSchema })
  ),
  VendorProfileSuccess: successEnvelope(
    objectSchema(
      {
        id: stringSchema,
        userId: stringSchema,
        storeName: stringSchema,
        description: nullableString,
        status: {
          type: 'string',
          enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'],
        },
        storeLogo: nullableString,
        storeBanner: nullableString,
        user: objectSchema({
          name: stringSchema,
          email: stringSchema,
          avatar: nullableString,
        }),
      },
      ['id', 'userId', 'storeName', 'status', 'user']
    )
  ),
  VendorProfileMutationSuccess: successEnvelope(
    objectSchema(
      {
        id: stringSchema,
        userId: stringSchema,
        storeName: stringSchema,
        description: nullableString,
        status: {
          type: 'string',
          enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'],
        },
        storeLogo: nullableString,
        storeBanner: nullableString,
      },
      [
        'id',
        'userId',
        'storeName',
        'description',
        'status',
        'storeLogo',
        'storeBanner',
      ]
    )
  ),
};

const dashboardResponseSchemas: Record<string, string> = {
  'get /admin/dashboard': 'AdminDashboardSuccess',
  'get /admin/users': 'AdminUsersSuccess',
  'get /admin/users/{userId}': 'AdminUserDetailSuccess',
  'patch /admin/users/{userId}/ban': 'AdminUserBanMutationSuccess',
  'patch /admin/users/{userId}/unban': 'AdminUserBanMutationSuccess',
  'get /admin/vendors': 'AdminVendorsSuccess',
  'get /admin/vendors/{vendorProfileId}': 'AdminVendorDetailSuccess',
  'patch /admin/vendors/{vendorProfileId}/approve':
    'AdminVendorLifecycleSuccess',
  'patch /admin/vendors/{vendorProfileId}/reject':
    'AdminVendorLifecycleSuccess',
  'patch /admin/vendors/{vendorProfileId}/suspend':
    'AdminVendorLifecycleSuccess',
  'patch /admin/vendors/{vendorProfileId}/commission':
    'VendorCommissionMutationSuccess',
  'get /admin/products': 'AdminProductsSuccess',
  'get /admin/products/{productId}': 'AdminProductDetailSuccess',
  'patch /admin/products/{productId}/activate':
    'AdminProductStatusMutationSuccess',
  'patch /admin/products/{productId}/deactivate':
    'AdminProductStatusMutationSuccess',
  'get /admin/orders': 'AdminOrdersSuccess',
  'get /admin/orders/{orderId}': 'AdminOrderDetailSuccess',
  'get /admin/revenue': 'AdminRevenueSuccess',
  'get /admin/commission': 'CommissionSuccess',
  'patch /admin/commission': 'CommissionMutationSuccess',
  'get /analytics/vendor/summary': 'VendorAnalyticsSummarySuccess',
  'get /analytics/vendor/sales': 'VendorSalesSuccess',
  'get /analytics/vendor/top-products': 'VendorTopProductsSuccess',
  'post /auth/login': 'LoginSuccess',
  'post /auth/refresh': 'RefreshSuccess',
  'post /auth/logout': 'LogoutSuccess',
  'get /auth/profile': 'ProfileSuccess',
  'get /banners': 'PublicBannersSuccess',
  'get /banners/all': 'BannerListSuccess',
  'get /banners/{id}': 'BannerSuccess',
  'post /banners': 'BannerSuccess',
  'put /banners/{id}': 'BannerSuccess',
  'get /categories': 'CategoriesSuccess',
  'post /categories': 'CategorySuccess',
  'put /categories/{id}': 'CategorySuccess',
  'delete /categories/{id}': 'NullSuccess',
  'get /products': 'ProductsSuccess',
  'get /products/vendor': 'ProductsSuccess',
  'post /products': 'ProductMutationSuccess',
  'put /products/{id}': 'ProductMutationSuccess',
  'post /products/{id}/media': 'ProductMediaSuccess',
  'put /products/{id}/media/{mediaId}': 'ProductMediaSuccess',
  'delete /products/{id}/media/{mediaId}': 'ProductMediaSuccess',
  'delete /products/{id}': 'NullSuccess',
  'post /products/{id}/variants': 'ProductVariantSuccess',
  'put /products/{id}/variants/{vid}': 'ProductVariantSuccess',
  'delete /products/{id}/variants/{vid}': 'NullSuccess',
  'get /promo-codes': 'PromoCodesSuccess',
  'post /promo-codes': 'PromoCodeSuccess',
  'get /promo-codes/{id}': 'PromoCodeDetailSuccess',
  'put /promo-codes/{id}': 'PromoCodeSuccess',
  'delete /promo-codes/{id}': 'PromoCodeSuccess',
  'get /orders/vendor': 'VendorOrdersSuccess',
  'get /orders/vendor/{id}': 'VendorOrderDetailSuccess',
  'post /vendor-payouts/connect/onboard': 'ConnectOnboardingSuccess',
  'get /vendor-payouts/connect/onboard/refresh': 'ConnectOnboardingSuccess',
  'get /vendor-payouts/connect/status': 'ConnectStatusSuccess',
  'get /vendor-payouts/earnings': 'VendorEarningsSuccess',
  'get /vendor-payouts/earnings/summary': 'EarningsSummarySuccess',
  'get /vendor-payouts/payouts': 'VendorPayoutsSuccess',
  'patch /vendor-payouts/admin/commission/{vendorId}':
    'VendorPayoutCommissionSuccess',
  'get /vendor-profile/me': 'VendorProfileSuccess',
  'put /vendor-profile/me': 'VendorProfileMutationSuccess',
};

const dashboardContractErrorOperations = [
  'get /admin/dashboard',
  'get /admin/users',
  'get /admin/users/{userId}',
  'patch /admin/users/{userId}/ban',
  'patch /admin/users/{userId}/unban',
  'get /admin/vendors/{vendorProfileId}',
  'patch /admin/vendors/{vendorProfileId}/approve',
  'patch /admin/vendors/{vendorProfileId}/reject',
  'patch /admin/vendors/{vendorProfileId}/suspend',
  'patch /admin/vendors/{vendorProfileId}/commission',
  'get /admin/vendors',
  'get /admin/products',
  'get /admin/products/{productId}',
  'patch /admin/products/{productId}/activate',
  'patch /admin/products/{productId}/deactivate',
  'delete /admin/products/{productId}',
  'get /admin/orders',
  'get /admin/orders/{orderId}',
  'get /admin/revenue',
  'get /admin/commission',
  'patch /admin/commission',
  'get /analytics/vendor/summary',
  'get /analytics/vendor/sales',
  'get /analytics/vendor/top-products',
  'get /products/vendor',
  'get /orders/vendor/{id}',
  'post /products',
  'put /products/{id}',
  'post /products/{id}/media',
  'put /products/{id}/media/{mediaId}',
  'delete /products/{id}/media/{mediaId}',
  'delete /products/{id}',
  'post /products/{id}/variants',
  'put /products/{id}/variants/{vid}',
  'delete /products/{id}/variants/{vid}',
  'post /categories',
  'put /categories/{id}',
  'delete /categories/{id}',
  'get /promo-codes',
  'post /promo-codes',
  'get /promo-codes/{id}',
  'put /promo-codes/{id}',
  'delete /promo-codes/{id}',
  'post /banners',
  'get /banners/all',
  'get /banners/{id}',
  'put /banners/{id}',
  'delete /banners/{id}',
  'get /vendor-profile/me',
  'put /vendor-profile/me',
  'post /vendor-payouts/connect/onboard',
  'get /vendor-payouts/connect/onboard/refresh',
  'get /vendor-payouts/connect/status',
  'get /vendor-payouts/earnings',
  'get /vendor-payouts/earnings/summary',
  'get /vendor-payouts/payouts',
  'patch /vendor-payouts/admin/commission/{vendorId}',
];

const dashboardContractAdditionalErrors: Record<
  string,
  Record<string, string>
> = {
  'get /admin/users': {
    '400': 'Invalid pagination or user filter query',
  },
  'get /admin/vendors': {
    '400': 'Invalid pagination or vendor filter query',
    '403': 'Forbidden — ADMIN role required',
  },
  'get /admin/products': {
    '400': 'Invalid pagination or product filter query',
    '403': 'Forbidden — ADMIN role required',
  },
  'get /admin/revenue': {
    '400': 'Invalid report period or date range',
    '403': 'Forbidden — ADMIN role required',
  },
  'get /admin/commission': {
    '403': 'Forbidden — ADMIN role required',
  },
  'patch /admin/commission': {
    '403': 'Forbidden — ADMIN role required',
  },
  'get /promo-codes': {
    '400': 'Invalid pagination or filter query',
  },
  'get /promo-codes/{id}': {
    '400': 'Invalid promo code ID',
    '403': 'Forbidden — ADMIN role required',
  },
  'put /promo-codes/{id}': {
    '403': 'Forbidden — ADMIN role required',
    '409': 'Promo code already exists',
  },
  'delete /promo-codes/{id}': {
    '400': 'Invalid promo code ID',
    '403': 'Forbidden — ADMIN role required',
  },
  'get /vendor-payouts/connect/onboard/refresh': {
    '400': 'Stripe onboarding has not been started',
  },
  'get /vendor-payouts/earnings': {
    '400': 'Invalid pagination, status, or date filter',
  },
  'get /vendor-payouts/payouts': {
    '400': 'Invalid pagination or status filter',
  },
};

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Multi-Vendor E-Commerce API',
      version: '1.0.0',
      description:
        'REST API for the multi-vendor e-commerce platform. ' +
        'Most endpoints require a Bearer JWT — click **Authorize** and enter `Bearer <access_token>`.',
    },
    servers: [
      {
        url: '/api/v1',
        description: 'Current API host',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'JWT access token obtained from POST /auth/login. ' +
            'Enter: `Bearer <access_token>`',
        },
        CookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: '__Secure-access_token',
          description:
            'HttpOnly web session cookie issued when X-Auth-Mode is cookie.',
        },
      },
      schemas: {
        ...dashboardSchemas,
        ApiSuccess: {
          type: 'object',
          required: ['success', 'message', 'data'],
          properties: {
            success: { type: 'boolean', enum: [true], example: true },
            message: { type: 'string', example: 'Operation successful' },
            // Deliberately unknown for endpoints awaiting a concrete schema. This is
            // truthful and still allows common envelope normalization without claiming
            // that arrays or primitives are empty objects.
            data: {},
          },
        },
        ApiError: {
          type: 'object',
          required: ['success', 'message'],
          properties: {
            success: { type: 'boolean', enum: [false], example: false },
            message: { type: 'string', example: 'Validation failed' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', example: 'email' },
                  message: { type: 'string', example: 'Invalid email address' },
                },
              },
            },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 100 },
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 10 },
            totalPages: { type: 'integer', example: 10 },
          },
        },
      },
    },
    // Global default: every endpoint requires BearerAuth unless overridden with security: []
    security: [{ BearerAuth: [] }, { CookieAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication & session management' },
      {
        name: 'Products',
        description:
          'Product catalogue (public) and vendor inventory management',
      },
      { name: 'Categories', description: 'Product category tree management' },
      { name: 'Cart', description: 'Shopping cart (authenticated customers)' },
      {
        name: 'Orders',
        description: 'Order placement, tracking, and management',
      },
      { name: 'Addresses', description: 'Customer shipping address book' },
      { name: 'Reviews', description: 'Product reviews and ratings' },
      { name: 'Wishlist', description: 'Customer product wishlist' },
      {
        name: 'Notifications',
        description: 'Push notification tokens and notification history',
      },
      {
        name: 'Payments',
        description: 'Stripe payment intents and webhook processing',
      },
      {
        name: 'Promo Codes',
        description: 'Promotional code management (Admin only)',
      },
      {
        name: 'Vendor Profile',
        description: 'Vendor store profile and onboarding status',
      },
      {
        name: 'Vendor Payouts',
        description: 'Stripe Connect earnings and payout history',
      },
      {
        name: 'Analytics',
        description: 'Vendor sales analytics and reporting',
      },
      {
        name: 'Banners',
        description: 'Homepage banner management (Admin only)',
      },
      { name: 'Admin', description: 'Platform administration (Admin only)' },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/modules/**/*.schema.ts'],
};

/**
 * Build the Swagger spec on demand. Called only inside the `if (env.isDev)` block
 * in app.ts so the spec (and swagger-jsdoc processing) never runs in production.
 * Note: *.validation.ts files are intentionally excluded from the `apis` glob —
 * no inline @openapi component schemas are defined there; all schemas are documented
 * inline within the route JSDoc blocks.
 */
export function buildSwaggerSpec(): object {
  const spec = swaggerJsdoc(options) as {
    paths?: Record<
      string,
      Record<
        string,
        {
          responses?: Record<
            string,
            { description?: string; content?: Record<string, OpenApiSchema> }
          >;
        }
      >
    >;
  };

  for (const [operation, schemaName] of Object.entries(
    dashboardResponseSchemas
  )) {
    const [method, route] = operation.split(' ');
    const responses =
      route && method ? spec.paths?.[route]?.[method]?.responses : undefined;
    if (!responses) continue;
    const success = Object.entries(responses).find(([status]) =>
      status.startsWith('2')
    )?.[1];
    if (success) {
      success.content ??= {};
      success.content['application/json'] ??= {};
      success.content['application/json'].schema = ref(schemaName);
    }
  }

  // Dashboard contract routes share one concrete error envelope. Applying it centrally
  // prevents their route comments and generated client types from drifting.
  for (const operationKey of dashboardContractErrorOperations) {
    const [method, route] = operationKey.split(' ');
    const responses =
      route && method ? spec.paths?.[route]?.[method]?.responses : undefined;
    for (const [status, response] of Object.entries(responses ?? {})) {
      if (!status.startsWith('4') && !status.startsWith('5')) continue;
      response.content ??= {};
      response.content['application/json'] ??= {};
      response.content['application/json'].schema = ref('ApiError');
    }
  }

  // Some route comments predate validation/auth/business-rule behavior. Create
  // missing responses here so generated clients include every stable dashboard
  // error status instead of only normalizing statuses that happen to be documented.
  for (const [operationKey, errors] of Object.entries(
    dashboardContractAdditionalErrors
  )) {
    const [method, route] = operationKey.split(' ');
    const operation =
      route && method ? spec.paths?.[route]?.[method] : undefined;
    if (!operation) continue;
    operation.responses ??= {};
    for (const [status, description] of Object.entries(errors)) {
      operation.responses[status] ??= { description };
      const response = operation.responses[status];
      response.content ??= {};
      response.content['application/json'] ??= {};
      response.content['application/json'].schema = ref('ApiError');
    }
  }

  return spec;
}
