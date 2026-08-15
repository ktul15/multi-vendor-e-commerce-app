import { EmptyState } from "@repo/ui";
import Link from "next/link";

export default function PromoNotFound() {
  return (
    <EmptyState
      action={
        <Link className="ui-button ui-button--secondary ui-button--md" href="/promos">
          Back to promo codes
        </Link>
      }
      description="This promo code does not exist or has been archived."
      title="Promo code not found"
    />
  );
}
