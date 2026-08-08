import { buildSwaggerSpec } from '../../src/config/swagger';

type Operation = {
  description?: string;
  parameters?: Array<{ name?: string; description?: string }>;
  responses?: Record<
    string,
    { content?: Record<string, { schema?: { $ref?: string } }> }
  >;
};

type Spec = {
  paths: Record<string, Record<string, Operation>>;
  components: { schemas: Record<string, unknown> };
};

const responseSchema = (operation: Operation, status = '200') =>
  operation.responses?.[status]?.content?.['application/json']?.schema?.$ref;

describe('Issue #134 admin OpenAPI contract', () => {
  const spec = buildSwaggerSpec() as Spec;

  it.each([
    ['/admin/users/{userId}', 'AdminUserDetailSuccess'],
    ['/admin/vendors/{vendorProfileId}', 'AdminVendorDetailSuccess'],
    ['/admin/products/{productId}', 'AdminProductDetailSuccess'],
    ['/admin/orders', 'AdminOrdersSuccess'],
    ['/admin/orders/{orderId}', 'AdminOrderDetailSuccess'],
  ])('maps GET %s to %s', (path, schema) => {
    expect(responseSchema(spec.paths[path]!.get!)).toBe(
      `#/components/schemas/${schema}`
    );
  });

  it('documents distinct vendor-profile and owner user identifiers', () => {
    const operation = spec.paths['/admin/vendors/{vendorProfileId}']!.get!;
    expect(
      operation.parameters?.find(
        (parameter) => parameter.name === 'vendorProfileId'
      )
    ).toEqual(
      expect.objectContaining({
        description: expect.stringMatching(/VendorProfile ID.*user ID/i),
      })
    );

    const schema = spec.components.schemas.AdminVendorDetail as {
      required?: string[];
      properties?: Record<string, unknown>;
    };
    expect(schema.required).toEqual(
      expect.arrayContaining(['id', 'userId', 'user'])
    );
    expect(schema.properties).toHaveProperty('userId');

    for (const path of ['/admin/products', '/admin/orders']) {
      const vendorId = spec.paths[path]!.get!.parameters?.find(
        (parameter) => parameter.name === 'vendorId'
      );
      expect(vendorId?.description).toMatch(
        /owner user-account ID.*not the vendor-profile ID/i
      );
    }
  });

  it('maps vendor lifecycle mutations to a least-privilege DTO', () => {
    for (const action of ['approve', 'reject', 'suspend']) {
      const operation =
        spec.paths[`/admin/vendors/{vendorProfileId}/${action}`]!.patch!;
      expect(responseSchema(operation)).toBe(
        '#/components/schemas/AdminVendorLifecycleSuccess'
      );
    }

    const schema = spec.components.schemas.AdminVendorLifecycle as {
      required?: string[];
      properties?: Record<string, unknown>;
    };
    expect(schema.required).toEqual(['id', 'userId', 'storeName', 'status']);
    expect(Object.keys(schema.properties ?? {})).toEqual([
      'id',
      'userId',
      'storeName',
      'status',
    ]);
  });

  it('documents mixed fulfillment and same-sub-order filter semantics', () => {
    const list = spec.paths['/admin/orders']!.get!;
    expect(list.description).toMatch(/MIXED/);
    expect(list.description).toMatch(/same vendor sub-order/);

    const schema = spec.components.schemas.AdminFulfillmentStatus as {
      properties?: {
        kind?: { enum?: string[] };
        status?: { nullable?: boolean };
      };
    };
    expect(schema.properties?.kind?.enum).toEqual(['NONE', 'SINGLE', 'MIXED']);
    expect(schema.properties?.status?.nullable).toBe(true);
  });

  it('uses the structured error envelope for detail, filtering, and lifecycle errors', () => {
    const cases: Array<[string, string, string]> = [
      ['/admin/users/{userId}', 'get', '404'],
      ['/admin/vendors/{vendorProfileId}', 'get', '404'],
      ['/admin/products/{productId}', 'get', '404'],
      ['/admin/orders', 'get', '400'],
      ['/admin/orders/{orderId}', 'get', '404'],
      ['/admin/users/{userId}/ban', 'patch', '409'],
      ['/admin/vendors/{vendorProfileId}/suspend', 'patch', '400'],
      ['/admin/products/{productId}/deactivate', 'patch', '409'],
      ['/admin/products/{productId}', 'delete', '409'],
    ];

    for (const [path, method, status] of cases) {
      expect(responseSchema(spec.paths[path]![method]!, status)).toBe(
        '#/components/schemas/ApiError'
      );
    }
  });

  it('models admin product delete as an empty 204 response', () => {
    const response =
      spec.paths['/admin/products/{productId}']!.delete!.responses?.['204'];
    expect(response).toBeDefined();
    expect(response?.content).toBeUndefined();
  });
});
