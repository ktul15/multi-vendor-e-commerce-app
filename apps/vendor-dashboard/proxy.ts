export { protectRequest as proxy } from "./src/lib/session";

export const config = {
  matcher: ["/((?!api(?:/|$)|_next/static|_next/image|favicon.ico).*)"],
};
