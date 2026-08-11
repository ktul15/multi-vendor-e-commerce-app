import { defineConfig, devices } from "@playwright/test";

const ci = Boolean(process.env.CI);
const startBackend = process.env.PLAYWRIGHT_START_BACKEND === "1";

const dashboardServers = [
  {
    command: "pnpm --filter @repo/vendor-dashboard dev",
    env: {
      API_BASE_URL: "http://127.0.0.1:5000/api/v1",
      NEXT_PUBLIC_APP_URL: "http://localhost:3001",
    },
    reuseExistingServer: !ci,
    timeout: 120_000,
    url: "http://localhost:3001/login",
  },
  {
    command: "pnpm --filter @repo/admin-panel dev",
    env: {
      API_BASE_URL: "http://127.0.0.1:5000/api/v1",
      NEXT_PUBLIC_APP_URL: "http://localhost:3002",
    },
    reuseExistingServer: !ci,
    timeout: 120_000,
    url: "http://localhost:3002/login",
  },
];

const webServer = startBackend
  ? [
      {
        command: "npm --prefix backend run dev",
        env: {
          DASHBOARD_BFF_SECRET: process.env.DASHBOARD_BFF_SECRET ?? "issue-99-e2e-bff-secret",
          DATABASE_URL: process.env.DATABASE_URL ?? "",
          JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? "issue-99-e2e-access-secret",
          JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? "issue-99-e2e-refresh-secret",
          NODE_ENV: "test",
          REDIS_URL: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
        },
        reuseExistingServer: !ci,
        timeout: 120_000,
        url: "http://127.0.0.1:5000/api/health",
      },
      ...dashboardServers,
    ]
  : dashboardServers;

export default defineConfig({
  expect: { timeout: 5_000 },
  forbidOnly: ci,
  fullyParallel: true,
  outputDir: "test-results/playwright",
  projects: [
    {
      name: "vendor-chromium",
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3001" },
    },
    {
      name: "admin-chromium",
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3002" },
    },
  ],
  reporter: ci ? [["github"], ["html", { open: "never" }]] : "list",
  retries: ci ? 2 : 0,
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  webServer,
});
