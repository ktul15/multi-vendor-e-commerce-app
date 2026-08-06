import { buildSwaggerSpec } from '../../src/config/swagger';

describe('category OpenAPI contract', () => {
  const spec = buildSwaggerSpec() as any;

  const responseRef = (route: string, method: string, status: string) =>
    spec.paths[route][method].responses[status].content['application/json']
      .schema.$ref;

  it('documents complete tree and concrete mutation envelopes', () => {
    expect(responseRef('/categories', 'get', '200')).toBe(
      '#/components/schemas/CategoriesSuccess'
    );
    expect(responseRef('/categories', 'post', '201')).toBe(
      '#/components/schemas/CategorySuccess'
    );
    expect(responseRef('/categories/{id}', 'put', '200')).toBe(
      '#/components/schemas/CategorySuccess'
    );
    expect(responseRef('/categories/{id}', 'delete', '200')).toBe(
      '#/components/schemas/NullSuccess'
    );
    expect(
      spec.components.schemas.CategoryTreeNode.properties.children.items.$ref
    ).toBe('#/components/schemas/CategoryTreeNode');
    expect(spec.components.schemas.CategoryTreeNode.required).toContain(
      'children'
    );
    expect(
      spec.components.schemas.CategoriesSuccess.properties.data.items.$ref
    ).toBe('#/components/schemas/CategoryTreeNode');
  });

  it('keeps images optional in JSON and multipart request schemas', () => {
    for (const contentType of ['application/json', 'multipart/form-data']) {
      const create =
        spec.paths['/categories'].post.requestBody.content[contentType].schema;
      expect(create.required).toEqual(['name']);
      expect(create.required).not.toContain('image');

      const update =
        spec.paths['/categories/{id}'].put.requestBody.content[contentType]
          .schema;
      expect(update.minProperties).toBe(1);
      expect(update.required ?? []).not.toContain('image');
    }
  });

  it.each([
    ['/categories', 'post', ['400', '401', '403', '404', '413']],
    ['/categories/{id}', 'put', ['400', '401', '403', '404', '413']],
    ['/categories/{id}', 'delete', ['400', '401', '403', '404']],
  ])('documents ApiError for %s %s', (route, method, statuses) => {
    for (const status of statuses) {
      expect(responseRef(route, method, status)).toBe(
        '#/components/schemas/ApiError'
      );
    }
  });
});
