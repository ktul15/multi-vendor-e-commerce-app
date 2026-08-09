import { createNextDashboardAuth } from "@repo/auth/next";
import { DashboardAuthError } from "@repo/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { vendorLoginSchema, vendorRegistrationSchema } from "./auth-forms";

const auth = createNextDashboardAuth({
  apiBaseUrl: () => process.env.API_BASE_URL,
  appOrigin: () => process.env.NEXT_PUBLIC_APP_URL,
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
