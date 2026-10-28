import { test as base } from "@playwright/test";

// Gameplay regressions use a returning player; onboarding has its own first-visit tests.
export const test = base.extend<{ returningPlayer: void }>({
  returningPlayer: [async ({ page }, use) => {
    await page.addInitScript(() => localStorage.setItem("meadow-match-tutorial-v1", "1"));
    await use();
  }, { auto: true }],
});
export { expect } from "@playwright/test";
export type { Page } from "@playwright/test";
