import { buildSwaggerSpec } from '../../src/config/swagger';

describe('banner and vendor-profile upload OpenAPI contracts', () => {
  const spec = buildSwaggerSpec() as any;

  const responseRef = (route: string, method: string, status: string) =>
    spec.paths[route][method].responses[status].content['application/json']
      .schema.$ref;

  it('uses concrete success schemas and the runtime banner delete status', () => {
    expect(responseRef('/banners', 'post', '201')).toBe(
      '#/components/schemas/BannerSuccess'
    );
    expect(responseRef('/banners/{id}', 'put', '200')).toBe(
      '#/components/schemas/BannerSuccess'
    );
    expect(responseRef('/banners/all', 'get', '200')).toBe(
      '#/components/schemas/BannerListSuccess'
    );
    expect(responseRef('/vendor-profile/me', 'put', '200')).toBe(
      '#/components/schemas/VendorProfileMutationSuccess'
    );
    expect(spec.paths['/banners/{id}'].delete.responses['204']).toBeDefined();
    expect(spec.paths['/banners/{id}'].delete.responses['200']).toBeUndefined();
  });

  it('documents JSON text updates and multipart file-only updates', () => {
    for (const route of ['/banners/{id}', '/vendor-profile/me']) {
      const content = spec.paths[route].put.requestBody.content;
      expect(content['application/json'].schema.minProperties).toBe(1);
      expect(content['multipart/form-data'].schema.minProperties).toBe(1);
    }

    const bannerImage =
      spec.paths['/banners/{id}'].put.requestBody.content['multipart/form-data']
        .schema.properties.image;
    expect(bannerImage.description).toMatch(/single JPEG, PNG, or WebP/i);
    expect(bannerImage.description).toMatch(/5 MB/i);

    const multipartLink =
      spec.paths['/banners/{id}'].put.requestBody.content['multipart/form-data']
        .schema.properties.linkUrl;
    expect(multipartLink.description).toMatch(/empty string to clear/i);
    expect(multipartLink.oneOf[1].enum).toEqual(['']);

    const profileProperties =
      spec.paths['/vendor-profile/me'].put.requestBody.content[
        'multipart/form-data'
      ].schema.properties;
    for (const field of ['logo', 'banner']) {
      expect(profileProperties[field].description).toMatch(
        /single JPEG, PNG, or WebP/i
      );
      expect(profileProperties[field].description).toMatch(/5 MB/i);
    }
  });

  it('does not document internal media or payment fields in response DTOs', () => {
    expect(
      spec.components.schemas.Banner.properties.imagePublicId
    ).toBeUndefined();
    const profileData =
      spec.components.schemas.VendorProfileMutationSuccess.properties.data;
    for (const field of [
      'storeLogoPublicId',
      'storeBannerPublicId',
      'providerAccountId',
      'commissionRate',
      'bankDetails',
    ]) {
      expect(profileData.properties[field]).toBeUndefined();
    }
  });

  it('uses the public vendor-profile DTO fields in the GET example', () => {
    const example =
      spec.paths['/vendor-profile/me'].get.responses['200'].content[
        'application/json'
      ].example.data;
    expect(example).toMatchObject({
      userId: 'uuid',
      storeLogo: null,
      storeBanner: null,
      user: {
        name: 'Jane Vendor',
        email: 'jane@example.com',
        avatar: null,
      },
    });
    expect(example.logoUrl).toBeUndefined();
    expect(example.bannerUrl).toBeUndefined();
  });

  it.each([
    ['/banners/all', 'get', ['400', '401', '403']],
    ['/banners/{id}', 'get', ['400', '401', '403', '404']],
    ['/banners', 'post', ['400', '401', '403', '413']],
    ['/banners/{id}', 'put', ['400', '401', '403', '404', '413']],
    ['/banners/{id}', 'delete', ['400', '401', '403', '404']],
    ['/vendor-profile/me', 'get', ['401', '403', '404']],
    ['/vendor-profile/me', 'put', ['400', '401', '403', '404', '409', '413']],
  ])('uses structured errors for %s %s', (route, method, statuses) => {
    for (const status of statuses) {
      expect(responseRef(route, method, status)).toBe(
        '#/components/schemas/ApiError'
      );
    }
  });
});
