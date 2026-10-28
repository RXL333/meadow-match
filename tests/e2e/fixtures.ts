import { test as base } from "@playwright/test";

// Gameplay regressions use a returning player; onboarding has its own first-visit tests.
export const test = base.extend<{ returningPlayer: void }>({
  returningPlayer: [async ({ page }, use) => {
    await page.addInitScript(() => {
      localStorage.setItem("meadow-match-tutorial-v2", "1");
      if (!localStorage.getItem("meadow-match-v2")) localStorage.setItem("meadow-match-v2", JSON.stringify({
        completed: [], bestMoves: {}, challengeSeed: 0, roundsCleared: 0, sound: false, reducedMotion: false,
      }));
    });
    await use();
  }, { auto: true }],
});
export { expect } from "@playwright/test";
export type { Page } from "@playwright/test";

// Isolated progress fixture opens an unlocked hard template; game state is still read-only.
export async function enterHard(page: import("@playwright/test").Page, seed = 15) {
  await page.addInitScript((seed) => localStorage.setItem("meadow-match-v2", JSON.stringify({
    completed: [0], bestMoves: {}, challengeSeed: seed, roundsCleared: 0, sound: false, reducedMotion: false,
  })), seed);
  await page.goto("./");
}
