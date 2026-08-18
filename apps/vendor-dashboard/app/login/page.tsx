import { postLoginReturnPath } from "@repo/auth";
import type { Metadata } from "next";
import { VendorAuthPanel } from "./vendor-auth-panel";

export const metadata: Metadata = { title: "Vendor access" };

type LoginPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const returnTo = postLoginReturnPath(
    typeof params.returnTo === "string" ? params.returnTo : undefined,
  );
  const initialMode = params.mode === "register" ? "register" : "login";

  return <VendorAuthPanel initialMode={initialMode} returnTo={returnTo} />;
}
