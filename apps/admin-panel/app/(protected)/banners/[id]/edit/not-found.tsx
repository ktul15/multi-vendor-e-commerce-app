import { EmptyState } from "@repo/ui";
import { AdminNoPrefetchLink as Link } from "../../../../admin-no-prefetch-link";
export default function NotFound() {
  return (
    <EmptyState
      action={
        <Link className="ui-button ui-button--secondary ui-button--md" href="/banners">
          Back to banners
        </Link>
      }
      description="This banner may have been deleted."
      title="Banner not found"
    />
  );
}
