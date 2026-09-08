import { ErrorState } from "@repo/ui";
import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="app-home">
      <ErrorState
        action={<Link href="/login">Sign in with an admin account</Link>}
        title="Admin access required"
        description="This account cannot access the admin panel."
      />
    </main>
  );
}
