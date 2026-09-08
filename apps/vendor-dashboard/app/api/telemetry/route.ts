import { createClientTelemetryRoute } from "@repo/observability";
import { dashboardAppOrigin } from "../../../src/lib/session";

export const POST = createClientTelemetryRoute({
  app: "vendor",
  appOrigin: dashboardAppOrigin(),
  environment: process.env.DASHBOARD_ENVIRONMENT ?? process.env.NODE_ENV,
  release:
    process.env.DASHBOARD_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA,
});
