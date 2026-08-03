import { ErrorState } from "@repo/ui";
import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="app-home">
      <ErrorState
        action={<Link href="/login">Sign in with a vendor account</Link>}
        title="Vendor access required"
        description="This account cannot access the vendor dashboard."
      />
    </main>
  );
}
