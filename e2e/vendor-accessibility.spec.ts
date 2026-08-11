import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

const password = "password123";
const approvedVendor = { email: "victor.vendor@example.com", password } as const;
const lifecycleVendors = [
  ["vera.vendor@example.com", "Your application is under review"],
  ["riley.vendor@example.com", "Your vendor application was rejected"],
  ["nina.vendor@example.com", "Your store access is paused"],
] as const;
const criticalRoutes = [
  ["/", "Dashboard"],
  ["/products", "Products"],
  ["/products/new", "Add product"],
  ["/orders", "Orders"],
  ["/earnings", "Earnings"],
  ["/store", "Store profile"],
] as const;

async function login(
  page: Page,
  account: Readonly<{ email: string; password: string }> = approvedVendor,
  expectedPath: RegExp = /\/$/,
) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email address" }).fill(account.email);
  await page.getByLabel(/^Password/).fill(account.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(expectedPath);
}

async function expectNoAccessibilityViolations(page: Page, context: string) {
  await expect(page).toHaveTitle(/\S+/);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const summary = results.violations.map((violation) => ({
    help: violation.help,
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.map((node) => ({ failure: node.failureSummary, target: node.target })),
  }));
  expect(results.violations, `${context}: ${JSON.stringify(summary, null, 2)}`).toEqual([]);
}

async function tabTo(page: Page, target: Locator, maximumTabs = 30) {
  for (let count = 0; count < maximumTabs; count += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error(`Unable to reach ${await target.getAttribute("aria-label")} by keyboard`);
}

test.describe("vendor accessibility", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!testInfo.project.name.startsWith("vendor"), "Vendor-only suite");
  });

  test("public authentication pages pass automated WCAG checks", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
    await expectNoAccessibilityViolations(page, "vendor login");

    await page.goto("/login?mode=register");
    await expect(page.getByRole("button", { name: "Create vendor account" })).toBeEnabled();
    await expectNoAccessibilityViolations(page, "vendor registration");
  });

  test("approved vendor critical pages pass automated WCAG checks", async ({ page }) => {
    await login(page);
    for (const [route, heading] of criticalRoutes) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expectNoAccessibilityViolations(page, route);
    }
  });

  test("restricted lifecycle pages pass automated WCAG checks", async ({ page }) => {
    for (const [email, heading] of lifecycleVendors) {
      await page.context().clearCookies();
      await login(page, { email, password }, /\/access$/);
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      await expectNoAccessibilityViolations(page, email);
    }
  });

  test("sign-in, responsive navigation, account menu, and dialogs are keyboard operable", async ({
    page,
  }) => {
    await page.setViewportSize({ height: 1024, width: 768 });
    await page.goto("/login");
    const email = page.getByRole("textbox", { name: "Email address" });
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
    await tabTo(page, email);
    await page.keyboard.type(approvedVendor.email);
    await page.keyboard.press("Tab");
    await expect(page.getByLabel(/^Password/)).toBeFocused();
    await page.keyboard.type(approvedVendor.password);
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
    await expectNoAccessibilityViolations(page, "tablet navigation drawer");
    await page.keyboard.press("Shift+Tab");
    const activeAfterReverseTab = await page.evaluate(
      () => document.activeElement?.outerHTML ?? "No active element",
    );
    expect(
      await drawer.evaluate((element) => element.contains(document.activeElement)),
      activeAfterReverseTab,
    ).toBe(true);
    const productsLink = drawer.getByRole("link", { name: "Products", exact: true });
    await tabTo(page, productsLink);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/products$/);
    await expect(drawer).toBeHidden();

    const accountButton = page.getByRole("button", { name: /Victor Approved Vendor/ });
    await tabTo(page, accountButton);
    await page.keyboard.press("Enter");
    const signOut = page.getByRole("button", { name: "Sign out" });
    await tabTo(page, signOut);
    await page.keyboard.press("Escape");
    await expect(signOut).toHaveCount(0);
    await expect(accountButton).toBeFocused();

    await page.goto("/products/new");
    const category = page.getByRole("combobox", { name: /Category/ });
    await tabTo(page, category);
    await page.keyboard.type("QA_CAT_REALWORLD_Phones");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(category).toHaveValue(/QA_CAT_REALWORLD_Phones/);

    await page.goto("/products");
    const deleteButton = page.getByRole("button", { name: /^Delete / }).first();
    await tabTo(page, deleteButton);
    await page.keyboard.press("Enter");
    const deleteDialog = page.getByRole("dialog", { name: "Delete product" });
    await expect(deleteDialog).toBeVisible();
    await expect(deleteDialog.getByRole("button", { name: "Close dialog" })).toBeFocused();
    await expectNoAccessibilityViolations(page, "delete product dialog");
    await page.keyboard.press("Shift+Tab");
    const confirmDelete = deleteDialog.getByRole("button", { name: "Delete product" });
    await expect(confirmDelete).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(deleteDialog.getByRole("button", { name: "Close dialog" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(deleteDialog.getByRole("button", { name: "Cancel" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(confirmDelete).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(deleteDialog).toBeHidden();
    await expect(deleteButton).toBeFocused();

    await page.goto("/orders");
    const orderAction = page
      .getByRole("button", {
        name: /Confirm order|Start processing|Mark delivered/,
      })
      .first();
    const orderActionName = (await orderAction.textContent())?.trim();
    expect(orderActionName).toBeTruthy();
    await tabTo(page, orderAction);
    await page.keyboard.press("Enter");
    const orderDialog = page.getByRole("dialog");
    await expect(orderDialog).toBeVisible();
    await expect(orderDialog.getByRole("button", { name: "Close dialog" })).toBeFocused();
    await expectNoAccessibilityViolations(page, "order status dialog");
    const cancelOrderAction = orderDialog.getByRole("button", { name: "Cancel" });
    await tabTo(page, cancelOrderAction);
    await expect(cancelOrderAction).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      orderDialog.getByRole("button", { name: orderActionName!, exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(orderDialog).toBeHidden();
    await expect(orderAction).toBeFocused();
  });

  test("validation errors are labelled and move focus to the first invalid field", async ({
    page,
  }) => {
    await page.goto("/login?mode=register");
    const submit = page.getByRole("button", { name: "Create vendor account" });
    await expect(submit).toBeEnabled();
    await tabTo(page, submit);
    await page.keyboard.press("Enter");

    const name = page.getByRole("textbox", { name: "Your name" });
    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute("aria-invalid", "true");
    const descriptionId = await name.getAttribute("aria-describedby");
    expect(descriptionId).toBeTruthy();
    await expect(page.locator(`#${descriptionId}`)).toHaveText(/at least 2 characters/i);
    await expectNoAccessibilityViolations(page, "registration validation errors");
  });
});
