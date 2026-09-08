import { createNextDashboardAuth } from "@repo/auth/next";
import { DashboardAuthError } from "@repo/auth";
import { resolveDashboardAppOrigin } from "@repo/config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { vendorLoginSchema, vendorRegistrationSchema } from "./auth-forms";
import { canRenderVendorRoute } from "./vendor-access";
import { requestVendorAccessProfile } from "./vendor-profile-api";

export const dashboardAppOrigin = () =>
  resolveDashboardAppOrigin({
    configuredOrigin: process.env.NEXT_PUBLIC_APP_URL,
    deploymentEnvironment: process.env.DASHBOARD_ENVIRONMENT ?? process.env.VERCEL_ENV,
    production: process.env.NODE_ENV === "production",
    vercelUrl: process.env.VERCEL_URL,
  });

const auth = createNextDashboardAuth({
  apiBaseUrl: () => process.env.API_BASE_URL,
  appOrigin: dashboardAppOrigin,
  bffSecret: () => process.env.DASHBOARD_BFF_SECRET,
  dashboard: "vendor",
  requiredRole: "VENDOR",
  secure: () => process.env.NODE_ENV === "production",
  trustedClientIpHeader: () => process.env.DASHBOARD_TRUSTED_CLIENT_IP_HEADER,
});

export const applyCookieWrites = auth.applyCookieWrites;
export const clearSession = auth.clearSession;
export const establishSession = auth.establishSession;
export const forbiddenLocation = auth.forbiddenLocation;
export const loginLocation = auth.loginLocation;
export const logoutRequest = auth.logoutRequest;
export const logoutResponse = auth.logoutResponse;
export const protectRequest = auth.protectRequest;
export const requestCredentials = auth.requestCredentials;
export const requireVendorSession = auth.requireSession;
export const resolveRequestSession = auth.resolveRequestSession;
export const rotateRequestSession = auth.rotateRequestSession;
export const sessionBackend = auth.sessionBackend;
export const sessionResponse = auth.sessionResponse;
export const validMutation = auth.validMutation;

const lifecyclePath = "/access";
const publicPaths = new Set(["/design-system", "/forbidden", "/login"]);

function redirectWithCookieWrites(response: NextResponse, path: string) {
  const appOrigin = dashboardAppOrigin();
  if (!appOrigin) throw new Error("A valid dashboard app origin is required");
  const redirectResponse = NextResponse.redirect(new URL(path, appOrigin));
  for (const cookie of response.cookies.getAll()) redirectResponse.cookies.set(cookie);
  return redirectResponse;
}

export async function protectVendorRequest(request: NextRequest): Promise<NextResponse> {
  const response = await auth.protectRequest(request);
  if (publicPaths.has(request.nextUrl.pathname) || !response.headers.has("x-middleware-next")) {
    return response;
  }

  const accessToken = auth.requestCredentials(request).accessToken;
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!accessToken || !apiBaseUrl) {
    return request.nextUrl.pathname === lifecyclePath
      ? response
      : redirectWithCookieWrites(response, lifecyclePath);
  }

  try {
    const profile = await requestVendorAccessProfile(accessToken, apiBaseUrl);
    if (request.nextUrl.pathname === lifecyclePath) {
      return profile.status === "APPROVED" ? redirectWithCookieWrites(response, "/") : response;
    }
    if (canRenderVendorRoute(profile.status, request.nextUrl.pathname)) return response;
    return redirectWithCookieWrites(response, lifecyclePath);
  } catch {
    // Fail closed: only the lifecycle page may render while profile access is uncertain.
    return request.nextUrl.pathname === lifecyclePath
      ? response
      : redirectWithCookieWrites(response, lifecyclePath);
  }
}

function failure(message: string, status: number, errors?: readonly unknown[]) {
  return NextResponse.json(
    { success: false, message, ...(errors?.length ? { errors } : {}) },
    { status },
  );
}

function validationFailure(error: {
  issues: readonly Readonly<{ message: string; path: readonly PropertyKey[] }>[];
}) {
  return failure(
    "Validation failed",
    400,
    error.issues.map((issue) => ({
      field: issue.path.map(String).join("."),
      message: issue.message,
    })),
  );
}

async function entryRequest(request: NextRequest, mode: "login" | "register") {
  if (!auth.validEntryMutation(request)) {
    return failure("Invalid request origin", 403);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return failure("Request body must be valid JSON", 400);
  }

  try {
    let result;
    if (mode === "login") {
      const parsed = vendorLoginSchema.safeParse(payload);
      if (!parsed.success) return validationFailure(parsed.error);
      result = await auth.sessionBackend(request).login(parsed.data);
    } else {
      const parsed = vendorRegistrationSchema.safeParse(payload);
      if (!parsed.success) return validationFailure(parsed.error);
      result = await auth.sessionBackend(request).registerVendor({
        email: parsed.data.email,
        name: parsed.data.name,
        password: parsed.data.password,
        storeName: parsed.data.storeName,
      });
    }

    if (result.user.role !== "VENDOR") {
      await auth
        .sessionBackend(request)
        .logout(result.tokens.refreshToken, `rejected:${result.user.id}`)
        .catch(() => undefined);
      return failure("Vendor access required", 403);
    }

    const response = NextResponse.json(
      { success: true, data: { user: result.user } },
      { status: mode === "register" ? 201 : 200 },
    );
    auth.establishSession(response, result.tokens);
    return response;
  } catch (error) {
    if (error instanceof DashboardAuthError) {
      return failure(error.message, error.status, error.fieldErrors);
    }
    return failure("Authentication service unavailable", 503);
  }
}

export const loginRequest = (request: NextRequest) => entryRequest(request, "login");
export const registerRequest = (request: NextRequest) => entryRequest(request, "register");
