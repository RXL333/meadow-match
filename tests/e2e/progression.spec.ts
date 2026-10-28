import { test, expect, type Page } from "./fixtures";
import type { GameState } from "../../src/game";

type DebugWindow = Window & {
  __MEADOW__: { getState: () => GameState; isBusy: () => boolean };
};
async function completeLevel(page: Page) {
  const solution = await page.evaluate(
    () => (window as DebugWindow).__MEADOW__.getState().solution,
  );
  for (const id of solution) {
    await page.waitForFunction(
      () => !(window as DebugWindow).__MEADOW__.isBusy(),
    );
    await page
      .locator(`.board-tile[data-id="${id}"],.reserve-tile[data-id="${id}"]`)
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "好心情，收集成功！" }),
  ).toBeVisible();
}

test("all ten levels can be completed through the public interface", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  for (let level = 0; level < 10; level++) {
    if (level === 9) {
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: "test-results/mobile-level-10.png",
        fullPage: true,
        animations: "disabled",
      });
      const visible = await page
        .locator(".board-tile.available")
        .evaluateAll((nodes) =>
          nodes.every((node) => {
            const rect = node.getBoundingClientRect();
            return rect.x >= 0 && rect.right <= innerWidth;
          }),
        );
      expect(visible).toBe(true);
    }
    await completeLevel(page);
    await expect(page.locator("#journey-count")).toHaveText(
      `${level + 1} / 10`,
    );
    if (level < 9)
      await page.getByRole("button", { name: "去下一片牧场" }).click();
  }
  await page.getByRole("button", { name: "回牧场逛逛" }).click();
  await expect(page.locator(".level-choice.complete")).toHaveCount(10);
  await page.reload();
  await expect(page.locator("#journey-count")).toHaveText("10 / 10");
});

test("daily challenge completes with real clicks and retains a local result", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await page.getByRole("button", { name: "每日挑战", exact: true }).click();
  await completeLevel(page);
  await expect(page.locator("#daily-invite-copy")).toHaveText(
    "今日已收集，明天再来看看",
  );
  await page.reload();
  await expect(page.locator("#daily-invite-copy")).toHaveText(
    "今日已收集，明天再来看看",
  );
});

test("keyboard navigation keeps help accessible and respects system reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await page.getByRole("button", { name: "玩法与设置" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("html")).toHaveClass("reduced-motion");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "玩法与设置" })).toBeFocused();
  const first = await page.evaluate(
    () => (window as DebugWindow).__MEADOW__.getState().solution[0],
  );
  await page.locator(`.board-tile[data-id="${first}"]`).focus();
  // Closing a native dialog must not steal focus on the following render frame.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );
  await page.locator("#modal").dispatchEvent("close");
  await expect(page.locator(`.board-tile[data-id="${first}"]`)).toBeFocused();
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    () => !(window as DebugWindow).__MEADOW__.isBusy(),
  );
  expect(
    await page.evaluate(
      () => (window as DebugWindow).__MEADOW__.getState().moves,
    ),
  ).toBe(1);
  await expect(page.locator(".board-tile.available:focus")).toHaveCount(1);
  await page.keyboard.press("Space");
  await page.waitForFunction(
    () => !(window as DebugWindow).__MEADOW__.isBusy(),
  );
  expect(
    await page.evaluate(
      () => (window as DebugWindow).__MEADOW__.getState().moves,
    ),
  ).toBe(2);
  await expect(page.locator(".board-tile.available:focus")).toHaveCount(1);
});
