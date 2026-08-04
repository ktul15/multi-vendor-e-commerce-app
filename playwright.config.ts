import { defineConfig, devices } from "@playwright/test";

const ci = Boolean(process.env.CI);

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
  webServer: [
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
  ],
});
