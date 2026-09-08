import { expect, test } from "@playwright/test";

test("each dashboard exposes its public login boundary", async ({ page }, testInfo) => {
  await page.goto("/login");

  await expect(
    page.getByRole("heading", {
      level: testInfo.project.name.startsWith("vendor") ? 1 : 2,
      name: testInfo.project.name.startsWith("vendor")
        ? "Run your storefront with confidence."
        : "Sign in",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(testInfo.project.name.startsWith("vendor") ? "Vendor Hub" : "Admin Console"),
  ).toBeVisible();
});

test("vendor login handles API errors and preserves a safe return URL", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("vendor"), "Vendor-only flow");
  const telemetryEvents: unknown[] = [];
  await page.route("**/api/telemetry", async (route) => {
    telemetryEvents.push(route.request().postDataJSON());
    await route.fulfill({ status: 202 });
  });
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ body: JSON.stringify({ success: false }), status: 401 }),
  );
  await page.route("**/api/auth/login", async (route) => {
    const body = route.request().postDataJSON() as { email?: string };
    if (body.email === "wrong@example.com") {
      await route.fulfill({
        body: JSON.stringify({ message: "Invalid email or password", success: false }),
        contentType: "application/json",
        status: 401,
      });
      return;
    }
    await route.fulfill({
      body: JSON.stringify({ success: true }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.goto("/login?returnTo=%2Fdesign-system");

  await page.getByRole("textbox", { name: "Email address" }).fill("wrong@example.com");
  await page.getByLabel(/^Password/).fill("secret123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Invalid email or password", { exact: true })).toBeVisible();
  const loginEvents = () =>
    telemetryEvents.filter(
      (event): event is Record<string, unknown> =>
        typeof event === "object" &&
        event !== null &&
        (event as Record<string, unknown>).operation === "POST /api/auth/login",
    );
  await expect.poll(() => loginEvents().length).toBe(1);
  expect(loginEvents()[0]).toMatchObject({
    category: "auth",
    operation: "POST /api/auth/login",
    route: "/login",
    status: 401,
  });
  expect(JSON.stringify(loginEvents()[0])).not.toMatch(/wrong@example\.com|secret123/);

  await page.getByRole("textbox", { name: "Email address" }).fill("vendor@example.com");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/design-system$/);
});
