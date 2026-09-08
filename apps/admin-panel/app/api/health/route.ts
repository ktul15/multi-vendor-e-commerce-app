import { createDashboardHealthResponse } from "@repo/observability";

export const dynamic = "force-dynamic";

export function GET() {
  return createDashboardHealthResponse({
    app: "admin",
    environment: process.env.DASHBOARD_ENVIRONMENT ?? process.env.VERCEL_TARGET_ENV,
    release:
      process.env.DASHBOARD_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA,
  });
}
