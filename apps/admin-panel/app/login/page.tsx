import { postLoginReturnPath } from "@repo/auth";
import type { Metadata } from "next";
import { AdminLoginPanel } from "./admin-login-panel";

export const metadata: Metadata = { title: "Sign in" };

type LoginPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const returnTo = postLoginReturnPath(
    typeof params.returnTo === "string" ? params.returnTo : undefined,
  );

  return <AdminLoginPanel returnTo={returnTo} />;
}
