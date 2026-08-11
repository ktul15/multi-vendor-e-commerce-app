import { Badge, Button, Card, CardContent, EmptyState, ErrorState, Input, Select } from "@repo/ui";
import Link from "next/link";
import type { VendorInventory, VendorProduct } from "../src/lib/product-data";
import { productListHref } from "../src/lib/product-list-state";
import type { ProductListState, ProductSortField } from "../src/lib/product-list-state";
import { ProductActions } from "./product-actions";

const currency = new Intl.NumberFormat("en-IN", {
  currency: "INR",
  minimumFractionDigits: 2,
  style: "currency",
});
const date = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const sortLabels: Record<ProductSortField, string> = {
  basePrice: "Price",
  createdAt: "Created",
  name: "Product",
  updatedAt: "Updated",
};

function variantPriceRange(product: VendorProduct): string | undefined {
  const prices = product.variants.map((variant) => Number(variant.price)).filter(Number.isFinite);
  if (prices.length === 0) return undefined;
  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);
  return minimum === maximum
    ? currency.format(minimum)
    : `${currency.format(minimum)}–${currency.format(maximum)}`;
}

function stock(product: VendorProduct) {
  const total = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
  if (total === 0) return { label: "Out of stock", tone: "danger" as const, total };
  if (total <= 10) return { label: "Low stock", tone: "warning" as const, total };
  return { label: "In stock", tone: "success" as const, total };
}

function SortLink({
  field,
  state,
}: Readonly<{ field: ProductSortField; state: ProductListState }>) {
  const active = state.sortBy === field;
  const nextOrder = active && state.sortOrder === "asc" ? "desc" : "asc";
  return (
    <Link
      aria-label={`Sort by ${sortLabels[field]} ${nextOrder === "asc" ? "ascending" : "descending"}`}
      href={productListHref(state, { page: 1, sortBy: field, sortOrder: nextOrder })}
    >
      {sortLabels[field]}
      {active ? <span aria-hidden="true"> {state.sortOrder === "asc" ? "↑" : "↓"}</span> : null}
    </Link>
  );
}

function InventoryTable({
  inventory,
  state,
}: Readonly<{ inventory: VendorInventory; state: ProductListState }>) {
  return (
    <div
      aria-label="Product inventory table"
      className="vendor-inventory-table-wrap"
      role="region"
      tabIndex={0}
    >
      <table className="vendor-inventory-table">
        <caption className="ui-visually-hidden">Vendor product inventory</caption>
        <thead>
          <tr>
            <th
              aria-sort={
                state.sortBy === "name"
                  ? state.sortOrder === "asc"
                    ? "ascending"
                    : "descending"
                  : undefined
              }
              scope="col"
            >
              <SortLink field="name" state={state} />
            </th>
            <th
              aria-sort={
                state.sortBy === "basePrice"
                  ? state.sortOrder === "asc"
                    ? "ascending"
                    : "descending"
                  : undefined
              }
              scope="col"
            >
              <SortLink field="basePrice" state={state} />
            </th>
            <th scope="col">Inventory</th>
            <th scope="col">Moderation / listing</th>
            <th scope="col">Category</th>
            <th
              aria-sort={
                state.sortBy === "updatedAt"
                  ? state.sortOrder === "asc"
                    ? "ascending"
                    : "descending"
                  : undefined
              }
              scope="col"
            >
              <SortLink field="updatedAt" state={state} />
            </th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {inventory.items.map((product) => {
            const inventoryStock = stock(product);
            const variantPrices = variantPriceRange(product);
            return (
              <tr key={product.id}>
                <th scope="row">
                  <div className="vendor-product-name">
                    <span aria-hidden="true" className="vendor-product-thumb">
                      {product.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span>
                      <strong>{product.name}</strong>
                      <small>
                        {product.variants.length}{" "}
                        {product.variants.length === 1 ? "variant" : "variants"}
                      </small>
                    </span>
                  </div>
                </th>
                <td>
                  <div className="vendor-product-state">
                    <strong>{currency.format(Number(product.basePrice))}</strong>
                    {variantPrices ? <small>Variants: {variantPrices}</small> : null}
                  </div>
                </td>
                <td>
                  <div className="vendor-product-state">
                    <Badge tone={inventoryStock.tone}>{inventoryStock.label}</Badge>
                    <small>{inventoryStock.total} units total</small>
                  </div>
                </td>
                <td>
                  <div className="vendor-product-state">
                    <Badge tone={product.isActive ? "success" : "neutral"}>
                      {product.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <small>
                      {product.isActive ? "Visible to customers" : "Hidden from customers"}
                    </small>
                  </div>
                </td>
                <td>{product.category.name}</td>
                <td>
                  <time dateTime={product.updatedAt}>
                    {date.format(new Date(product.updatedAt))}
                  </time>
                </td>
                <td>
                  <ProductActions id={product.id} name={product.name} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Filters({ state }: Readonly<{ state: ProductListState }>) {
  return (
    <form action="/products" className="vendor-inventory-filters" method="get">
      <input name="direction" type="hidden" value={state.sortOrder} />
      <input name="page" type="hidden" value="1" />
      <input name="sort" type="hidden" value={state.sortBy} />
      <Input
        defaultValue={state.search}
        label="Search inventory"
        name="search"
        placeholder="Name, description, or SKU"
      />
      <Select
        defaultValue={state.isActive === undefined ? "" : String(state.isActive)}
        label="Listing status"
        name="filter.isActive"
      >
        <option value="">All listings</option>
        <option value="true">Active</option>
        <option value="false">Inactive</option>
      </Select>
      <Select
        defaultValue={state.inStock === undefined ? "" : String(state.inStock)}
        label="Stock availability"
        name="filter.inStock"
      >
        <option value="">All stock states</option>
        <option value="true">In stock</option>
        <option value="false">Out of stock</option>
      </Select>
      <Select defaultValue={String(state.pageSize)} label="Rows per page" name="pageSize">
        <option value="10">10</option>
        <option value="25">25</option>
        <option value="50">50</option>
      </Select>
      <div className="vendor-inventory-filters__actions">
        <Button type="submit">Apply filters</Button>
        <Link className="ui-button ui-button--ghost ui-button--md" href="/products">
          Clear
        </Link>
      </div>
    </form>
  );
}

export function ProductInventory({
  error,
  inventory,
  state,
}: Readonly<{ error?: string; inventory?: VendorInventory; state: ProductListState }>) {
  const hasFilters = Boolean(
    state.search || state.isActive !== undefined || state.inStock !== undefined,
  );
  const first =
    inventory && inventory.meta.total > 0
      ? (inventory.meta.page - 1) * inventory.meta.limit + 1
      : 0;
  const last = inventory
    ? Math.min(inventory.meta.page * inventory.meta.limit, inventory.meta.total)
    : 0;
  const createdSortOrder =
    state.sortBy === "createdAt" && state.sortOrder === "desc" ? "asc" : "desc";
  return (
    <div className="vendor-inventory">
      <header className="vendor-inventory__header">
        <div>
          <p>Catalog management</p>
          <h1>Products</h1>
          <p>Manage pricing, stock, and customer listing visibility.</p>
        </div>
        <Link className="ui-button ui-button--primary ui-button--md" href="/products/new">
          Add product
        </Link>
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
          title="Inventory unavailable"
        />
      ) : inventory ? (
        <Card>
          <CardContent>
            <div className="vendor-inventory__result">
              <p aria-live="polite">
                Showing {first}–{last} of {inventory.meta.total} products
              </p>
              <Link
                href={productListHref(state, {
                  sortBy: "createdAt",
                  sortOrder: createdSortOrder,
                  page: 1,
                })}
              >
                Sort by created {createdSortOrder === "desc" ? "newest" : "oldest"}
              </Link>
            </div>
            {inventory.items.length > 0 ? (
              <InventoryTable inventory={inventory} state={state} />
            ) : (
              <EmptyState
                action={
                  <Link
                    className="ui-button ui-button--secondary ui-button--md"
                    href={hasFilters ? "/products" : "/products/new"}
                  >
                    {hasFilters ? "Clear filters" : "Add your first product"}
                  </Link>
                }
                description={
                  hasFilters
                    ? "Try a different search or filter combination."
                    : "Create a product to start managing inventory."
                }
                title={hasFilters ? "No matching products" : "No products yet"}
              />
            )}
            {inventory.items.length > 0 ? (
              <nav
                aria-label="Product inventory pagination"
                className="vendor-inventory-pagination"
              >
                {state.page <= 1 ? (
                  <span aria-disabled="true" className="vendor-pagination-link--disabled">
                    Previous
                  </span>
                ) : (
                  <Link href={productListHref(state, { page: state.page - 1 })}>Previous</Link>
                )}
                <span>
                  Page {inventory.meta.page} of {inventory.meta.totalPages}
                </span>
                {state.page >= inventory.meta.totalPages ? (
                  <span aria-disabled="true" className="vendor-pagination-link--disabled">
                    Next
                  </span>
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
