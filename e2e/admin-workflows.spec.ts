import { expect, test } from "@playwright/test";
import type { Locator, Page, TestInfo } from "@playwright/test";
import { randomUUID } from "node:crypto";

const admin = {
  email: "alice.admin@example.com",
  name: "Alice Admin",
  password: "admin123",
} as const;

const moderationTargets = [
  {
    customer: "qa.customer.REALWORLD.9@example.com",
    product: "QA Product REALWORLD 21",
    vendor: "QA Vendor Store REALWORLD 09",
  },
  {
    customer: "qa.customer.REALWORLD.10@example.com",
    product: "QA Product REALWORLD 22",
    vendor: "QA Vendor Store REALWORLD 13",
  },
  {
    customer: "qa.customer.REALWORLD.11@example.com",
    product: "QA Product REALWORLD 23",
    vendor: "QA Vendor Store REALWORLD 17",
  },
] as const;

async function login(page: Page) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email address" }).fill(admin.email);
  await page.getByLabel(/^Password/).fill(admin.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
}

async function confirmMutation(page: Page, dialog: Locator, buttonName: string, endpoint: RegExp) {
  const responsePromise = page.waitForResponse(
    (response) => response.request().method() === "PATCH" && endpoint.test(response.url()),
  );
  await dialog.getByRole("button", { name: buttonName }).click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  await expect(dialog).toBeHidden();
}

function attemptId(testInfo: TestInfo) {
  return `${testInfo.parallelIndex}${testInfo.retry}${randomUUID().slice(0, 8)}`;
}

test.describe("admin workflows", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!testInfo.project.name.startsWith("admin"), "Admin-only suite");
  });

  test("admin authentication rejects a vendor role and supports logout", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("textbox", { name: "Email address" }).fill("victor.vendor@example.com");
    await page.getByLabel(/^Password/).fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Admin access required", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByRole("textbox", { name: "Email address" }).fill(admin.email);
    await page.getByLabel(/^Password/).fill(admin.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.getByRole("button", { name: new RegExp(admin.name) }).click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("user, vendor, and product moderation use confirmations and authoritative refreshes", async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    const target = moderationTargets[testInfo.retry];
    expect(target, `Missing moderation targets for retry ${testInfo.retry}`).toBeDefined();
    await login(page);

    await page.goto("/users");
    await page.getByRole("textbox", { name: "Search users" }).fill(target!.customer);
    await page.getByRole("button", { name: "Apply filters" }).click();
    let row = page.getByRole("row").filter({ hasText: target!.customer });
    await row.getByRole("button", { name: "Ban" }).click();
    let dialog = page.getByRole("dialog", { name: /Ban .+\?/ });
    await expect(dialog).toContainText("unable to sign in");
    await confirmMutation(page, dialog, "Confirm ban", /\/api\/users\/[^/]+\/status$/);
    row = page.getByRole("row").filter({ hasText: target!.customer });
    await expect(row.getByRole("button", { name: "Unban" })).toBeVisible();
    await row.getByRole("button", { name: "Unban" }).click();
    dialog = page.getByRole("dialog", { name: /Unban .+\?/ });
    await confirmMutation(page, dialog, "Confirm unban", /\/api\/users\/[^/]+\/status$/);
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: target!.customer })
        .getByRole("button", { name: "Ban" }),
    ).toBeVisible();

    await page.goto("/vendors");
    await page.getByRole("textbox", { name: "Search vendors" }).fill(target!.vendor);
    await page.getByRole("button", { name: "Apply filters" }).click();
    row = page.getByRole("row").filter({ hasText: target!.vendor });
    await expect(row.locator(".ui-badge").filter({ hasText: /^PENDING$/ })).toBeVisible();
    await row.getByRole("button", { name: "Approve" }).click();
    dialog = page.getByRole("dialog", { name: `Approve ${target!.vendor}?` });
    await confirmMutation(page, dialog, "Confirm approve", /\/api\/vendors\/[^/]+\/lifecycle$/);
    row = page.getByRole("row").filter({ hasText: target!.vendor });
    await expect(row.locator(".ui-badge").filter({ hasText: /^APPROVED$/ })).toBeVisible();
    await expect(row.getByRole("button", { name: "Suspend" })).toBeVisible();

    await page.goto("/products");
    await page.getByRole("textbox", { name: "Search products" }).fill(target!.product);
    await page.getByRole("button", { name: "Apply filters" }).click();
    row = page.getByRole("row").filter({ hasText: target!.product });
    await expect(row.locator(".ui-badge").filter({ hasText: /^Inactive$/ })).toBeVisible();
    await row.getByRole("button", { name: "Activate" }).click();
    dialog = page.getByRole("dialog", { name: `Activate ${target!.product}?` });
    await confirmMutation(page, dialog, "Confirm activate", /\/api\/products\/[^/]+\/moderation$/);
    row = page.getByRole("row").filter({ hasText: target!.product });
    await expect(row.locator(".ui-badge").filter({ hasText: /^Active$/ })).toBeVisible();
    await row.getByRole("button", { name: "Deactivate" }).click();
    dialog = page.getByRole("dialog", { name: `Deactivate ${target!.product}?` });
    await confirmMutation(
      page,
      dialog,
      "Confirm deactivate",
      /\/api\/products\/[^/]+\/moderation$/,
    );
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: target!.product })
        .locator(".ui-badge")
        .filter({ hasText: /^Inactive$/ }),
    ).toBeVisible();
  });

  test("orders and finance render seeded operational and payout data", async ({ page }) => {
    await login(page);
    await page.goto("/orders?search=QA-REALWORLD-00001");
    const order = page.getByRole("row").filter({ hasText: "QA-REALWORLD-00001" });
    await expect(order).toContainText("PENDING");
    await order.getByRole("link", { name: "QA-REALWORLD-00001" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "QA-REALWORLD-00001" })).toBeVisible();
    await expect(page.getByText("Fulfillment: PENDING")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Vendor fulfillment" })).toBeVisible();

    await page.goto("/finance?range=30d&period=day");
    await expect(
      page.getByRole("heading", { level: 1, name: "Revenue and payouts" }),
    ).toBeVisible();
    await expect(page.getByLabel("Finance totals")).toContainText("Platform commission");
    await expect(page.getByRole("region", { name: "Vendor earnings by status" })).toBeVisible();
    await expect(page.getByLabel("Payout totals")).toContainText("FAILED");
    await expect(page.getByRole("region", { name: "Recent vendor payouts" })).toContainText(
      "QA seeded payout failure",
    );
    await page.getByRole("link", { name: "7 days" }).click();
    await expect(page).toHaveURL(/range=7d/);
    await expect(page.getByLabel("Finance totals")).toBeVisible();
  });

  test("category and promo forms create and clean up isolated records", async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);
    const suffix = attemptId(testInfo);
    const categoryName = `Issue 116 E2E Category ${suffix}`;
    const promoCode = `I116E2E${suffix}`;
    await login(page);

    await page.goto("/categories");
    await page.getByRole("button", { name: "Create category" }).click();
    let dialog = page.getByRole("dialog", { name: "Create category" });
    await dialog.getByRole("textbox", { name: "Category name" }).fill(categoryName);
    await dialog.getByRole("button", { name: "Save category" }).click();
    await expect(dialog).toBeHidden();
    const categoryRow = page.getByRole("listitem").filter({ hasText: categoryName });
    await expect(categoryRow).toBeVisible();
    await categoryRow.getByRole("button", { name: "Delete" }).click();
    dialog = page.getByRole("dialog", { name: `Delete ${categoryName}?` });
    await expect(dialog).toContainText("Deletion is permanent");
    await dialog.getByRole("button", { name: "Delete category" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: categoryName })).toHaveCount(0);

    await page.goto("/promos/new");
    await page.getByRole("textbox", { name: "Promo code" }).fill(promoCode);
    await page.getByRole("spinbutton", { name: "Discount value" }).fill("15");
    await page.getByRole("button", { name: "Save promo code" }).click();
    await expect(page).toHaveURL(/\/promos$/);
    await page.getByRole("textbox", { name: "Search promo codes" }).fill(promoCode);
    await page.getByRole("button", { name: "Apply filters" }).click();
    const promoRow = page.getByRole("row").filter({ hasText: promoCode });
    await expect(promoRow).toBeVisible();
    await promoRow.getByRole("button", { name: "Delete" }).click();
    dialog = page.getByRole("dialog", { name: `Delete ${promoCode}?` });
    await expect(dialog).toContainText("soft-archives");
    await dialog.getByRole("button", { name: "Confirm delete" }).click();
    await expect(page.getByRole("row").filter({ hasText: promoCode })).toHaveCount(0);
  });

  test("banner deletion requires confirmation and keeps backend failures visible", async ({
    page,
  }) => {
    await login(page);
    await page.route("**/api/banners/*", async (route) => {
      if (route.request().method() !== "DELETE") {
        await route.fallback();
        return;
      }
      await route.fulfill({
        body: JSON.stringify({ message: "Seeded banner deletion blocked", success: false }),
        contentType: "application/json",
        status: 409,
      });
    });
    await page.goto("/banners?pageSize=50");
    const banner = page.getByRole("row").filter({ hasText: "QA_BANNER_REALWORLD_01" });
    await banner.getByRole("button", { name: "Delete" }).click();
    const dialog = page.getByRole("dialog", { name: "Delete banner?" });
    await expect(dialog).toContainText("This cannot be undone");
    await dialog.getByRole("button", { name: "Delete banner" }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Seeded banner deletion blocked");
    await expect(dialog).toBeVisible();
  });
});
