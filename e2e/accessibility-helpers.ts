import AxeBuilder from "@axe-core/playwright";
import { expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

export async function expectNoAccessibilityViolations(page: Page, context: string) {
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

export async function tabTo(page: Page, target: Locator, maximumTabs = 40) {
  for (let count = 0; count < maximumTabs; count += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }
  const name = await target.evaluate(
    (element) =>
      element.getAttribute("aria-label") ?? element.textContent?.trim() ?? element.tagName,
  );
  throw new Error(`Unable to reach ${name} by keyboard`);
}
