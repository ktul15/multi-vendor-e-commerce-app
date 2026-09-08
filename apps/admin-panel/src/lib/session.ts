import { createNextDashboardAuth } from "@repo/auth/next";
import { DashboardAuthError } from "@repo/auth";
import { resolveDashboardAppOrigin } from "@repo/config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adminLoginSchema } from "./auth-forms";

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
  dashboard: "admin",
  requiredRole: "ADMIN",
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
export const requireAdminSession = auth.requireSession;
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

export async function loginRequest(request: NextRequest): Promise<NextResponse> {
  if (!auth.validEntryMutation(request)) return failure("Invalid request origin", 403);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return failure("Request body must be valid JSON", 400);
  }

  const parsed = adminLoginSchema.safeParse(payload);
  if (!parsed.success) {
    return failure(
      "Validation failed",
      400,
      parsed.error.issues.map((issue) => ({
        field: issue.path.map(String).join("."),
        message: issue.message,
      })),
    );
  }

  try {
    const result = await auth.sessionBackend(request).login(parsed.data);
    if (result.user.role !== "ADMIN") {
      await auth
        .sessionBackend(request)
        .logout(result.tokens.refreshToken, `rejected:${result.user.id}`)
        .catch(() => undefined);
      return failure("Admin access required", 403);
    }

    const response = NextResponse.json({ success: true, data: { user: result.user } });
    auth.establishSession(response, result.tokens);
    return response;
  } catch (error) {
    if (error instanceof DashboardAuthError) {
      return failure(error.message, error.status, error.fieldErrors);
    }
    return failure("Authentication service unavailable", 503);
  }
}
