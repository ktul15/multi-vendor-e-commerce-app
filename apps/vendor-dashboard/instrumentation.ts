import { createServerTelemetry, installServerFetchTelemetry } from "@repo/observability";
import type { Instrumentation } from "next";

const telemetry = createServerTelemetry({
  app: "vendor",
  environment: process.env.DASHBOARD_ENVIRONMENT ?? process.env.NODE_ENV,
  release:
    process.env.DASHBOARD_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA,
});
const runtime = process.env.NEXT_RUNTIME === "edge" ? "edge" : "server";

export function register(): void {
  installServerFetchTelemetry({
    apiBaseUrl: process.env.API_BASE_URL,
    report: telemetry.capture,
    runtime,
  });
}

function requestId(
  headers: Record<string, string | readonly string[] | undefined>,
): string | undefined {
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() !== "x-dashboard-request-id") continue;
    return typeof value === "string" ? value : value?.[0];
  }
  return undefined;
}

export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  telemetry.capture({
    category: context.routeType === "route" ? "api" : "render",
    error,
    operation: `${request.method} ${context.routeType}`,
    requestId: requestId(request.headers),
    route: context.routePath || request.path,
    runtime,
  });
};
