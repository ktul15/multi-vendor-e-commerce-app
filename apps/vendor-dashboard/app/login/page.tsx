import { postLoginReturnPath } from "@repo/auth";
import { VendorAuthPanel } from "./vendor-auth-panel";

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
