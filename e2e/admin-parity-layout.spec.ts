import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const admin = {
  email: "alice.admin@example.com",
  password: "admin123",
} as const;

const criticalRoutes = [
  ["/", "Overview"],
  ["/categories", "Categories"],
  ["/users", "Users"],
  ["/vendors", "Vendors"],
  ["/products", "Products"],
  ["/orders", "Orders"],
  ["/finance", "Revenue and payouts"],
  ["/banners", "Banners"],
  ["/promos", "Promo codes"],
  ["/banners/new", "Create banner"],
  ["/promos/new", "Create promo code"],
] as const;

async function login(page: Page) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email address" }).fill(admin.email);
  await page.getByLabel(/^Password/).fill(admin.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
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
  for (const route of ["/users", "/vendors", "/products", "/orders"] as const) {
    await page.goto(route);
    await page.locator("tbody").getByRole("link").first().click();
    await expect(page).toHaveURL(new RegExp(`${route}/[0-9a-f-]+$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectLayoutIntegrity(page);
  }

  await page.goto("/banners");
  await page.locator("tbody").getByRole("link", { name: "Edit" }).first().click();
  await expect(page).toHaveURL(/\/banners\/[0-9a-f-]+\/edit$/);
  await expect(page.getByRole("heading", { level: 1, name: /^Edit / })).toBeVisible();
  await expectLayoutIntegrity(page);

  await page.goto("/promos");
  await page.locator("tbody").getByRole("link", { name: "Edit" }).first().click();
  await expect(page).toHaveURL(/\/promos\/[0-9a-f-]+\/edit$/);
  await expect(page.getByRole("heading", { level: 1, name: /^Edit / })).toBeVisible();
  await expectLayoutIntegrity(page);

  for (const [route, heading] of [
    ["/users?search=issue-122-no-matches", "No matching users"],
    ["/vendors?search=issue-122-no-matches", "No matching vendors"],
    ["/products?search=issue-122-no-matches", "No matching products"],
    ["/orders?search=issue-122-no-matches", "No matching orders"],
    ["/promos?search=I122NOMATCH", "No matching promo codes"],
  ] as const) {
    await page.goto(route);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expectLayoutIntegrity(page);
  }
}

test.describe("admin parity layouts", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!testInfo.project.name.startsWith("admin"), "Admin-only suite");
  });

  test("public authentication fits desktop and tablet", async ({ page }) => {
    for (const viewport of [
      { height: 900, width: 1440 },
      { height: 1024, width: 768 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/login");
      await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
      await expectLayoutIntegrity(page);
    }
  });

  test("critical and representative state routes fit the desktop shell", async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1440 });
    await login(page);

    await expect(page.getByRole("navigation", { name: "Admin Console navigation" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeHidden();
    await expectCriticalRoutesToFit(page);
    await expectDetailAndFeedbackStatesToFit(page);
  });

  test("critical and representative state routes fit the tablet shell", async ({ page }) => {
    await page.setViewportSize({ height: 1024, width: 768 });
    await login(page);

    const menuButton = page.getByRole("button", { name: "Open navigation" });
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    const drawer = page.getByRole("dialog", { name: "Navigation" });
    await expect(drawer).toBeVisible();
    await expectLayoutIntegrity(page);
    await drawer.getByRole("link", { name: "Users", exact: true }).click();
    await expect(page).toHaveURL(/\/users$/);
    await expect(drawer).toBeHidden();

    await expectCriticalRoutesToFit(page);
    await expectDetailAndFeedbackStatesToFit(page);
  });
});
