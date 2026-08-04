import { buildSwaggerSpec } from '../../src/config/swagger';

type Operation = {
  responses: Record<
    string,
    { content?: { 'application/json'?: { schema?: { $ref?: string } } } }
  >;
};

describe('vendor inventory and order OpenAPI contracts', () => {
  const spec = buildSwaggerSpec() as {
    paths: Record<string, Record<string, Operation>>;
    components: {
      schemas: Record<
        string,
        {
          required?: string[];
          properties?: Record<string, { enum?: unknown[]; allOf?: unknown[] }>;
        }
      >;
    };
  };

  const expectSchema = (
    route: string,
    method: string,
    status: string,
    schema: string
  ) => {
    expect(
      spec.paths[route]?.[method]?.responses[status]?.content?.[
        'application/json'
      ]?.schema?.$ref
    ).toBe(`#/components/schemas/${schema}`);
  };

  it.each([
    ['/products/vendor', 'get', '200', 'ProductsSuccess'],
    ['/orders/vendor/{id}', 'get', '200', 'VendorOrderDetailSuccess'],
    ['/products', 'post', '201', 'ProductMutationSuccess'],
    ['/products/{id}', 'put', '200', 'ProductMutationSuccess'],
    ['/products/{id}', 'delete', '200', 'NullSuccess'],
    ['/products/{id}/variants', 'post', '201', 'ProductVariantSuccess'],
    ['/products/{id}/variants/{vid}', 'put', '200', 'ProductVariantSuccess'],
    ['/products/{id}/variants/{vid}', 'delete', '200', 'NullSuccess'],
  ])('documents %s %s %s with %s', (route, method, status, schema) => {
    expectSchema(route, method, status, schema);
  });

  it.each([
    ['/products/vendor', 'get', ['400', '401', '403']],
    ['/orders/vendor/{id}', 'get', ['400', '401', '403', '404']],
    ['/products', 'post', ['400', '401', '403', '404', '409']],
    ['/products/{id}', 'put', ['400', '401', '403', '404']],
    ['/products/{id}', 'delete', ['400', '401', '403', '404', '409']],
    ['/products/{id}/variants', 'post', ['400', '401', '403', '404', '409']],
    [
      '/products/{id}/variants/{vid}',
      'put',
      ['400', '401', '403', '404', '409'],
    ],
    [
      '/products/{id}/variants/{vid}',
      'delete',
      ['400', '401', '403', '404', '409'],
    ],
  ])('documents ApiError for %s %s', (route, method, statuses) => {
    for (const status of statuses) {
      expectSchema(route, method, status, 'ApiError');
    }
  });

  it('models delete response data as literal null', () => {
    expect(spec.components.schemas.NullSuccess?.properties?.data?.enum).toEqual(
      [null]
    );
  });

  it('models the complete nullable vendor-order detail contract', () => {
    const detail = spec.components.schemas.VendorOrderDetail;
    expect(detail?.required).toEqual(
      expect.arrayContaining(['trackingNumber', 'trackingCarrier'])
    );

    const order = detail?.properties?.order as {
      required?: string[];
      properties?: Record<string, { allOf?: unknown[] }>;
    };
    expect(order.required).toEqual(
      expect.arrayContaining(['notes', 'payment'])
    );
    expect(order.properties?.payment?.allOf).toEqual([
      { $ref: '#/components/schemas/VendorOrderPayment' },
    ]);

    expect(spec.components.schemas.VendorOrderPayment?.required).toEqual([
      'status',
      'method',
      'paidAt',
    ]);
  });
});
