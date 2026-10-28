import { test, expect, type Page } from "@playwright/test";
import type { GameState } from "../../src/game";

const state = (page: Page) => page.evaluate(() =>
  (window as Window & { __MEADOW__: { getState: () => GameState } }).__MEADOW__.getState());
const titles = ["从亮着的牌开始", "三张一样，自动消除", "看看走到哪儿了", "需要时，找小帮手", "想去哪片牧场？", "按自己喜欢的节奏玩"];

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
  test(`first visit explains every part and fits ${viewport.width}x${viewport.height}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./");
    const tutorial = page.getByRole("dialog", { name: "欢迎来到小牧场" });
    await expect(tutorial).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const initial = await state(page);
    await page.screenshot({ path: `test-results/tutorial-welcome-${viewport.width}.png` });
    await page.getByRole("button", { name: "带我逛一圈" }).click();
    for (const [index, title] of titles.entries()) {
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
      await expect(page.locator(".tutorial-next")).toBeInViewport({ ratio: 1 });
      const geometry = await page.evaluate(() => {
        const panel = document.querySelector(".tutorial-panel")!.getBoundingClientRect();
        const light = document.querySelector(".tutorial-spotlight")!.getBoundingClientRect();
        return {
          inViewport: panel.left >= 0 && panel.right <= innerWidth && panel.top >= 0 && panel.bottom <= innerHeight,
          overlap: Math.max(0, Math.min(panel.right, light.right) - Math.max(panel.left, light.left)) *
            Math.max(0, Math.min(panel.bottom, light.bottom) - Math.max(panel.top, light.top)),
          highlighted: light.width > 0 && light.height > 0,
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      expect(geometry, title).toEqual({ inViewport: true, overlap: 0, highlighted: true, horizontalOverflow: false });
      if (index === 0) {
        // Touching the highlighted board is a demonstration, not a live game move.
        const rect = (await page.locator(".board-tile.available").first().boundingBox())!;
        await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
      }
      if (index === 1) await expect(page.locator(".tutorial-content")).toContainText("第7张放入后若不能消除");
      if (index === 3) {
        for (const tool of ["挪一挪", "想一想", "换一换", "暂存小站"]) await expect(page.locator(".tutorial-content")).toContainText(tool);
        await page.getByRole("button", { name: "上一步" }).click();
        await expect(page.getByRole("heading", { name: titles[2] })).toBeVisible();
        await page.getByRole("button", { name: "下一步" }).click();
      }
      if (viewport.width === 390) await page.screenshot({ path: `test-results/tutorial-step-${index + 1}.png` });
      await page.locator(".tutorial-next").click();
    }
    await expect(page.locator("#tutorial")).not.toBeVisible();
    expect(await state(page)).toEqual(initial);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await page.reload();
    await expect(page.locator(".board-tile")).toHaveCount(initial.tiles.length);
    await expect(page.locator("#tutorial")).not.toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("skip persists, help can replay, and Escape restores the game and keyboard focus", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await page.getByRole("button", { name: "跳过引导" }).click();
  await page.reload();
  await expect(page.locator("#tutorial")).not.toBeVisible();
  const first = (await state(page)).solution[0];
  await page.locator(`.board-tile[data-id="${first}"]`).click();
  const before = await state(page);
  await page.getByRole("button", { name: "玩法与设置" }).click();
  await page.getByRole("button", { name: "再看一次新手引导" }).click();
  await expect(page.getByRole("dialog", { name: "欢迎来到小牧场" })).toBeVisible();
  await expect(page.locator("#modal")).not.toBeVisible();
  await page.getByRole("button", { name: "带我逛一圈" }).click();
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement?.closest("#tutorial") !== null)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.locator("#tutorial")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "玩法与设置" })).toBeFocused();
  expect(await state(page)).toEqual(before);
  const next = before.solution.find((id) => before.board.includes(id))!;
  await page.locator(`.board-tile[data-id="${next}"]`).focus();
  await page.keyboard.press("Enter");
  expect((await state(page)).moves).toBe(2);
});

test("blocked browser storage still allows dismissing the guide and playing", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException("Blocked", "SecurityError"); };
    Storage.prototype.setItem = () => { throw new DOMException("Blocked", "QuotaExceededError"); };
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await expect(page.getByRole("dialog", { name: "欢迎来到小牧场" })).toBeVisible();
  await page.getByRole("button", { name: "跳过引导" }).click();
  const first = (await state(page)).solution[0];
  await page.locator(`.board-tile[data-id="${first}"]`).click();
  expect((await state(page)).moves).toBe(1);
  expect(errors).toEqual([]);
});

test("replaying a dense board follows viewport changes without changing the game", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await page.getByRole("button", { name: "跳过引导" }).click();
  const easy = await state(page);
  for (const id of easy.solution) await page.locator(`.board-tile[data-id="${id}"]`).click();
  await page.getByRole("button", { name: "挑战第二关 · 极难" }).click();
  const before = await state(page);
  await page.getByRole("button", { name: "玩法与设置" }).click();
  await page.getByRole("button", { name: "再看一次新手引导" }).click();
  await page.getByRole("button", { name: "带我逛一圈" }).click();
  for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 430, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(() => page.evaluate(() => {
      const panel = document.querySelector(".tutorial-panel")!.getBoundingClientRect();
      const light = document.querySelector(".tutorial-spotlight")!.getBoundingClientRect();
      return panel.bottom <= innerHeight && panel.right <= innerWidth && light.height > 0 &&
        (panel.top >= light.bottom || panel.bottom <= light.top || panel.left >= light.right || panel.right <= light.left);
    })).toBe(true);
    await expect(page.getByRole("button", { name: "下一步" })).toBeInViewport({ ratio: 1 });
  }
  await page.getByRole("button", { name: "跳过引导" }).click();
  expect(await state(page)).toEqual(before);
  await expect(page.locator(".tutorial-scroll-space")).not.toBeVisible();
});

test.describe("phone touch after onboarding", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test("skipping releases the board immediately for concurrent card flights", async ({ page }) => {
    await page.goto("./");
    await page.getByRole("button", { name: "跳过引导" }).tap();
    await page.evaluate(() => document.fonts.ready);
    const solution = (await state(page)).solution;
    for (const id of solution.slice(0, 3)) {
      const rect = (await page.locator(`.board-tile[data-id="${id}"]`).boundingBox())!;
      await page.touchscreen.tap(rect.x + rect.width / 2, rect.y + rect.height / 2);
    }
    expect((await state(page)).moves).toBe(3);
    expect(await page.locator(".flying-tile").count()).toBeGreaterThanOrEqual(2);
    await expect(page.locator(".flying-tile")).toHaveCount(0);
    expect((await state(page)).cleared).toBe(3);
  });
});
