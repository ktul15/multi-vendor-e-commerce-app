import { EmptyState } from "@repo/ui";
import Link from "next/link";

export default function OrderNotFound() {
  return (
    <EmptyState
      action={
        <Link className="ui-button ui-button--secondary ui-button--md" href="/orders">
          Back to orders
        </Link>
      }
      description="The order may not exist, or the order ID is invalid."
      title="Order not found"
    />
  );
}
