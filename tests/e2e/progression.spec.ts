import { test, expect, type Page, enterHard } from "./fixtures";
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

test("two-stage journey locks hard, completes both, counts once, and changes the pairing", async ({ page }) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await page.locator("#journey-nav").click();
  await expect(page.locator(".level-choice")).toHaveCount(2);
  await expect(page.locator('[data-level="1"]')).toBeDisabled();
  await page.getByRole("button", { name: "关闭弹窗" }).click();
  await completeLevel(page);
  await expect(page.locator("#journey-count")).toHaveText("1 / 2");
  await page.getByRole("button", { name: "挑战第二关 · 极难" }).click();
  const hard = await page.evaluate(() => (window as DebugWindow).__MEADOW__.getState());
  expect(hard.level).toBe(1);
  expect(hard.tiles.length).toBeGreaterThanOrEqual(144);
  await page.screenshot({ path: "test-results/mobile-hard.png", fullPage: true, animations: "disabled" });
  await completeLevel(page);
  await expect(page.locator("#journey-count")).toHaveText("2 / 2");
  await expect(page.locator("#rounds-copy")).toContainText("已通关 1 轮");
  await page.getByRole("button", { name: "再来一轮新挑战" }).click();
  await expect(page.locator("#level-tag")).toContainText("简单关");
  const next = await page.evaluate(() => (window as DebugWindow).__MEADOW__.getState());
  expect(next.seed).not.toBe(hard.seed);
  await page.reload();
  expect((await page.evaluate(() => (window as DebugWindow).__MEADOW__.getState())).seed).toBe(next.seed);
  await page.locator("#journey-nav").click();
  await expect(page.locator('[data-level="1"]')).toBeDisabled();
  await expect(page.locator("#modal-content")).toContainText("已通关 1 轮");
});

test("changing an unfinished hard round asks first and relocks the second stage", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await enterHard(page);
  const before = await page.evaluate(() => (window as DebugWindow).__MEADOW__.getState());
  await page.locator("#new-round-nav").click();
  await page.getByRole("button", { name: "继续这一组" }).click();
  expect(await page.evaluate(() => (window as DebugWindow).__MEADOW__.getState())).toEqual(before);
  await page.locator("#new-round-nav").click();
  await page.getByRole("button", { name: "换一组，从简单关开始" }).click();
  const next = await page.evaluate(() => (window as DebugWindow).__MEADOW__.getState());
  expect(next.level).toBe(0);
  expect(next.seed).not.toBe(before.seed);
  await page.locator("#journey-nav").click();
  await expect(page.locator('[data-level="1"]')).toBeDisabled();
});

for (let variant = 0; variant < 6; variant++) {
  test(`hard template ${variant + 1} is winnable with real card clicks and no tools`, async ({ page }) => {
    test.setTimeout(90000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await enterHard(page, variant * 3);
    await completeLevel(page);
    const state = await page.evaluate(() => (window as DebugWindow).__MEADOW__.getState());
    expect(state.status).toBe("won");
    expect(state.tools).toEqual({ remove: 1, undo: 1, shuffle: 1 });
    expect(state.cleared).toBe(state.tiles.length);
    await expect(page.locator("#rounds-copy")).toContainText("已通关 1 轮");
  });
}

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
