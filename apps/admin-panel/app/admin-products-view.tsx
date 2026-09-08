import { Badge, Button, Card, CardContent, EmptyState, ErrorState, Input, Select } from "@repo/ui";
import Link from "next/link";
import type { AdminProduct, AdminProducts } from "../src/lib/product-data";
import { productListHref, productStatuses } from "../src/lib/product-list-state";
import type { ProductListState } from "../src/lib/product-list-state";
import { actionsForProduct } from "../src/lib/product-moderation";
import { formatDashboardDate, formatInr } from "../src/lib/format";
import { ProductModerationActionButton } from "./product-moderation-action";

function Filters({ state }: Readonly<{ state: ProductListState }>) {
  return (
    <form action="/products" className="admin-product-filters" method="get">
      <input name="page" type="hidden" value="1" />
      <input name="sort" type="hidden" value="createdAt" />
      <Input
        defaultValue={state.search}
        label="Search products"
        maxLength={100}
        name="search"
        placeholder="Name, description, or tag"
      />
      <Select defaultValue={state.status ?? ""} label="Product status" name="filter.status">
        <option value="">All statuses</option>
        {productStatuses.map((status) => (
          <option key={status} value={status}>
            {status === "active" ? "Active" : "Inactive"}
          </option>
        ))}
      </Select>
      <Input
        defaultValue={state.vendorId ?? ""}
        label="Vendor owner ID"
        name="filter.vendorId"
        placeholder="UUID"
      />
      <Input
        defaultValue={state.categoryId ?? ""}
        label="Category ID"
        name="filter.categoryId"
        placeholder="UUID"
      />
      <Select defaultValue={String(state.pageSize)} label="Rows per page" name="pageSize">
        <option value="10">10</option>
        <option value="20">20</option>
        <option value="50">50</option>
      </Select>
      <div className="admin-product-filters__actions">
        <Button type="submit">Apply filters</Button>
        <Link className="ui-button ui-button--ghost ui-button--md" href="/products">
          Clear
        </Link>
      </div>
    </form>
  );
}

function RowActions({ product }: Readonly<{ product: AdminProduct }>) {
  return (
    <div className="admin-product-row-actions">
      <Link className="ui-button ui-button--ghost ui-button--sm" href={`/products/${product.id}`}>
        View
      </Link>
      {actionsForProduct(product).map((action) => (
        <ProductModerationActionButton action={action} key={action} product={product} />
      ))}
    </div>
  );
}

export function AdminProductsView({
  error,
  products,
  state,
}: Readonly<{ error?: string; products?: AdminProducts; state: ProductListState }>) {
  const hasFilters = Boolean(state.search || state.status || state.vendorId || state.categoryId);
  const first =
    products && products.meta.total ? (products.meta.page - 1) * products.meta.limit + 1 : 0;
  const last = products
    ? Math.min(products.meta.page * products.meta.limit, products.meta.total)
    : 0;
  return (
    <div className="admin-products">
      <header className="admin-products__header">
        <p>Catalog enforcement</p>
        <h1>Products</h1>
        <p>Review catalog listings, inventory, ownership, and marketplace visibility.</p>
      </header>
      <Card>
        <CardContent>
          <Filters state={state} />
        </CardContent>
      </Card>
      {error ? (
        <ErrorState
          action={
            <Link
              className="ui-button ui-button--secondary ui-button--md"
              href={productListHref(state)}
            >
              Try again
            </Link>
          }
          description={error}
          title="Products unavailable"
        />
      ) : products ? (
        <Card>
          <CardContent>
            <p aria-live="polite" className="admin-products__result">
              Showing {first}–{last} of {products.meta.total} products
            </p>
            {products.items.length ? (
              <div
                aria-label="Admin products table"
                className="admin-product-table-wrap"
                role="region"
                tabIndex={0}
              >
                <table className="admin-product-table">
                  <caption className="ui-visually-hidden">Marketplace product moderation</caption>
                  <thead>
                    <tr>
                      <th scope="col">Product</th>
                      <th scope="col">Vendor</th>
                      <th scope="col">Category</th>
                      <th scope="col">Price</th>
                      <th scope="col">Variants</th>
                      <th scope="col">Rating</th>
                      <th scope="col">Status</th>
                      <th scope="col">Created</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.items.map((product) => (
                      <tr key={product.id}>
                        <th scope="row">
                          <Link href={`/products/${product.id}`}>{product.name}</Link>
                        </th>
                        <td>
                          <span className="admin-product-vendor">
                            <strong>{product.vendor.name}</strong>
                            <small>{product.vendor.email}</small>
                          </span>
                        </td>
                        <td>{product.category.name}</td>
                        <td>{formatInr(product.basePrice)}</td>
                        <td>{product._count.variants}</td>
                        <td>
                          {Number(product.avgRating).toFixed(1)} ({product.reviewCount})
                        </td>
                        <td>
                          <Badge tone={product.isActive ? "success" : "danger"}>
                            {product.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td>
                          <time dateTime={product.createdAt}>
                            {formatDashboardDate(product.createdAt)}
                          </time>
                        </td>
                        <td>
                          <RowActions product={product} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                action={
                  hasFilters ? (
                    <Link className="ui-button ui-button--secondary ui-button--md" href="/products">
                      Clear filters
                    </Link>
                  ) : undefined
                }
                description={
                  hasFilters
                    ? "Try a different search, status, vendor, or category."
                    : "Marketplace products will appear here."
                }
                title={hasFilters ? "No matching products" : "No products yet"}
              />
            )}
            {products.items.length ? (
              <nav aria-label="Product pagination" className="admin-product-pagination">
                {state.page <= 1 ? (
                  <span aria-disabled="true">Previous</span>
                ) : (
                  <Link href={productListHref(state, { page: state.page - 1 })}>Previous</Link>
                )}
                <span>
                  Page {products.meta.page} of {products.meta.totalPages}
                </span>
                {state.page >= products.meta.totalPages ? (
                  <span aria-disabled="true">Next</span>
                ) : (
                  <Link href={productListHref(state, { page: state.page + 1 })}>Next</Link>
                )}
              </nav>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
