import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

const approvedVendor = {
  email: "victor.vendor@example.com",
  name: "Victor Approved Vendor",
  password: "password123",
} as const;

const orderVendors = [
  {
    email: "olivia.vendor@example.com",
    name: "Olivia Approved Vendor",
    password: "password123",
  },
  {
    email: "qa.vendor.REALWORLD.10@example.com",
    name: "QA Vendor Owner REALWORLD 10",
    password: "password123",
  },
  {
    email: "qa.vendor.REALWORLD.14@example.com",
    name: "QA Vendor Owner REALWORLD 14",
    password: "password123",
  },
] as const;

async function login(
  page: Page,
  account: Readonly<{ email: string; name: string; password: string }> = approvedVendor,
) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email address" }).fill(account.email);
  await page.getByLabel(/^Password/).fill(account.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("Approved", { exact: true })).toBeVisible();
}

async function signOut(page: Page, accountName: string) {
  await page.getByRole("button", { name: new RegExp(accountName) }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

async function progressOrder(
  page: Page,
  label: string,
  tracking?: Readonly<{ carrier: string; number: string }>,
  scope?: Locator,
) {
  await (scope ?? page).getByRole("button", { name: label }).click();
  const dialog = page.getByRole("dialog", { name: label });
  if (tracking) {
    await dialog.getByRole("textbox", { name: "Tracking carrier" }).fill(tracking.carrier);
    await dialog.getByRole("textbox", { name: "Tracking number" }).fill(tracking.number);
  }
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" && /\/api\/orders\/[^/]+\/status$/.test(response.url()),
  );
  await dialog.getByRole("button", { name: label }).click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  await expect(dialog).toBeHidden();
  await page.reload();
}

test.describe("vendor workflows", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!testInfo.project.name.startsWith("vendor"), "Vendor-only suite");
  });

  test("registration, approval gating, login, and logout", async ({ page }, testInfo) => {
    const attempt = `${testInfo.parallelIndex}-${testInfo.retry}-${testInfo.workerIndex}`;
    const email = `issue99.pending.vendor+${attempt}@example.com`;
    await page.goto("/login?mode=register");
    await page.getByRole("textbox", { name: "Your name" }).fill("Issue 99 Pending Vendor");
    await page.getByRole("textbox", { name: "Store name" }).fill("Issue 99 Pending Store");
    await page.getByRole("textbox", { name: "Email address" }).fill(email);
    await page.getByRole("textbox", { name: /^Password/ }).fill("password123");
    await page.getByLabel("Confirm password").fill("password123");
    await page.getByRole("button", { name: "Create vendor account" }).click();

    await expect(page).toHaveURL(/\/access$/);
    await expect(
      page.getByRole("heading", { name: "Your application is under review" }),
    ).toBeVisible();
    await expect(page.getByText("Issue 99 Pending Store", { exact: true })).toBeVisible();
    await signOut(page, "Issue 99 Pending Vendor");

    await login(page);
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    await signOut(page, approvedVendor.name);
  });

  test("product create, edit, variants, inventory, and delete", async ({ page }, testInfo) => {
    const attempt = `${testInfo.parallelIndex}-${testInfo.retry}-${testInfo.workerIndex}`;
    const originalName = `Issue 99 Playwright Product ${attempt}`;
    const updatedName = `${originalName} Updated`;
    await login(page);
    await page.goto("/products/new");

    await page.getByRole("textbox", { name: "Name" }).fill(originalName);
    await page.getByRole("combobox", { name: /Category/ }).fill("QA_CAT_REALWORLD_Phones");
    await page.getByRole("option", { name: /QA_CAT_REALWORLD_Phones/ }).click();
    await page.getByRole("spinbutton", { name: "Base price" }).fill("49.99");
    await page
      .getByLabel("Description")
      .fill("A deterministic product created by issue 99 E2E coverage.");
    await page.getByRole("textbox", { name: "Tags" }).fill("playwright, e2e");
    await page.getByRole("textbox", { name: "SKU" }).fill(`ISSUE99-BLUE-S-${attempt}`);
    await page.getByRole("spinbutton", { name: "Stock" }).fill("12");
    await page.getByRole("textbox", { name: "Size" }).fill("S");
    await page.getByRole("textbox", { name: "Color" }).fill("Blue");
    await page.getByRole("button", { name: "Add variant" }).click();
    await page.getByRole("textbox", { name: "SKU" }).nth(1).fill(`ISSUE99-BLACK-M-${attempt}`);
    await page.getByRole("spinbutton", { name: "Price adjustment" }).nth(1).fill("5");
    await page.getByRole("spinbutton", { name: "Stock" }).nth(1).fill("8");
    await page.getByRole("textbox", { name: "Size" }).nth(1).fill("M");
    await page.getByRole("textbox", { name: "Color" }).nth(1).fill("Black");
    await page.getByRole("button", { name: "Create product" }).click();

    await expect(page).toHaveURL(/\/products$/);
    await page.getByRole("textbox", { name: "Search inventory" }).fill(originalName);
    await page.getByRole("button", { name: "Apply filters" }).click();
    let row = page.getByRole("row").filter({ hasText: originalName });
    await expect(row).toContainText("20 units total");
    await row.getByRole("link", { name: `Edit ${originalName}` }).click();

    await page.getByRole("textbox", { name: "Name" }).fill(updatedName);
    await page.getByRole("spinbutton", { name: "Stock" }).nth(0).fill("15");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/\/products$/);
    await page.getByRole("textbox", { name: "Search inventory" }).fill(updatedName);
    await page.getByRole("button", { name: "Apply filters" }).click();
    row = page.getByRole("row").filter({ hasText: updatedName });
    await expect(row).toContainText("23 units total");

    await row.getByRole("button", { name: `Delete ${updatedName}` }).click();
    const dialog = page.getByRole("dialog", { name: "Delete product" });
    await dialog.getByRole("button", { name: "Delete product" }).click();
    await expect(page.getByRole("row").filter({ hasText: updatedName })).toHaveCount(0);
  });

  test("order progression reaches delivery with shipment tracking", async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    const account = orderVendors[testInfo.retry];
    expect(account, `Missing seeded order vendor for retry ${testInfo.retry}`).toBeDefined();
    await login(page, account!);
    await page.goto("/orders?filter.status=PENDING");
    const pendingRow = page.locator("tbody tr").first();
    const orderNumber = (await pendingRow.getByRole("link").first().textContent())?.trim();
    expect(orderNumber).toBeTruthy();

    await progressOrder(page, "Confirm order", undefined, pendingRow);
    await page.goto(`/orders?search=${encodeURIComponent(orderNumber!)}`);
    await page.getByRole("link", { name: orderNumber! }).click();
    await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+$/);
    await expect(page.getByRole("heading", { level: 1, name: orderNumber! })).toBeVisible();

    await progressOrder(page, "Start processing");
    await expect(page.getByText("PROCESSING", { exact: true })).toBeVisible();

    await progressOrder(page, "Mark shipped", {
      carrier: "Issue 99 Carrier",
      number: "ISSUE99-TRACKING",
    });
    await expect(page.getByText("SHIPPED", { exact: true })).toBeVisible();
    await expect(page.getByText(/Issue 99 Carrier.*ISSUE99-TRACKING/)).toBeVisible();

    await progressOrder(page, "Mark delivered");
    await expect(page.getByText("DELIVERED", { exact: true })).toBeVisible();
  });

  test("store profile, earnings, and Stripe Connect status", async ({ page }) => {
    await login(page);
    await page.goto("/store");
    await expect(page.getByRole("textbox", { name: "Store name" })).toHaveValue(
      "Victor Marketplace",
    );
    await page
      .getByLabel("Description")
      .fill("Victor Marketplace profile verified by the issue 99 Playwright suite.");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Store profile updated." }),
    ).toBeVisible();

    await page.goto("/earnings");
    await expect(page.getByRole("heading", { level: 1, name: "Earnings" })).toBeVisible();
    await expect(
      page.getByText(/Payouts are unavailable until Stripe Connect setup/),
    ).toBeVisible();
    await expect(page.getByLabel("Earnings summary")).toContainText("Net earnings");
    await expect(page.getByRole("heading", { name: "Earning records" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Payout history" })).toBeVisible();
  });
});
