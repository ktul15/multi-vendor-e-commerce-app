import { buildSwaggerSpec } from '../../src/config/swagger';

type Operation = {
  security?: unknown[];
  requestBody?: {
    content?: Record<string, { schema?: Record<string, unknown> }>;
  };
  responses?: Record<
    string,
    { content?: { 'application/json'?: { schema?: Record<string, unknown> } } }
  >;
};

const spec = buildSwaggerSpec() as {
  paths: Record<string, Record<string, Operation>>;
  components: { schemas: Record<string, Record<string, unknown>> };
};

describe('product media OpenAPI contract', () => {
  it('documents upload, replace, and remove as authenticated vendor operations', () => {
    const operations: Array<[string, string, string]> = [
      ['/products/{id}/media', 'post', '201'],
      ['/products/{id}/media/{mediaId}', 'put', '200'],
      ['/products/{id}/media/{mediaId}', 'delete', '200'],
    ];

    for (const [path, method, successStatus] of operations) {
      const operation = spec.paths[path]![method]!;
      expect(operation.security).toEqual(
        expect.arrayContaining([{ BearerAuth: [] }, { CookieAuth: [] }])
      );
      expect(
        operation.responses?.[successStatus]?.content?.['application/json']
          ?.schema
      ).toEqual({ $ref: '#/components/schemas/ProductMediaSuccess' });
      for (const errorStatus of ['400', '401', '403', '404']) {
        expect(operation.responses?.[errorStatus]).toBeDefined();
      }
    }
    expect(
      spec.paths['/products/{id}/media']!.post!.responses?.['413']
    ).toBeDefined();
    expect(
      spec.paths['/products/{id}/media/{mediaId}']!.put!.responses?.['413']
    ).toBeDefined();
    const replaceBadRequest = spec.paths['/products/{id}/media/{mediaId}']!.put!
      .responses?.['400'] as Record<string, unknown>;
    expect(replaceBadRequest.description).toBe(
      'Missing image, invalid type, or unexpected field'
    );
    expect(replaceBadRequest).not.toHaveProperty('invalid type');
    expect(replaceBadRequest).not.toHaveProperty('or unexpected field');
  });

  it('declares bounded multipart fields and a stable ordered public DTO', () => {
    const uploadSchema = spec.paths['/products/{id}/media']!.post!.requestBody
      ?.content?.['multipart/form-data']?.schema as {
      required?: string[];
      properties?: { images?: Record<string, unknown> };
    };
    expect(uploadSchema.required).toContain('images');
    expect(uploadSchema.properties?.images).toMatchObject({
      type: 'array',
      minItems: 1,
      maxItems: 5,
      items: { type: 'string', format: 'binary' },
    });

    const replaceSchema = spec.paths['/products/{id}/media/{mediaId}']!.put!
      .requestBody?.content?.['multipart/form-data']?.schema as {
      required?: string[];
      properties?: Record<string, unknown>;
    };
    expect(replaceSchema.required).toContain('image');
    expect(replaceSchema.properties?.image).toEqual({
      type: 'string',
      format: 'binary',
    });

    expect(spec.components.schemas.ProductMedia).toMatchObject({
      type: 'object',
      required: ['id', 'url', 'position', 'createdAt', 'updatedAt'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        url: { type: 'string', format: 'uri' },
        position: { type: 'integer', minimum: 0 },
      },
    });
    expect(
      (spec.components.schemas.ProductMedia as { properties?: object })
        .properties
    ).not.toHaveProperty('publicId');
  });
});
