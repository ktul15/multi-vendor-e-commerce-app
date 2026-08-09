import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  createClearedSessionCookieWrites,
  createDashboardSessionBackend,
  createSessionCookieWrites,
  DashboardAuthError,
  dashboardCookieNames,
  isValidDashboardMutation,
  isValidDashboardEntryMutation,
  loginRedirectPath,
  logoutRedirectPath,
  resolveDashboardSession,
  SESSION_ERROR_HEADER,
} from "./index";
import type {
  DashboardCookieWrite,
  DashboardRole,
  SessionCredentials,
  SessionSummary,
  SessionTokens,
} from "./index";

const VERIFIED_SESSION_HEADER = "X-Dashboard-Verified-Session";
const publicPaths = new Set(["/design-system", "/forbidden", "/login"]);

export type NextDashboardAuthConfig = Readonly<{
  apiBaseUrl: () => string | undefined;
  appOrigin: () => string | undefined;
  bffSecret?: () => string | undefined;
  dashboard: "admin" | "vendor";
  requiredRole: DashboardRole;
  secure: () => boolean;
  trustedClientIpHeader?: () => string | undefined;
}>;

function encodeVerifiedSession(session: SessionSummary): string {
  return encodeURIComponent(JSON.stringify(session));
}

function decodeVerifiedSession(
  value: string | null,
  requiredRole: DashboardRole,
): SessionSummary | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<SessionSummary>;
    if (
      typeof parsed.userId !== "string" ||
      typeof parsed.name !== "string" ||
      typeof parsed.email !== "string" ||
      !(parsed.avatar === null || typeof parsed.avatar === "string") ||
      parsed.role !== requiredRole
    ) {
      return null;
    }
    return parsed as SessionSummary;
  } catch {
    return null;
  }
}

export function createNextDashboardAuth(config: NextDashboardAuthConfig) {
  const names = dashboardCookieNames(config.dashboard);

  const runtimeConfig = () => {
    const apiBaseUrl = config.apiBaseUrl();
    const appOrigin = config.appOrigin();
    const bffSecret = config.bffSecret?.()?.trim();
    const secure = config.secure();
    const trustedClientIpHeader = config.trustedClientIpHeader?.()?.trim().toLowerCase();
    if (!apiBaseUrl || !appOrigin) {
      throw new Error("API_BASE_URL and NEXT_PUBLIC_APP_URL are required");
    }
    const parsedApiUrl = new URL(apiBaseUrl);
    const parsedAppOrigin = new URL(appOrigin);
    if (
      !["http:", "https:"].includes(parsedApiUrl.protocol) ||
      parsedApiUrl.search ||
      parsedApiUrl.hash ||
      parsedApiUrl.username ||
      parsedApiUrl.password ||
      !parsedApiUrl.pathname.endsWith("/api/v1")
    ) {
      throw new Error("API_BASE_URL must be an HTTP(S) URL ending with /api/v1");
    }
    if (
      !["http:", "https:"].includes(parsedAppOrigin.protocol) ||
      parsedAppOrigin.origin !== appOrigin
    ) {
      throw new Error("NEXT_PUBLIC_APP_URL must be an exact HTTP(S) origin");
    }
    if (secure && (parsedApiUrl.protocol !== "https:" || parsedAppOrigin.protocol !== "https:")) {
      throw new Error("Dashboard and API URLs must use HTTPS in production");
    }
    if (secure && (!bffSecret || bffSecret.length < 32)) {
      throw new Error("DASHBOARD_BFF_SECRET must contain at least 32 characters in production");
    }
    if (trustedClientIpHeader && !/^[a-z0-9-]+$/.test(trustedClientIpHeader)) {
      throw new Error("DASHBOARD_TRUSTED_CLIENT_IP_HEADER must be a valid header name");
    }
    if (secure && !trustedClientIpHeader) {
      throw new Error("DASHBOARD_TRUSTED_CLIENT_IP_HEADER is required in production");
    }
    return {
      apiBaseUrl: parsedApiUrl.href.replace(/\/$/, ""),
      appOrigin,
      bffSecret,
      secure,
      trustedClientIpHeader,
    };
  };

  const trustedLocation = (path: string): URL => new URL(path, runtimeConfig().appOrigin);

  const requestCredentials = (request: NextRequest): SessionCredentials => ({
    accessToken: request.cookies.get(names.access)?.value,
    refreshToken: request.cookies.get(names.refresh)?.value,
    sessionId: request.cookies.get(names.session)?.value,
  });

  const applyCookieWrites = (
    response: NextResponse,
    writes: readonly DashboardCookieWrite[],
  ): void => {
    for (const write of writes) response.cookies.set(write.name, write.value, write.options);
  };

  const rotateRequestSession = (
    request: NextRequest,
    tokens: SessionTokens,
  ): readonly DashboardCookieWrite[] => {
    const writes = createSessionCookieWrites({
      dashboard: config.dashboard,
      secure: runtimeConfig().secure,
      sessionId: request.cookies.get(names.session)?.value,
      tokens,
    });
    for (const write of writes) request.cookies.set(write.name, write.value);
    return writes;
  };

  const clearSession = (response: NextResponse): void => {
    applyCookieWrites(
      response,
      createClearedSessionCookieWrites(config.dashboard, runtimeConfig().secure),
    );
  };

  const establishSession = (response: NextResponse, tokens: SessionTokens): void => {
    applyCookieWrites(
      response,
      createSessionCookieWrites({
        dashboard: config.dashboard,
        secure: runtimeConfig().secure,
        tokens,
      }),
    );
  };

  const trustedClientKey = (request?: NextRequest): string | undefined => {
    const { secure, trustedClientIpHeader } = runtimeConfig();
    if (!trustedClientIpHeader) return undefined;
    const rawValue = request?.headers.get(trustedClientIpHeader)?.trim();
    if (!rawValue) {
      if (secure) throw new Error("Trusted client IP header is missing");
      return undefined;
    }
    const clientKey = rawValue.split(",", 1)[0]?.trim();
    if (!clientKey || clientKey.length > 200) {
      throw new Error("Trusted client IP header is invalid");
    }
    return clientKey;
  };

  const sessionBackend = (request?: NextRequest) =>
    createDashboardSessionBackend({
      apiBaseUrl: runtimeConfig().apiBaseUrl,
      bffSecret: runtimeConfig().bffSecret,
      clientKey: trustedClientKey(request),
      dashboard: config.dashboard,
    });

  const resolveRequestSession = (request: NextRequest) =>
    resolveDashboardSession({
      backend: sessionBackend(request),
      credentials: requestCredentials(request),
      requiredRole: config.requiredRole,
    });

  // The proxy always deletes the incoming context header and overwrites it only
  // after backend verification. Layouts consume that internal context instead
  // of repeating the profile request.
  const requireSession = async (): Promise<SessionSummary> => {
    const requestHeaders = await headers();
    if (requestHeaders.get(SESSION_ERROR_HEADER) === "unavailable") {
      throw new DashboardAuthError("The session service is temporarily unavailable", 503);
    }
    const session = decodeVerifiedSession(
      requestHeaders.get(VERIFIED_SESSION_HEADER),
      config.requiredRole,
    );
    if (!session) redirect(trustedLocation("/login").toString());
    return session;
  };

  const loginLocation = (request: NextRequest): URL => {
    const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    return trustedLocation(loginRedirectPath(returnTo));
  };

  const forbiddenLocation = (): URL => trustedLocation("/forbidden");

  const validMutation = (request: NextRequest): boolean =>
    isValidDashboardMutation({
      appOrigin: runtimeConfig().appOrigin,
      cookieToken: request.cookies.get(names.csrf)?.value,
      fetchSite: request.headers.get("Sec-Fetch-Site"),
      headerToken: request.headers.get("X-CSRF-Token"),
      origin: request.headers.get("Origin"),
    });

  const validEntryMutation = (request: NextRequest): boolean =>
    isValidDashboardEntryMutation({
      appOrigin: runtimeConfig().appOrigin,
      fetchSite: request.headers.get("Sec-Fetch-Site"),
      origin: request.headers.get("Origin"),
    });

  const logoutResponse = (_request: NextRequest, revocationFailed = false): NextResponse => {
    const response = NextResponse.redirect(trustedLocation(logoutRedirectPath()), {
      status: 303,
    });
    clearSession(response);
    if (revocationFailed) response.headers.set("X-Session-Revocation", "failed");
    return response;
  };

  const protectRequest = async (request: NextRequest): Promise<NextResponse> => {
    if (publicPaths.has(request.nextUrl.pathname)) return NextResponse.next();

    let result: Awaited<ReturnType<typeof resolveRequestSession>>;
    try {
      result = await resolveRequestSession(request);
    } catch {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.delete(VERIFIED_SESSION_HEADER);
      requestHeaders.set(SESSION_ERROR_HEADER, "unavailable");
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    if (result.kind === "unauthenticated") {
      const response = NextResponse.redirect(loginLocation(request));
      clearSession(response);
      return response;
    }
    if (result.kind === "forbidden") {
      const response = NextResponse.redirect(forbiddenLocation());
      clearSession(response);
      return response;
    }

    const writes = result.rotatedTokens
      ? rotateRequestSession(request, result.rotatedTokens)
      : undefined;
    const requestHeaders = new Headers(request.headers);
    requestHeaders.delete(SESSION_ERROR_HEADER);
    requestHeaders.set(VERIFIED_SESSION_HEADER, encodeVerifiedSession(result.session));
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    if (writes) applyCookieWrites(response, writes);
    return response;
  };

  const sessionResponse = async (request: NextRequest): Promise<NextResponse> => {
    let result: Awaited<ReturnType<typeof resolveRequestSession>>;
    try {
      result = await resolveRequestSession(request);
    } catch {
      return NextResponse.json(
        { success: false, message: "Session service unavailable" },
        { status: 503 },
      );
    }
    if (result.kind === "unauthenticated") {
      const response = NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
      clearSession(response);
      return response;
    }
    if (result.kind === "forbidden") {
      const response = NextResponse.json(
        {
          success: false,
          message: `${config.requiredRole === "ADMIN" ? "Admin" : "Vendor"} access required`,
        },
        { status: 403 },
      );
      clearSession(response);
      return response;
    }

    const response = NextResponse.json({ success: true, data: result.session });
    if (result.rotatedTokens) {
      applyCookieWrites(response, rotateRequestSession(request, result.rotatedTokens));
    }
    return response;
  };

  const logoutRequest = async (request: NextRequest): Promise<NextResponse> => {
    if (!validMutation(request)) {
      return NextResponse.json(
        { success: false, message: "Invalid CSRF or request origin" },
        { status: 403 },
      );
    }

    const refreshToken = requestCredentials(request).refreshToken;
    let revocationFailed = false;
    try {
      if (refreshToken) {
        await sessionBackend(request).logout(refreshToken, requestCredentials(request).sessionId);
      }
    } catch {
      revocationFailed = true;
    }
    return logoutResponse(request, revocationFailed);
  };

  return {
    applyCookieWrites,
    clearSession,
    establishSession,
    forbiddenLocation,
    loginLocation,
    logoutRequest,
    logoutResponse,
    protectRequest,
    requestCredentials,
    requireSession,
    resolveRequestSession,
    rotateRequestSession,
    sessionBackend,
    sessionResponse,
    validMutation,
    validEntryMutation,
  } as const;
}
