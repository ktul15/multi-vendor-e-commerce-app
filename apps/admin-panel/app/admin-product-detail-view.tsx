import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, ErrorState } from "@repo/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import type { AdminProductDetail } from "../src/lib/product-data";
import { actionsForProduct } from "../src/lib/product-moderation";
import { formatDashboardDate, formatInr } from "../src/lib/format";
import { ProductModerationActionButton } from "./product-moderation-action";

function Field({ label, value }: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <div className="admin-product-detail__field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function AdminProductDetailView({
  error,
  product,
}: Readonly<{ error?: string; product?: AdminProductDetail }>) {
  if (error || !product) {
    return (
      <ErrorState
        action={
          <Link className="ui-button ui-button--secondary ui-button--md" href="/products">
            Back to products
          </Link>
        }
        description={error ?? "Product details could not be loaded."}
        title="Product unavailable"
      />
    );
  }
  const media = product.media.length
    ? product.media.map(({ id, position, url }) => ({ id, position, url }))
    : product.images.map((url, position) => ({ id: url, position, url }));
  return (
    <div className="admin-product-detail">
      <header className="admin-product-detail__header">
        <div>
          <Link href="/products">← Products</Link>
          <p>Product moderation</p>
          <h1>{product.name}</h1>
          <Badge tone={product.isActive ? "success" : "danger"}>
            {product.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="admin-product-detail__actions">
          {actionsForProduct(product).map((action) => (
            <ProductModerationActionButton
              action={action}
              key={action}
              product={product}
              returnToListOnDelete
            />
          ))}
        </div>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Listing details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="admin-product-detail__grid">
            <Field label="Product ID" value={<code>{product.id}</code>} />
            <Field label="Base price" value={formatInr(product.basePrice)} />
            <Field label="Category" value={`${product.category.name} (${product.category.slug})`} />
            <Field
              label="Rating"
              value={`${Number(product.avgRating).toFixed(1)} from ${product.reviewCount} reviews`}
            />
            <Field label="Variants" value={product.variants.length} />
            <Field
              label="Total stock"
              value={product.variants.reduce((total, variant) => total + variant.stock, 0)}
            />
            <Field
              label="Created"
              value={
                <time dateTime={product.createdAt}>{formatDashboardDate(product.createdAt)}</time>
              }
            />
            <Field
              label="Updated"
              value={
                <time dateTime={product.updatedAt}>{formatDashboardDate(product.updatedAt)}</time>
              }
            />
          </dl>
          <div className="admin-product-detail__description">
            <h4>Description</h4>
            <p>{product.description || "No description provided."}</p>
          </div>
          <div className="admin-product-detail__tags">
            <h4>Tags</h4>
            {product.tags.length ? (
              product.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)
            ) : (
              <span>No tags</span>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Vendor and category</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="admin-product-detail__grid">
            <Field
              label="Vendor owner"
              value={`${product.vendor.name} (${product.vendor.email})`}
            />
            <Field label="Vendor user ID" value={<code>{product.vendor.id}</code>} />
            <Field
              label="Vendor profile"
              value={
                product.vendor.vendorProfile ? (
                  <Link href={`/vendors/${product.vendor.vendorProfile.id}`}>
                    {product.vendor.vendorProfile.storeName}
                  </Link>
                ) : (
                  "No vendor profile"
                )
              }
            />
            <Field
              label="Vendor status"
              value={product.vendor.vendorProfile?.status ?? "Unavailable"}
            />
            <Field label="Category ID" value={<code>{product.category.id}</code>} />
            <Field
              label="Parent category ID"
              value={
                product.category.parentId ? <code>{product.category.parentId}</code> : "Top level"
              }
            />
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Media</CardTitle>
        </CardHeader>
        <CardContent>
          {media.length ? (
            <ol className="admin-product-media">
              {media.map((item) => (
                <li key={item.id}>
                  <a href={item.url} rel="noreferrer" target="_blank">
                    Image {item.position + 1}
                  </a>
                  <small>{item.url}</small>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              description="This product has no uploaded media."
              title="No product media"
            />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Variants and inventory</CardTitle>
        </CardHeader>
        <CardContent>
          {product.variants.length ? (
            <div
              aria-label="Product variants table"
              className="admin-product-table-wrap"
              role="region"
              tabIndex={0}
            >
              <table className="admin-product-table admin-product-variant-table">
                <caption className="ui-visually-hidden">Product variants and inventory</caption>
                <thead>
                  <tr>
                    <th scope="col">SKU</th>
                    <th scope="col">Size</th>
                    <th scope="col">Color</th>
                    <th scope="col">Price</th>
                    <th scope="col">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {product.variants.map((variant) => (
                    <tr key={variant.id}>
                      <th scope="row">{variant.sku}</th>
                      <td>{variant.size || "—"}</td>
                      <td>{variant.color || "—"}</td>
                      <td>{formatInr(variant.price)}</td>
                      <td>{variant.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              description="This product does not have variants or inventory."
              title="No variants"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
