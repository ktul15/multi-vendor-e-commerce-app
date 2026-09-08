import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { expectNoAccessibilityViolations, tabTo } from "./accessibility-helpers";

const admin = {
  email: "alice.admin@example.com",
  name: "Alice Admin",
  password: "admin123",
} as const;

const criticalRoutes = [
  ["/", "Overview", "Overview | Admin Panel"],
  ["/categories", "Categories", "Categories | Admin Panel"],
  ["/users", "Users", "Users | Admin Panel"],
  ["/vendors", "Vendors", "Vendors | Admin Panel"],
  ["/products", "Products", "Products | Admin Panel"],
  ["/orders", "Orders", "Orders | Admin Panel"],
  ["/finance", "Revenue and payouts", "Revenue and payouts | Admin Panel"],
  ["/banners", "Banners", "Banners | Admin Panel"],
  ["/promos", "Promo codes", "Promo codes | Admin Panel"],
  ["/banners/new", "Create banner", "Create banner | Admin Panel"],
  ["/promos/new", "Create promo code", "Create promo code | Admin Panel"],
] as const;

async function login(page: Page) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email address" }).fill(admin.email);
  await page.getByLabel(/^Password/).fill(admin.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
}

test.describe("admin accessibility", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!testInfo.project.name.startsWith("admin"), "Admin-only suite");
  });

  test("public authentication page passes automated WCAG checks", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
    await expect(page).toHaveTitle("Sign in | Admin Panel");
    await expectNoAccessibilityViolations(page, "admin login");
  });

  test("critical admin pages pass automated WCAG checks", async ({ page }) => {
    await login(page);
    for (const [route, heading, title] of criticalRoutes) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page).toHaveTitle(title);
      await expectNoAccessibilityViolations(page, route);
    }
  });

  test("sign-in, responsive navigation, account menu, tables, and dialogs are keyboard operable", async ({
    page,
  }) => {
    await page.setViewportSize({ height: 1024, width: 768 });
    await page.goto("/login");
    const email = page.getByRole("textbox", { name: "Email address" });
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
    await tabTo(page, email);
    await page.keyboard.type(admin.email);
    await page.keyboard.press("Tab");
    await expect(page.getByLabel(/^Password/)).toBeFocused();
    await page.keyboard.type(admin.password);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Show password" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Sign in" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/$/);

    const menuButton = page.getByRole("button", { name: "Open navigation" });
    await tabTo(page, menuButton);
    await expect(menuButton).toHaveCSS("outline-style", "solid");
    await page.keyboard.press("Enter");
    const drawer = page.getByRole("dialog", { name: "Navigation" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("button", { name: "Close dialog" })).toBeFocused();
    await expectNoAccessibilityViolations(page, "admin tablet navigation drawer");
    const usersLink = drawer.getByRole("link", { name: "Users", exact: true });
    await tabTo(page, usersLink);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/users$/);
    await expect(drawer).toBeHidden();

    const usersTable = page.getByRole("region", { name: "Admin users table" });
    await tabTo(page, usersTable);
    await expect(usersTable).toBeFocused();

    const statusButton = page.getByRole("button", { name: /^(Ban|Unban)$/ }).first();
    await tabTo(page, statusButton);
    await page.keyboard.press("Enter");
    const statusDialog = page.getByRole("dialog", { name: /^(Ban|Unban) .+\?$/ });
    await expect(statusDialog).toBeVisible();
    await expect(statusDialog.getByRole("button", { name: "Close dialog" })).toBeFocused();
    await expectNoAccessibilityViolations(page, "admin user status dialog");
    await page.keyboard.press("Shift+Tab");
    await expect(statusDialog.getByRole("button", { name: /^Confirm (ban|unban)$/ })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(statusDialog.getByRole("button", { name: "Close dialog" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(statusDialog).toBeHidden();
    await expect(statusButton).toBeFocused();

    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Users" })).toBeVisible();
    const accountButton = page.getByRole("button", { name: new RegExp(admin.name) });
    await tabTo(page, accountButton);
    await page.keyboard.press("Enter");
    const signOut = page.getByRole("button", { name: "Sign out" });
    await tabTo(page, signOut);
    await page.keyboard.press("Escape");
    await expect(signOut).toHaveCount(0);
    await expect(accountButton).toBeFocused();
  });

  test("validation errors are labelled and move focus to the first invalid field", async ({
    page,
  }) => {
    await page.goto("/login");
    const submit = page.getByRole("button", { name: "Sign in" });
    await expect(submit).toBeEnabled();
    await tabTo(page, submit);
    await page.keyboard.press("Enter");

    const email = page.getByRole("textbox", { name: "Email address" });
    await expect(email).toBeFocused();
    await expect(email).toHaveAttribute("aria-invalid", "true");
    const descriptionId = await email.getAttribute("aria-describedby");
    expect(descriptionId).toBeTruthy();
    await expect(page.locator(`#${descriptionId}`)).toHaveText(/valid email address/i);
    await expectNoAccessibilityViolations(page, "admin login validation errors");
  });

  test("charts and status colors expose nonvisual alternatives", async ({ page }) => {
    await login(page);
    await expect(
      page.getByRole("img", { name: /Gross merchandise value over time/ }),
    ).toBeVisible();
    await expect(page.locator(".admin-chart .ui-visually-hidden li").first()).toContainText(
      /orders/,
    );

    await page.goto("/users");
    const firstRow = page.getByRole("row").nth(1);
    await expect(firstRow.getByText(/^(ADMIN|CUSTOMER|VENDOR)$/)).toBeVisible();
    await expect(firstRow.getByText(/^(Verified|Unverified)$/)).toBeVisible();
    await expect(firstRow.getByText(/^(Active|Banned)$/)).toBeVisible();
  });
});
