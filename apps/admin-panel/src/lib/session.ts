import { createNextDashboardAuth } from "@repo/auth/next";

const auth = createNextDashboardAuth({
  apiBaseUrl: () => process.env.API_BASE_URL,
  appOrigin: () => process.env.NEXT_PUBLIC_APP_URL,
  bffSecret: () => process.env.DASHBOARD_BFF_SECRET,
  dashboard: "admin",
  requiredRole: "ADMIN",
  secure: () => process.env.NODE_ENV === "production",
  trustedClientIpHeader: () => process.env.DASHBOARD_TRUSTED_CLIENT_IP_HEADER,
});

export const applyCookieWrites = auth.applyCookieWrites;
export const clearSession = auth.clearSession;
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
