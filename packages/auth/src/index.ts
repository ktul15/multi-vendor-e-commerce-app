export type DashboardRole = "ADMIN" | "VENDOR";

export type DashboardUser = Readonly<{
  avatar: null | string;
  email: string;
  id: string;
  name: string;
  role: "ADMIN" | "CUSTOMER" | "VENDOR";
}>;

export type SessionSummary = Readonly<{
  avatar: null | string;
  email: string;
  name: string;
  role: DashboardRole;
  userId: string;
}>;

export type SessionTokens = Readonly<{
  accessToken: string;
  refreshToken: string;
}>;

export type SessionCredentials = Readonly<{
  accessToken?: string;
  refreshToken?: string;
  sessionId?: string;
}>;

export type SessionResolution =
  | Readonly<{ kind: "authenticated"; session: SessionSummary; rotatedTokens?: SessionTokens }>
  | Readonly<{ kind: "forbidden"; actualRole: DashboardUser["role"] }>
  | Readonly<{ kind: "unauthenticated" }>;

export type DashboardCookieName = "access" | "csrf" | "refresh" | "session";

export type LoginCredentials = Readonly<{ email: string; password: string }>;

export type VendorRegistration = Readonly<{
  email: string;
  name: string;
  password: string;
  storeName: string;
}>;

export type AuthenticationResult = Readonly<{
  tokens: SessionTokens;
  user: DashboardUser;
}>;

export const SESSION_ERROR_HEADER = "X-Dashboard-Session-Error";

export type DashboardCookieNames = Readonly<Record<DashboardCookieName, string>>;

export type DashboardCookieWrite = Readonly<{
  name: string;
  options: Readonly<{
    httpOnly: boolean;
    maxAge?: number;
    path: "/";
    sameSite: "lax";
    secure: boolean;
  }>;
  value: string;
}>;

export class DashboardAuthError extends Error {
  readonly fieldErrors: readonly Readonly<{ field?: string; message: string }>[];
  readonly status: number;

  constructor(
    message: string,
    status: number,
    fieldErrors: readonly Readonly<{ field?: string; message: string }>[] = [],
  ) {
    super(message);
    this.name = "DashboardAuthError";
    this.fieldErrors = fieldErrors;
    this.status = status;
  }
}

export type DashboardSessionBackend = Readonly<{
  getProfile(accessToken: string, sessionId?: string): Promise<DashboardUser>;
  login(credentials: LoginCredentials): Promise<AuthenticationResult>;
  logout(refreshToken: string, sessionId?: string): Promise<void>;
  registerVendor(input: VendorRegistration): Promise<AuthenticationResult>;
  refresh(refreshToken: string, rotationKey?: string): Promise<SessionTokens>;
}>;

const TOKEN_EXPIRY_FALLBACK_SECONDS = 60 * 60;
const refreshFlights = new Map<string, Promise<SessionTokens>>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function decodeTokenLifetime(token: string): number {
  try {
    const payload = token.split(".")[1];
    if (!payload) return TOKEN_EXPIRY_FALLBACK_SECONDS;
    const normalized = payload.replaceAll("-", "+").replaceAll("_", "/");
    const decoded = JSON.parse(atob(normalized)) as unknown;
    if (!isRecord(decoded) || typeof decoded.exp !== "number") {
      return TOKEN_EXPIRY_FALLBACK_SECONDS;
    }
    return Math.max(0, Math.floor(decoded.exp - Date.now() / 1000));
  } catch {
    return TOKEN_EXPIRY_FALLBACK_SECONDS;
  }
}

function parseEnvelopeData(payload: unknown): unknown {
  if (!isRecord(payload) || payload.success !== true || !("data" in payload)) {
    throw new DashboardAuthError("Invalid authentication response", 502);
  }
  return payload.data;
}

async function parseError(response: Response): Promise<DashboardAuthError> {
  const payload = await response
    .clone()
    .json()
    .catch(() => undefined);
  const message =
    isRecord(payload) && typeof payload.message === "string"
      ? payload.message
      : "Authentication request failed";
  const fieldErrors =
    isRecord(payload) && Array.isArray(payload.errors)
      ? payload.errors.flatMap((entry) =>
          isRecord(entry) && typeof entry.message === "string"
            ? [
                {
                  field: typeof entry.field === "string" ? entry.field : undefined,
                  message: entry.message,
                },
              ]
            : [],
        )
      : [];
  return new DashboardAuthError(message, response.status, fieldErrors);
}

function parseUser(payload: unknown): DashboardUser {
  if (
    !isRecord(payload) ||
    typeof payload.id !== "string" ||
    typeof payload.name !== "string" ||
    typeof payload.email !== "string" ||
    !["ADMIN", "CUSTOMER", "VENDOR"].includes(String(payload.role)) ||
    !(payload.avatar === null || typeof payload.avatar === "string")
  ) {
    throw new DashboardAuthError("Invalid profile response", 502);
  }
  return {
    avatar: payload.avatar,
    email: payload.email,
    id: payload.id,
    name: payload.name,
    role: payload.role as DashboardUser["role"],
  };
}

function parseTokens(payload: unknown): SessionTokens {
  if (
    !isRecord(payload) ||
    typeof payload.accessToken !== "string" ||
    typeof payload.refreshToken !== "string"
  ) {
    throw new DashboardAuthError("Invalid refresh response", 502);
  }
  return { accessToken: payload.accessToken, refreshToken: payload.refreshToken };
}

function parseAuthenticationResult(payload: unknown): AuthenticationResult {
  const data = parseEnvelopeData(payload);
  if (!isRecord(data)) throw new DashboardAuthError("Invalid authentication response", 502);
  return { tokens: parseTokens(data.tokens), user: parseUser(data.user) };
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function createBffRateLimitHeaders({
  clientKey,
  dashboard,
  identity,
  method,
  pathname,
  secret,
}: Readonly<{
  clientKey: string | undefined;
  dashboard: "admin" | "vendor" | undefined;
  identity: string | undefined;
  method: string;
  pathname: string;
  secret: string | undefined;
}>): Promise<Record<string, string>> {
  if (!clientKey || !dashboard || !identity || !secret) return {};
  const clientIdentity = `client:${await sha256(clientKey)}`;
  const timestamp = Date.now().toString();
  const payload = `${timestamp}\n${method}\n${pathname}\n${dashboard}\n${clientIdentity}\n${identity}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const encoded = Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return {
    "X-Dashboard-BFF-Client": clientIdentity,
    "X-Dashboard-BFF-Identity": identity,
    "X-Dashboard-BFF-Signature": encoded,
    "X-Dashboard-BFF-Source": dashboard,
    "X-Dashboard-BFF-Timestamp": timestamp,
  };
}

export function createDashboardSessionBackend({
  apiBaseUrl,
  bffSecret,
  clientKey,
  dashboard,
  fetch = globalThis.fetch,
  timeoutMs = 5000,
}: Readonly<{
  apiBaseUrl: string;
  bffSecret?: string;
  clientKey?: string;
  dashboard?: "admin" | "vendor";
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}>): DashboardSessionBackend {
  const baseUrl = apiBaseUrl.replace(/\/$/, "");

  return {
    async getProfile(accessToken, sessionId) {
      const pathname = "/api/v1/auth/profile";
      const response = await fetch(`${baseUrl}/auth/profile`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(await createBffRateLimitHeaders({
            clientKey,
            dashboard,
            identity: sessionId ? `session:${sessionId}` : undefined,
            method: "GET",
            pathname,
            secret: bffSecret,
          })),
        },
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw await parseError(response);
      return parseUser(parseEnvelopeData(await response.json()));
    },
    async login(credentials) {
      const pathname = "/api/v1/auth/login";
      const response = await fetch(`${baseUrl}/auth/login`, {
        body: JSON.stringify(credentials),
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          ...(await createBffRateLimitHeaders({
            clientKey,
            dashboard,
            identity: `account:${await sha256(credentials.email.trim().toLowerCase())}`,
            method: "POST",
            pathname,
            secret: bffSecret,
          })),
        },
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw await parseError(response);
      return parseAuthenticationResult(await response.json());
    },
    async logout(refreshToken, sessionId) {
      const pathname = "/api/v1/auth/logout";
      const response = await fetch(`${baseUrl}/auth/logout`, {
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          ...(await createBffRateLimitHeaders({
            clientKey,
            dashboard,
            identity: sessionId ? `session:${sessionId}` : undefined,
            method: "POST",
            pathname,
            secret: bffSecret,
          })),
        },
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw await parseError(response);
    },
    async refresh(refreshToken, rotationKey) {
      const pathname = "/api/v1/auth/refresh";
      const response = await fetch(`${baseUrl}/auth/refresh`, {
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          ...(rotationKey ? { "X-Refresh-Rotation-Key": rotationKey } : {}),
          ...(await createBffRateLimitHeaders({
            clientKey,
            dashboard,
            identity: rotationKey ? `session:${rotationKey}` : undefined,
            method: "POST",
            pathname,
            secret: bffSecret,
          })),
        },
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw await parseError(response);
      return parseTokens(parseEnvelopeData(await response.json()));
    },
    async registerVendor(input) {
      const pathname = "/api/v1/auth/register";
      const response = await fetch(`${baseUrl}/auth/register`, {
        body: JSON.stringify({ ...input, role: "VENDOR" }),
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          ...(await createBffRateLimitHeaders({
            clientKey,
            dashboard,
            identity: `account:${await sha256(input.email.trim().toLowerCase())}`,
            method: "POST",
            pathname,
            secret: bffSecret,
          })),
        },
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw await parseError(response);
      return parseAuthenticationResult(await response.json());
    },
  };
}

export function dashboardCookieNames(dashboard: "admin" | "vendor"): DashboardCookieNames {
  return {
    access: `${dashboard}_access_token`,
    csrf: `${dashboard}_csrf_token`,
    refresh: `${dashboard}_refresh_token`,
    session: `${dashboard}_session_id`,
  };
}

export function createSessionCookieWrites({
  dashboard,
  secure,
  sessionId = crypto.randomUUID(),
  tokens,
}: Readonly<{
  dashboard: "admin" | "vendor";
  secure: boolean;
  sessionId?: string;
  tokens: SessionTokens;
}>): readonly DashboardCookieWrite[] {
  const names = dashboardCookieNames(dashboard);
  const common = { path: "/" as const, sameSite: "lax" as const, secure };
  const csrfToken = crypto.randomUUID();
  return [
    {
      name: names.access,
      options: {
        ...common,
        httpOnly: true,
        maxAge: decodeTokenLifetime(tokens.accessToken),
      },
      value: tokens.accessToken,
    },
    {
      name: names.refresh,
      options: {
        ...common,
        httpOnly: true,
        maxAge: decodeTokenLifetime(tokens.refreshToken),
      },
      value: tokens.refreshToken,
    },
    {
      name: names.csrf,
      options: {
        ...common,
        httpOnly: false,
        maxAge: decodeTokenLifetime(tokens.refreshToken),
      },
      value: csrfToken,
    },
    {
      name: names.session,
      options: {
        ...common,
        httpOnly: true,
        maxAge: decodeTokenLifetime(tokens.refreshToken),
      },
      value: sessionId,
    },
  ];
}

export function createClearedSessionCookieWrites(
  dashboard: "admin" | "vendor",
  secure: boolean,
): readonly DashboardCookieWrite[] {
  return Object.values(dashboardCookieNames(dashboard)).map((name) => ({
    name,
    options: {
      httpOnly: name.endsWith("csrf_token") === false,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure,
    },
    value: "",
  }));
}

export function safeReturnPath(value: null | string | undefined, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return fallback;
  }
  if (decoded.startsWith("//") || decoded.includes("\\") || /[\u0000-\u001f]/.test(decoded)) {
    return fallback;
  }
  const parsed = new URL(value, "https://dashboard.invalid");
  if (parsed.origin !== "https://dashboard.invalid") return fallback;
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function loginRedirectPath(returnTo: null | string | undefined): string {
  const safePath = postLoginReturnPath(returnTo);
  if (safePath === "/") return "/login";
  return `/login?returnTo=${encodeURIComponent(safePath)}`;
}

export function postLoginReturnPath(returnTo: null | string | undefined): string {
  const safePath = safeReturnPath(returnTo);
  return safePath === "/login" || safePath.startsWith("/login?") ? "/" : safePath;
}

export function logoutRedirectPath(): "/login" {
  return "/login";
}

export function isValidDashboardMutation({
  appOrigin,
  cookieToken,
  fetchSite,
  headerToken,
  origin,
}: Readonly<{
  appOrigin: string;
  cookieToken?: string;
  fetchSite?: string | null;
  headerToken?: string | null;
  origin?: string | null;
}>): boolean {
  if (!origin || origin !== new URL(appOrigin).origin) return false;
  if (fetchSite?.toLowerCase() === "cross-site") return false;
  if (!cookieToken || !headerToken || cookieToken.length !== headerToken.length) return false;
  let difference = 0;
  for (let index = 0; index < cookieToken.length; index += 1) {
    difference |= cookieToken.charCodeAt(index) ^ headerToken.charCodeAt(index);
  }
  return difference === 0;
}

export function isValidDashboardEntryMutation({
  appOrigin,
  fetchSite,
  origin,
}: Readonly<{
  appOrigin: string;
  fetchSite?: string | null;
  origin?: string | null;
}>): boolean {
  return origin === new URL(appOrigin).origin && fetchSite?.toLowerCase() !== "cross-site";
}

export async function refreshSingleFlight(
  sessionId: string,
  refresh: () => Promise<SessionTokens>,
): Promise<SessionTokens> {
  const existing = refreshFlights.get(sessionId);
  if (existing) return existing;

  const flight = refresh().finally(() => {
    if (refreshFlights.get(sessionId) === flight) refreshFlights.delete(sessionId);
  });
  refreshFlights.set(sessionId, flight);
  return flight;
}

function isUnrecoverable(error: unknown): boolean {
  return error instanceof DashboardAuthError && [400, 401, 403].includes(error.status);
}

function sessionFromUser(user: DashboardUser, requiredRole: DashboardRole): SessionResolution {
  if (user.role !== requiredRole) return { actualRole: user.role, kind: "forbidden" };
  return {
    kind: "authenticated",
    session: {
      avatar: user.avatar,
      email: user.email,
      name: user.name,
      role: requiredRole,
      userId: user.id,
    },
  };
}

export async function resolveDashboardSession({
  backend,
  credentials,
  requiredRole,
}: Readonly<{
  backend: DashboardSessionBackend;
  credentials: SessionCredentials;
  requiredRole: DashboardRole;
}>): Promise<SessionResolution> {
  let accessToken = credentials.accessToken;
  let rotatedTokens: SessionTokens | undefined;

  const rotate = async (): Promise<boolean> => {
    if (!credentials.refreshToken || !credentials.sessionId) return false;
    try {
      rotatedTokens = await refreshSingleFlight(credentials.sessionId, () =>
        backend.refresh(credentials.refreshToken as string, credentials.sessionId),
      );
      accessToken = rotatedTokens.accessToken;
      return true;
    } catch (error) {
      if (isUnrecoverable(error)) return false;
      throw error;
    }
  };

  if (!accessToken && !(await rotate())) return { kind: "unauthenticated" };

  let user: DashboardUser;
  try {
    user = await backend.getProfile(accessToken as string, credentials.sessionId);
  } catch (error) {
    if (!(error instanceof DashboardAuthError) || error.status !== 401 || !(await rotate())) {
      if (isUnrecoverable(error)) return { kind: "unauthenticated" };
      throw error;
    }
    try {
      user = await backend.getProfile(accessToken as string, credentials.sessionId);
    } catch (retryError) {
      if (isUnrecoverable(retryError)) return { kind: "unauthenticated" };
      throw retryError;
    }
  }

  const resolution = sessionFromUser(user, requiredRole);
  return resolution.kind === "authenticated" && rotatedTokens
    ? { ...resolution, rotatedTokens }
    : resolution;
}

export async function verifyDashboardSession({
  accessToken,
  backend,
  requiredRole,
}: Readonly<{
  accessToken?: string;
  backend: DashboardSessionBackend;
  requiredRole: DashboardRole;
}>): Promise<SessionResolution> {
  if (!accessToken) return { kind: "unauthenticated" };
  try {
    return sessionFromUser(await backend.getProfile(accessToken), requiredRole);
  } catch (error) {
    if (isUnrecoverable(error)) return { kind: "unauthenticated" };
    throw error;
  }
}
