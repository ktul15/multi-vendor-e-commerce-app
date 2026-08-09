import { ErrorState } from "@repo/ui";
import Link from "next/link";
import { ProductForm } from "../../../product-form";
import { getProductFormData } from "../../../../src/lib/product-data";

export default async function NewProductPage() {
  const data = await getProductFormData().catch(() => undefined);
  if (!data) {
    return (
      <ErrorState
        action={
          <Link className="ui-button ui-button--secondary ui-button--md" href="/products/new">
            Try again
          </Link>
        }
        description="Categories could not be loaded."
        title="Product form unavailable"
      />
    );
  }
  return <ProductForm categories={data.categories} />;
}
