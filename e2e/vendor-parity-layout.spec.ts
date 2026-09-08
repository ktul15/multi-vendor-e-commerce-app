import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const password = "password123";
const approvedVendor = { email: "victor.vendor@example.com", password } as const;
const lifecycleVendors = [
  {
    email: "vera.vendor@example.com",
    heading: "Your application is under review",
    viewport: { height: 1024, width: 768 },
  },
  {
    email: "riley.vendor@example.com",
    heading: "Your vendor application was rejected",
    viewport: { height: 900, width: 1440 },
  },
  {
    email: "nina.vendor@example.com",
    heading: "Your store access is paused",
    viewport: { height: 1024, width: 768 },
  },
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

async function clearSession(page: Page) {
  await page.context().clearCookies();
  await page.goto("/login");
}

async function expectLayoutIntegrity(page: Page) {
  const result = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const visible = (element: Element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.height > 0;
    };
    const insideHorizontalScroller = (element: Element) => {
      for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
        const style = window.getComputedStyle(ancestor);
        if (
          ancestor.scrollWidth > ancestor.clientWidth &&
          (style.overflowX === "auto" || style.overflowX === "scroll")
        ) {
          return true;
        }
      }
      return false;
    };
    const clippedControls = [...document.querySelectorAll("a, button, input, select, textarea")]
      .filter(visible)
      .filter((element) => !insideHorizontalScroller(element))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left < -1 || rect.right > viewportWidth + 1;
      })
      .map(
        (element) =>
          element.getAttribute("aria-label") ?? element.textContent?.trim() ?? element.tagName,
      );
    const sidebar = document.querySelector(".ui-shell-sidebar");
    const shellMain = document.querySelector(".ui-shell-main");
    const desktopShellOverlap =
      sidebar && shellMain && visible(sidebar) && visible(shellMain)
        ? sidebar.getBoundingClientRect().right > shellMain.getBoundingClientRect().left + 1
        : false;

    return {
      clippedControls,
      desktopShellOverlap,
      documentOverflow: document.documentElement.scrollWidth - viewportWidth,
    };
  });

  expect(result.documentOverflow, "document must not overflow horizontally").toBeLessThanOrEqual(1);
  expect(result.clippedControls, "controls must remain inside the viewport").toEqual([]);
  expect(result.desktopShellOverlap, "desktop sidebar and content must not overlap").toBe(false);
}

async function expectCriticalRoutesToFit(page: Page) {
  for (const [route, heading] of criticalRoutes) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expectLayoutIntegrity(page);
  }
}

async function expectDetailAndFeedbackStatesToFit(page: Page) {
  await page.goto("/products");
  await page
    .getByRole("link", { name: /^Edit / })
    .first()
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "Edit product" })).toBeVisible();
  await expectLayoutIntegrity(page);

  await page.goto("/orders");
  await page.locator("tbody").getByRole("link").first().click();
  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectLayoutIntegrity(page);

  await page.goto("/orders?search=issue-100-no-matches");
  await expect(page.getByRole("heading", { name: "No matching orders" })).toBeVisible();
  await expectLayoutIntegrity(page);

  await page.goto("/products/00000000-0000-4000-8000-000000000000/edit");
  await expect(page.getByRole("heading", { name: "Product unavailable" })).toBeVisible();
  await expectLayoutIntegrity(page);

  await page.goto("/orders/00000000-0000-4000-8000-000000000000");
  await expect(page.getByRole("heading", { name: "Order unavailable" })).toBeVisible();
  await expectLayoutIntegrity(page);
}

test.describe("vendor parity layouts", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!testInfo.project.name.startsWith("vendor"), "Vendor-only suite");
  });

  test("public authentication and registration fit desktop and tablet", async ({ page }) => {
    for (const viewport of [
      { height: 900, width: 1440 },
      { height: 1024, width: 768 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/login");
      await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
      await expectLayoutIntegrity(page);

      await page.goto("/login?mode=register");
      await expect(page.getByRole("heading", { name: "Start selling" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Create vendor account" })).toBeEnabled();
      await expectLayoutIntegrity(page);
    }
  });

  test("pending, rejected, and suspended lifecycle gates fit their shells", async ({ page }) => {
    for (const vendor of lifecycleVendors) {
      await page.setViewportSize(vendor.viewport);
      await login(page, { email: vendor.email, password }, /\/access$/);
      await expect(page.getByRole("heading", { name: vendor.heading })).toBeVisible();
      await expect(page.getByRole("link", { name: "Products" })).toHaveCount(0);
      await expectLayoutIntegrity(page);
      await clearSession(page);
    }
  });

  test("critical and representative state routes fit the supported desktop shell", async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1440 });
    await login(page);

    await expect(page.getByRole("navigation", { name: "Vendor Hub navigation" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeHidden();
    await expectCriticalRoutesToFit(page);
    await expectDetailAndFeedbackStatesToFit(page);
  });

  test("critical and representative state routes fit the supported tablet shell", async ({
    page,
  }) => {
    await page.setViewportSize({ height: 1024, width: 768 });
    await login(page);

    const menuButton = page.getByRole("button", { name: "Open navigation" });
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    const drawer = page.getByRole("dialog", { name: "Navigation" });
    await expect(drawer).toBeVisible();
    await expectLayoutIntegrity(page);
    await drawer.getByRole("link", { name: "Products", exact: true }).click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(drawer).toBeHidden();

    await expectCriticalRoutesToFit(page);
    await expectDetailAndFeedbackStatesToFit(page);
  });
});
