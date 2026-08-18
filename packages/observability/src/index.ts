export type DashboardApp = "admin" | "vendor";
export type TelemetryCategory = "api" | "auth" | "mutation" | "render" | "upload";
export type TelemetryRuntime = "client" | "edge" | "server";
export type TelemetrySeverity = "error" | "warning";

export type TelemetryEvent = Readonly<{
  category: TelemetryCategory;
  error?: unknown;
  operation: string;
  requestId?: string;
  route: string;
  runtime: TelemetryRuntime;
  severity?: TelemetrySeverity;
  status?: number;
}>;

export type TelemetryRecord = Readonly<{
  app: DashboardApp;
  category: TelemetryCategory;
  environment: string;
  error?: Readonly<{ digest?: string; message: string; name: string }>;
  event: "dashboard.error";
  operation: string;
  release: string;
  requestId?: string;
  route: string;
  runtime: TelemetryRuntime;
  severity: TelemetrySeverity;
  status?: number;
  timestamp: string;
}>;

const categories = new Set<TelemetryCategory>(["api", "auth", "mutation", "render", "upload"]);
const sensitiveHeader = /\b(set-cookie|authorization|cookie)\s*:\s*[^\r\n]*/gi;
const authorizationAssignment = /\bauthorization\s*=\s*(?:Bearer\s+)?[^\s,;&]+/gi;
const sensitiveAssignment =
  /\b(authorization|cookie|set-cookie|password|secret|token|api[_-]?key|card|cvc|cvv)\s*[:=]\s*[^\s,;&]+/gi;
const bearerToken = /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi;
const jwtToken = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const emailAddress = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const paymentNumber = /\b(?:\d[ -]*?){13,19}\b/g;
const uuidSegment =
  /\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?=\/|$)/gi;
const numericSegment = /\/\d+(?=\/|$)/g;

function safeText(value: string, maximum = 240): string {
  return value
    .replace(sensitiveHeader, "$1: [REDACTED]")
    .replace(authorizationAssignment, "authorization=[REDACTED]")
    .replace(sensitiveAssignment, "$1=[REDACTED]")
    .replace(bearerToken, "Bearer [REDACTED]")
    .replace(jwtToken, "[REDACTED_TOKEN]")
    .replace(emailAddress, "[REDACTED_EMAIL]")
    .replace(paymentNumber, "[REDACTED_PAYMENT]")
    .replaceAll(/[\r\n\t]/g, " ")
    .slice(0, maximum);
}

export function sanitizeRoute(value: string): string {
  let pathname: string;
  try {
    pathname = new URL(value, "https://telemetry.invalid").pathname;
  } catch {
    pathname = value.split(/[?#]/, 1)[0] || "/unknown";
  }
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return safeText(normalized.replace(uuidSegment, "/[id]").replace(numericSegment, "/[id]"));
}

function safeLabel(value: string | undefined, fallback: string): string {
  const normalized = value?.trim();
  if (!normalized || !/^[a-zA-Z0-9._/-]{1,100}$/.test(normalized)) return fallback;
  return normalized;
}

function serializedError(error: unknown): TelemetryRecord["error"] | undefined {
  if (error === undefined || error === null) return undefined;
  if (error instanceof Error) {
    const digest =
      "digest" in error && typeof error.digest === "string"
        ? safeText(error.digest, 100)
        : undefined;
    return {
      ...(digest ? { digest } : {}),
      message: safeText(error.message || "Unexpected error"),
      name: safeText(error.name || "Error", 80),
    };
  }
  return { message: safeText(String(error)), name: "UnknownError" };
}

export function createServerTelemetry({
  app,
  environment,
  now = () => new Date(),
  release,
  write = (record) => console.error(JSON.stringify(record)),
}: Readonly<{
  app: DashboardApp;
  environment?: string;
  now?: () => Date;
  release?: string;
  write?: (record: TelemetryRecord) => void;
}>) {
  const context = {
    app,
    environment: safeLabel(environment, "unknown"),
    release: safeLabel(release, "local"),
  } as const;

  return {
    capture(event: TelemetryEvent): TelemetryRecord {
      const status =
        typeof event.status === "number" && Number.isInteger(event.status)
          ? Math.min(599, Math.max(100, event.status))
          : undefined;
      const record: TelemetryRecord = {
        ...context,
        category: event.category,
        ...(event.error ? { error: serializedError(event.error) } : {}),
        event: "dashboard.error",
        operation: safeText(event.operation, 120),
        ...(event.requestId ? { requestId: safeLabel(event.requestId, "invalid-request-id") } : {}),
        route: sanitizeRoute(event.route),
        runtime: event.runtime,
        severity: event.severity ?? (status !== undefined && status < 500 ? "warning" : "error"),
        ...(status !== undefined ? { status } : {}),
        timestamp: now().toISOString(),
      };
      write(record);
      return record;
    },
  } as const;
}

type ClientTelemetryEvent = Readonly<{
  category: TelemetryCategory;
  error?: Readonly<{ message?: string; name?: string }>;
  operation: string;
  requestId?: string;
  route: string;
  status?: number;
}>;

function parseClientEvent(value: unknown): ClientTelemetryEvent | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.category !== "string" ||
    !categories.has(candidate.category as TelemetryCategory) ||
    typeof candidate.operation !== "string" ||
    typeof candidate.route !== "string"
  ) {
    return undefined;
  }
  const status =
    typeof candidate.status === "number" && Number.isInteger(candidate.status)
      ? candidate.status
      : undefined;
  const requestId = typeof candidate.requestId === "string" ? candidate.requestId : undefined;
  const rawError =
    typeof candidate.error === "object" && candidate.error !== null
      ? (candidate.error as Record<string, unknown>)
      : undefined;
  const error = rawError
    ? {
        message: typeof rawError.message === "string" ? rawError.message : undefined,
        name: typeof rawError.name === "string" ? rawError.name : undefined,
      }
    : undefined;
  return {
    category: candidate.category as TelemetryCategory,
    ...(error ? { error } : {}),
    operation: candidate.operation,
    ...(requestId ? { requestId } : {}),
    route: candidate.route,
    ...(status !== undefined ? { status } : {}),
  };
}

export function createClientTelemetryRoute({
  app,
  appOrigin,
  environment,
  release,
  write,
}: Readonly<{
  app: DashboardApp;
  appOrigin: string | undefined;
  environment?: string;
  release?: string;
  write?: (record: TelemetryRecord) => void;
}>) {
  const telemetry = createServerTelemetry({ app, environment, release, write });
  return async (request: Request): Promise<Response> => {
    const configuredOrigin = appOrigin?.trim();
    const origin = request.headers.get("Origin");
    const fetchSite = request.headers.get("Sec-Fetch-Site");
    if (!configuredOrigin || origin !== configuredOrigin || fetchSite === "cross-site") {
      return Response.json(
        { success: false, message: "Invalid telemetry origin" },
        { status: 403 },
      );
    }
    const declaredLength = Number(request.headers.get("Content-Length") ?? "0");
    if (Number.isFinite(declaredLength) && declaredLength > 16_384) {
      return Response.json(
        { success: false, message: "Telemetry payload too large" },
        { status: 413 },
      );
    }
    const text = await request.text();
    if (text.length > 16_384) {
      return Response.json(
        { success: false, message: "Telemetry payload too large" },
        { status: 413 },
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return Response.json(
        { success: false, message: "Invalid telemetry payload" },
        { status: 400 },
      );
    }
    const event = parseClientEvent(parsed);
    if (!event) {
      return Response.json(
        { success: false, message: "Invalid telemetry payload" },
        { status: 400 },
      );
    }
    telemetry.capture({
      ...event,
      error: event.error
        ? Object.assign(new Error(event.error.message || "Client error"), {
            name: event.error.name || "Error",
          })
        : undefined,
      runtime: "client",
    });
    return new Response(null, { status: 202 });
  };
}

function requestCategory(request: Request): TelemetryCategory {
  const path = new URL(request.url).pathname;
  if (path.startsWith("/api/auth/") || path.includes("/auth/")) return "auth";
  if (request.headers.get("Content-Type")?.toLowerCase().startsWith("multipart/form-data")) {
    return "upload";
  }
  return ["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase()) ? "api" : "mutation";
}

function isWithinApiBase(url: URL, apiBase: URL): boolean {
  const basePath = apiBase.pathname.replace(/\/$/, "");
  return (
    url.origin === apiBase.origin &&
    (url.pathname === basePath || url.pathname.startsWith(`${basePath}/`))
  );
}

export function createObservedServerFetch({
  apiBaseUrl,
  fetch,
  report,
  requestId = browserRequestId,
  runtime = "server",
}: Readonly<{
  apiBaseUrl: string;
  fetch: typeof globalThis.fetch;
  report: (event: TelemetryEvent) => void;
  requestId?: () => string;
  runtime?: Extract<TelemetryRuntime, "edge" | "server">;
}>): typeof globalThis.fetch {
  const apiBase = new URL(apiBaseUrl);
  return async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (!isWithinApiBase(url, apiBase)) return fetch(input, init);

    const headers = new Headers(request.headers);
    const correlationId = headers.get("X-Dashboard-Request-ID") ?? requestId();
    headers.set("X-Dashboard-Request-ID", correlationId);
    const observedRequest = new Request(request, { headers });
    const category = requestCategory(observedRequest);
    const route = sanitizeRoute(url.pathname);
    const operation = `${observedRequest.method.toUpperCase()} ${route}`;
    try {
      const response = await fetch(observedRequest);
      if (!response.ok) {
        report({
          category,
          error: new Error(`HTTP ${response.status}`),
          operation,
          requestId: response.headers.get("X-Dashboard-Request-ID") ?? correlationId,
          route,
          runtime,
          status: response.status,
        });
      }
      return response;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      report({
        category,
        error,
        operation,
        requestId: correlationId,
        route,
        runtime,
      });
      throw error;
    }
  };
}

const serverInstalledKey = Symbol.for("dashboard.server.fetch.telemetry.installed");

export function installServerFetchTelemetry({
  apiBaseUrl,
  report,
  runtime,
}: Readonly<{
  apiBaseUrl: string | undefined;
  report: (event: TelemetryEvent) => void;
  runtime: Extract<TelemetryRuntime, "edge" | "server">;
}>): void {
  if (!apiBaseUrl) return;
  const state = globalThis as typeof globalThis & { [serverInstalledKey]?: boolean };
  if (state[serverInstalledKey]) return;
  state[serverInstalledKey] = true;
  globalThis.fetch = createObservedServerFetch({
    apiBaseUrl,
    fetch: globalThis.fetch.bind(globalThis),
    report,
    runtime,
  });
}

function isExpectedAuthenticationBoundary(request: Request, response: Response): boolean {
  return (
    request.method.toUpperCase() === "GET" &&
    new URL(request.url).pathname === "/api/auth/session" &&
    response.status === 401
  );
}

function browserRequestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `web-${Date.now().toString(36)}`;
}

export function createObservedFetch({
  currentRoute,
  fetch,
  origin,
  report,
  requestId = browserRequestId,
}: Readonly<{
  currentRoute: () => string;
  fetch: typeof globalThis.fetch;
  origin: string;
  report: (event: ClientTelemetryEvent) => void;
  requestId?: () => string;
}>): typeof globalThis.fetch {
  return async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url, origin);
    if (
      url.origin !== origin ||
      !url.pathname.startsWith("/api/") ||
      url.pathname === "/api/telemetry"
    ) {
      return fetch(input, init);
    }
    const headers = new Headers(request.headers);
    const correlationId = headers.get("X-Dashboard-Request-ID") ?? requestId();
    headers.set("X-Dashboard-Request-ID", correlationId);
    const observedRequest = new Request(request, { headers });
    const category = requestCategory(observedRequest);
    const operation = `${observedRequest.method.toUpperCase()} ${sanitizeRoute(url.pathname)}`;
    try {
      const response = await fetch(observedRequest);
      if (!response.ok && !isExpectedAuthenticationBoundary(observedRequest, response)) {
        report({
          category,
          error: { message: `HTTP ${response.status}`, name: "ApiResponseError" },
          operation,
          requestId: response.headers.get("X-Dashboard-Request-ID") ?? correlationId,
          route: currentRoute(),
          status: response.status,
        });
      }
      return response;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      report({
        category,
        error: {
          message: error instanceof Error ? error.message : "Network request failed",
          name: error instanceof Error ? error.name : "NetworkError",
        },
        operation,
        requestId: correlationId,
        route: currentRoute(),
      });
      throw error;
    }
  };
}

function sendClientEvent(event: ClientTelemetryEvent): void {
  void globalThis
    .fetch("/api/telemetry", {
      body: JSON.stringify(event),
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      method: "POST",
    })
    .catch(() => undefined);
}

const installedKey = Symbol.for("dashboard.client.telemetry.installed");

export function installClientTelemetry(): void {
  if (typeof window === "undefined") return;
  const state = window as typeof window & { [installedKey]?: boolean };
  if (state[installedKey]) return;
  state[installedKey] = true;
  const nativeFetch = window.fetch.bind(window);
  window.fetch = createObservedFetch({
    currentRoute: () => window.location.pathname,
    fetch: nativeFetch,
    origin: window.location.origin,
    report: sendClientEvent,
  });
  window.addEventListener("error", (event) => {
    sendClientEvent({
      category: "render",
      error: {
        message: event.error instanceof Error ? event.error.message : event.message,
        name: event.error instanceof Error ? event.error.name : "WindowError",
      },
      operation: "window.error",
      route: window.location.pathname,
    });
  });
  window.addEventListener("unhandledrejection", (event) => {
    sendClientEvent({
      category: "render",
      error: {
        message: event.reason instanceof Error ? event.reason.message : String(event.reason),
        name: event.reason instanceof Error ? event.reason.name : "UnhandledRejection",
      },
      operation: "window.unhandledrejection",
      route: window.location.pathname,
    });
  });
}

export function reportClientRenderError(error: unknown, operation = "react.error-boundary"): void {
  if (typeof window === "undefined") return;
  sendClientEvent({
    category: "render",
    error: {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : "UnknownError",
    },
    operation,
    route: window.location.pathname,
  });
}
