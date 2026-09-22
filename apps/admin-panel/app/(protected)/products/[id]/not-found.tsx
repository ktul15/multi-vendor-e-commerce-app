import { EmptyState } from "@repo/ui";
import { AdminNoPrefetchLink as Link } from "../../../admin-no-prefetch-link";

export default function ProductNotFound() {
  return (
    <EmptyState
      action={
        <Link className="ui-button ui-button--secondary ui-button--md" href="/products">
          Back to products
        </Link>
      }
      description="The product may have been removed, or the product ID is invalid."
      title="Product not found"
    />
  );
}
