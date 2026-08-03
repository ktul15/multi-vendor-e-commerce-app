import { createNextDashboardAuth } from "@repo/auth/next";

const auth = createNextDashboardAuth({
  apiBaseUrl: () => process.env.API_BASE_URL,
  appOrigin: () => process.env.NEXT_PUBLIC_APP_URL,
  dashboard: "vendor",
  requiredRole: "VENDOR",
  secure: () => process.env.NODE_ENV === "production",
});

export const applyCookieWrites = auth.applyCookieWrites;
export const clearSession = auth.clearSession;
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
