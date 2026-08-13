import { EmptyState } from "@repo/ui";
import Link from "next/link";

export default function UserNotFound() {
  return (
    <EmptyState
      action={
        <Link className="ui-button ui-button--secondary ui-button--md" href="/users">
          Back to users
        </Link>
      }
      description="The account may have been removed, or the user ID is invalid."
      title="User not found"
    />
  );
}
