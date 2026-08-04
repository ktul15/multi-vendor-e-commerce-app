import { expect, test } from "@playwright/test";

test("each dashboard exposes its public login boundary", async ({ page }, testInfo) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
  await expect(
    page.getByText(testInfo.project.name.startsWith("vendor") ? "Vendor Hub" : "Admin Console"),
  ).toBeVisible();
});
