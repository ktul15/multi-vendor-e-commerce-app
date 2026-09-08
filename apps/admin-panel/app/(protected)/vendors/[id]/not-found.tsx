import { EmptyState } from "@repo/ui";
import Link from "next/link";

export default function VendorNotFound() {
  return (
    <EmptyState
      action={
        <Link className="ui-button ui-button--secondary ui-button--md" href="/vendors">
          Back to vendors
        </Link>
      }
      description="The vendor profile may have been removed, or the profile ID is invalid."
      title="Vendor not found"
    />
  );
}
