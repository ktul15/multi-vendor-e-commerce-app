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
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DashboardAuthError";
    this.status = status;
  }
}

export type DashboardSessionBackend = Readonly<{
  getProfile(accessToken: string): Promise<DashboardUser>;
  logout(refreshToken: string): Promise<void>;
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
  return new DashboardAuthError(message, response.status);
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

export function createDashboardSessionBackend({
  apiBaseUrl,
  fetch = globalThis.fetch,
  timeoutMs = 5000,
}: Readonly<{
  apiBaseUrl: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}>): DashboardSessionBackend {
  const baseUrl = apiBaseUrl.replace(/\/$/, "");

  return {
    async getProfile(accessToken) {
      const response = await fetch(`${baseUrl}/auth/profile`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${accessToken}` },
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw await parseError(response);
      return parseUser(parseEnvelopeData(await response.json()));
    },
    async logout(refreshToken) {
      const response = await fetch(`${baseUrl}/auth/logout`, {
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw await parseError(response);
    },
    async refresh(refreshToken, rotationKey) {
      const response = await fetch(`${baseUrl}/auth/refresh`, {
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          ...(rotationKey ? { "X-Refresh-Rotation-Key": rotationKey } : {}),
        },
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw await parseError(response);
      return parseTokens(parseEnvelopeData(await response.json()));
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
  const safePath = safeReturnPath(returnTo);
  if (safePath === "/login" || safePath.startsWith("/login?")) return "/login";
  return `/login?returnTo=${encodeURIComponent(safePath)}`;
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
    user = await backend.getProfile(accessToken as string);
  } catch (error) {
    if (!(error instanceof DashboardAuthError) || error.status !== 401 || !(await rotate())) {
      if (isUnrecoverable(error)) return { kind: "unauthenticated" };
      throw error;
    }
    try {
      user = await backend.getProfile(accessToken as string);
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
