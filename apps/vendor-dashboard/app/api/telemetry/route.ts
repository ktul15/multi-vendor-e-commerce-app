import { createClientTelemetryRoute } from "@repo/observability";

export const POST = createClientTelemetryRoute({
  app: "vendor",
  appOrigin: process.env.NEXT_PUBLIC_APP_URL,
  environment: process.env.DASHBOARD_ENVIRONMENT ?? process.env.NODE_ENV,
  release:
    process.env.DASHBOARD_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA,
});
