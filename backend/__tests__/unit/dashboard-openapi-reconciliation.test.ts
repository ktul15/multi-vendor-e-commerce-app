import SwaggerParser from '@apidevtools/swagger-parser';
import { buildSwaggerSpec } from '../../src/config/swagger';

type Operation = {
  description?: string;
  requestBody?: {
    content?: Record<
      string,
      { schema?: { properties?: Record<string, { nullable?: boolean }> } }
    >;
  };
  responses?: Record<
    string,
    { content?: Record<string, { schema?: { $ref?: string } }> }
  >;
};

type Spec = {
  paths: Record<string, Record<string, Operation>>;
  components: {
    schemas: Record<
      string,
      { properties?: Record<string, unknown>; required?: string[] }
    >;
  };
};

const responseRef = (operation: Operation, status = '200') =>
  operation.responses?.[status]?.content?.['application/json']?.schema?.$ref;

describe('Issue #130 reconciled dashboard OpenAPI', () => {
  const spec = buildSwaggerSpec() as Spec;

  it('is structurally valid OpenAPI', async () => {
    await expect(
      SwaggerParser.validate(JSON.parse(JSON.stringify(spec)))
    ).resolves.toBeDefined();
  });

  it.each([
    ['/admin/users', 'get', 'AdminUsersSuccess'],
    ['/admin/vendors', 'get', 'AdminVendorsSuccess'],
    ['/admin/products', 'get', 'AdminProductsSuccess'],
    ['/promo-codes', 'get', 'PromoCodesSuccess'],
    ['/promo-codes/{id}', 'delete', 'PromoCodeSuccess'],
    ['/vendor-payouts/earnings', 'get', 'VendorEarningsSuccess'],
    ['/vendor-payouts/payouts', 'get', 'VendorPayoutsSuccess'],
    [
      '/vendor-payouts/connect/onboard/refresh',
      'get',
      'ConnectOnboardingSuccess',
    ],
  ])('maps %s %s to concrete %s', (path, method, schema) => {
    expect(responseRef(spec.paths[path]![method]!)).toBe(
      `#/components/schemas/${schema}`
    );
  });

  it('models both pagination families without changing empty-page runtime semantics', () => {
    const adminData = spec.components.schemas.AdminUsersSuccess.properties
      ?.data as { properties?: Record<string, unknown> };
    const earningsData = spec.components.schemas.VendorEarningsSuccess
      .properties?.data as { properties?: Record<string, unknown> };

    expect(adminData.properties).toEqual(
      expect.objectContaining({
        items: expect.anything(),
        meta: expect.anything(),
      })
    );
    expect(earningsData.properties).toEqual(
      expect.objectContaining({
        earnings: expect.anything(),
        pagination: expect.anything(),
      })
    );
  });

  it('documents backend-controlled Stripe redirect reconciliation', () => {
    const onboard = spec.paths['/vendor-payouts/connect/onboard']!.post!;
    const refresh = spec.paths['/vendor-payouts/connect/onboard/refresh']!.get!;
    const status = spec.paths['/vendor-payouts/connect/status']!.get!;

    expect(onboard.description).toMatch(
      /backend-configured return and refresh/i
    );
    expect(refresh.description).toMatch(/never request input/i);
    expect(status.description).toMatch(/not proof of completion/i);
    expect(
      spec.components.schemas.ConnectStatusSuccess.properties?.data
    ).toEqual(
      expect.objectContaining({
        properties: expect.objectContaining({
          onboardingStatus: expect.anything(),
          chargesEnabled: expect.anything(),
          payoutsEnabled: expect.anything(),
          detailsSubmitted: expect.anything(),
        }),
      })
    );
  });

  it('uses stable dashboard error envelopes for both roles', () => {
    const cases: Array<[string, string, string]> = [
      ['/admin/users', 'get', '400'],
      ['/admin/vendors', 'get', '400'],
      ['/admin/vendors', 'get', '403'],
      ['/admin/products', 'get', '400'],
      ['/admin/products', 'get', '403'],
      ['/admin/users/{userId}/ban', 'patch', '409'],
      ['/promo-codes', 'post', '400'],
      ['/promo-codes', 'get', '400'],
      ['/promo-codes/{id}', 'get', '404'],
      ['/promo-codes/{id}', 'get', '400'],
      ['/promo-codes/{id}', 'get', '403'],
      ['/promo-codes/{id}', 'put', '409'],
      ['/promo-codes/{id}', 'delete', '400'],
      ['/admin/revenue', 'get', '400'],
      ['/admin/revenue', 'get', '403'],
      ['/admin/commission', 'get', '403'],
      ['/admin/commission', 'patch', '403'],
      ['/vendor-payouts/connect/onboard', 'post', '403'],
      ['/vendor-payouts/connect/onboard/refresh', 'get', '400'],
      ['/vendor-payouts/connect/onboard/refresh', 'get', '404'],
      ['/vendor-payouts/earnings', 'get', '400'],
      ['/vendor-payouts/earnings', 'get', '403'],
      ['/vendor-payouts/payouts', 'get', '400'],
    ];

    for (const [path, method, status] of cases) {
      expect(responseRef(spec.paths[path]![method]!, status)).toBe(
        '#/components/schemas/ApiError'
      );
    }
  });

  it('documents nullable promo fields that runtime updates can clear', () => {
    const properties =
      spec.paths['/promo-codes/{id}']!.put!.requestBody?.content?.[
        'application/json'
      ]?.schema?.properties;

    for (const field of [
      'minOrderValue',
      'maxDiscount',
      'usageLimit',
      'perUserLimit',
      'expiresAt',
    ]) {
      expect(properties?.[field]?.nullable).toBe(true);
    }
  });

  it('uses literal success discriminants for both response branches', () => {
    const apiErrorSuccess = spec.components.schemas.ApiError.properties
      ?.success as { enum?: boolean[] };
    expect(apiErrorSuccess.enum).toEqual([false]);
  });

  it('keeps no-content deletes and soft-archive promo deletion distinct', () => {
    expect(
      spec.paths['/admin/products/{productId}']!.delete!.responses?.['204']
        ?.content
    ).toBeUndefined();
    expect(
      spec.paths['/banners/{id}']!.delete!.responses?.['204']?.content
    ).toBeUndefined();
    expect(spec.paths['/promo-codes/{id}']!.delete!.description).toMatch(
      /soft-deactivates/i
    );
  });
});
