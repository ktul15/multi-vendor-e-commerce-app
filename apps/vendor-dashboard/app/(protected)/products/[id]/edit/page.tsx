import { ErrorState } from "@repo/ui";
import Link from "next/link";
import { ProductForm } from "../../../../product-form";
import { getProductFormData } from "../../../../../src/lib/product-data";

export default async function EditProductPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const data = await getProductFormData(id).catch(() => undefined);
  if (!data?.product) {
    return (
      <ErrorState
        action={
          <Link className="ui-button ui-button--secondary ui-button--md" href="/products">
            Back to products
          </Link>
        }
        description="This product could not be loaded for editing."
        title="Product unavailable"
      />
    );
  }
  return <ProductForm categories={data.categories} product={data.product} />;
}
