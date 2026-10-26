import { test, expect, type Page } from "@playwright/test";
import type { GameState } from "../../src/game";

type DebugWindow = Window & {
  __MEADOW__: {
    getState: () => GameState;
    isBusy: () => boolean;
    getMode: () => string;
  };
};
const state = (page: Page) =>
  page.evaluate(() => (window as DebugWindow).__MEADOW__.getState());
const idle = (page: Page) =>
  page.waitForFunction(() => !(window as DebugWindow).__MEADOW__.isBusy());
async function clickTile(page: Page, id: number) {
  await idle(page);
  await page
    .locator(`.board-tile[data-id="${id}"], .reserve-tile[data-id="${id}"]`)
    .click();
  await idle(page);
}

test("desktop loads the complete original visual without broken assets or browser errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "初见牧场" })).toBeVisible();
  await expect(page.locator(".board-tile")).toHaveCount(36);
  expect(await page.locator(".board-tile.available").count()).toBeGreaterThan(
    0,
  );
  const assets = await page.evaluate(async () => {
    const urls = [
      ...new Set(
        [...document.querySelectorAll(".landscape,.tile-art")]
          .map(
            (node) =>
              getComputedStyle(node).backgroundImage.match(
                /url\(["']?(.*?)["']?\)/,
              )?.[1],
          )
          .filter(Boolean),
      ),
    ] as string[];
    return Promise.all(
      urls.map(
        (url) =>
          new Promise<{ url: string; loaded: boolean }>((resolve) => {
            const image = new Image();
            image.onload = () =>
              resolve({ url, loaded: image.naturalWidth > 0 });
            image.onerror = () => resolve({ url, loaded: false });
            image.src = url;
          }),
      ),
    );
  });
  expect(assets).toHaveLength(2);
  expect(assets.every((asset) => asset.loaded)).toBe(true);
  await page.evaluate(() => document.fonts.ready);
  await page
    .locator(".game-card")
    .screenshot({
      path: "test-results/board-reference.png",
      animations: "disabled",
    });
  await page.screenshot({
    path: "test-results/desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(errors).toEqual([]);
});

test("a complete level wins through actual card clicks, persists, and unlocks the next level", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  const solution = (await state(page)).solution;
  for (const id of solution) await clickTile(page, id);
  await expect(
    page.getByRole("heading", { name: "好心情，收集成功！" }),
  ).toBeVisible();
  expect((await state(page)).status).toBe("won");
  await expect(page.locator("#journey-count")).toHaveText("1 / 10");
  await page.screenshot({ path: "test-results/victory.png", fullPage: true });
  await page.getByRole("button", { name: "去下一片牧场" }).click();
  await expect(page.getByRole("heading", { name: "草莓来信" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "草莓来信" })).toBeVisible();
});

test("undo, reserve and reshuffle operate through the UI and preserve a playable board", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  const first = (await state(page)).solution[0];
  await clickTile(page, first);
  await page.locator("#tool-undo").click();
  expect((await state(page)).moves).toBe(0);
  expect((await state(page)).tools.undo).toBe(0);
  await clickTile(page, first);
  await page.locator("#tool-remove").click();
  await expect(page.locator("#reserve")).toBeVisible();
  expect((await state(page)).reserve).toContain(first);
  await page.locator("#tool-shuffle").click();
  await idle(page);
  const shuffled = await state(page);
  expect(shuffled.tools.shuffle).toBe(0);
  for (const id of shuffled.solution) await clickTile(page, id);
  await expect(
    page.getByRole("heading", { name: "好心情，收集成功！" }),
  ).toBeVisible();
});

test("mobile fits 320, 390 and 430 widths and supports settings, collection, daily and restart", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator("#rack")).toBeVisible();
    await expect(page.locator("#tool-shuffle")).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "test-results/mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "玩法与设置" }).click();
  await page.getByRole("switch", { name: "减少动态效果" }).click();
  await expect(page.locator("html")).toHaveClass("reduced-motion");
  await page.getByRole("button", { name: "关闭弹窗" }).click();
  await page.getByRole("button", { name: "牧场图鉴" }).click();
  await expect(page.locator(".collection-item")).toHaveCount(12);
  await page.screenshot({
    path: "test-results/collection.png",
    animations: "disabled",
  });
  await page.getByRole("button", { name: "关闭弹窗" }).click();
  await page.getByRole("button", { name: "每日挑战", exact: true }).click();
  const initial = (await state(page)).tiles;
  await expect(
    page.getByRole("heading", { name: "今日牧场来信" }),
  ).toBeVisible();
  await clickTile(page, (await state(page)).solution[0]);
  await page.getByRole("button", { name: "重新开始本关" }).click();
  await expect(
    page.getByRole("heading", { name: "重新散个步？" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "重新开始", exact: true }).click();
  expect((await state(page)).tiles).toEqual(initial);
  expect((await state(page)).moves).toBe(0);
  await page.reload();
  await expect(page.locator("html")).toHaveClass("reduced-motion");
  expect(errors).toEqual([]);
});

test("normal animation completes a triple and accepts no duplicate rapid input", async ({
  page,
}) => {
  await page.goto("./");
  const solution = (await state(page)).solution;
  await page
    .locator(`.board-tile[data-id="${solution[0]}"]`)
    .evaluate((node) => { (node as HTMLButtonElement).click(); (node as HTMLButtonElement).click(); });
  await idle(page);
  expect((await state(page)).moves).toBe(1);
  await clickTile(page, solution[1]);
  await clickTile(page, solution[2]);
  expect((await state(page)).cleared).toBe(3);
  expect((await state(page)).tray).toHaveLength(0);
  await expect(page.locator(".flying-tile")).toHaveCount(0);
});

test("a lost game can use its remaining remove tool and keep playing", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  for (let i = 0; i < 36; i++) {
    const current = await state(page);
    if (current.status !== "playing") break;
    const available = await page
      .locator(".board-tile.available")
      .evaluateAll((nodes) =>
        nodes.map((node) => Number((node as HTMLElement).dataset.id)),
      );
    const ranked = available.sort(
      (a, b) =>
        current.tray.filter(
          (id) => current.tiles[id].kind === current.tiles[a].kind,
        ).length -
        current.tray.filter(
          (id) => current.tiles[id].kind === current.tiles[b].kind,
        ).length,
    );
    await clickTile(page, ranked[0]);
  }
  expect((await state(page)).status).toBe("lost");
  await expect(
    page.getByRole("heading", { name: "换条小路，再走走" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "挪出三张，继续探索" }).click();
  expect((await state(page)).status).toBe("playing");
  expect((await state(page)).reserve).toHaveLength(3);
  await expect(page.locator("#modal")).not.toBeVisible();
});
