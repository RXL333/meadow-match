import { test, expect, type Page } from "./fixtures";
import type { GameState } from "../../src/game";

type DebugWindow = Window & {
  __MEADOW__: { getState: () => GameState; isBusy: () => boolean };
};
const state = (page: Page) =>
  page.evaluate(() => (window as DebugWindow).__MEADOW__.getState());
const idle = (page: Page) =>
  page.waitForFunction(() => !(window as DebugWindow).__MEADOW__.isBusy(), null, {
    timeout: 2500,
  });
async function tapTile(page: Page, id: number) {
  const rect = await page.locator(`.board-tile[data-id="${id}"],.reserve-tile[data-id="${id}"]`).boundingBox();
  expect(rect).not.toBeNull();
  await page.touchscreen.tap(rect!.x + rect!.width / 2, rect!.y + rect!.height / 2);
}

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test("mobile accepts three taps while earlier cards are still flying", async ({ page }) => {
  await page.goto("./");
  await page.evaluate(() => document.fonts.ready);
  const solution = (await state(page)).solution;
  for (const id of solution.slice(0, 3)) await tapTile(page, id);
  expect((await state(page)).moves).toBe(3);
  expect(await page.locator(".flying-tile").count()).toBeGreaterThanOrEqual(2);
  await page.screenshot({ path: "test-results/mobile-rapid-flight.png" });
  await idle(page);
  expect((await state(page)).cleared).toBe(3);
  await expect(page.locator(".tray-tile,.flying-tile")).toHaveCount(0);
  await tapTile(page, solution[3]);
  await idle(page);
  expect((await state(page)).moves).toBe(4);
});

test("a whole mobile level accepts rapid taps without waiting for animation", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  const solution = (await state(page)).solution;
  for (const id of solution) await tapTile(page, id);
  expect((await state(page)).moves).toBe(36);
  await idle(page);
  await expect(page.getByRole("heading", { name: "好心情，收集成功！" })).toBeVisible();
  await expect(page.locator(".flying-tile,.tray-tile")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("two fast taps on a deep stack take two different cards", async ({ page }) => {
  await page.goto("./");
  const initial = await state(page);
  const top = initial.tiles.filter((tile) => tile.z >= 8).sort((a, b) => b.z - a.z)[0];
  const rect = (await page.locator(`.board-tile[data-id="${top.id}"]`).boundingBox())!;
  const x = rect.x + rect.width / 2;
  const y = rect.y + rect.height / 2;
  await page.touchscreen.tap(x, y);
  await page.touchscreen.tap(x, y);
  expect((await state(page)).moves).toBe(2);
  expect((await state(page)).board).toHaveLength(34);
  await idle(page);
  expect(new Set((await state(page)).tray).size).toBe(2);
});

test("viewport changes redirect overlapping flights to the current basket", async ({ page }) => {
  await page.goto("./");
  const solution = (await state(page)).solution;
  for (const id of solution.slice(0, 2)) await tapTile(page, id);
  await page.setViewportSize({ width: 430, height: 900 });
  for (const id of solution.slice(2, 4)) await tapTile(page, id);
  expect((await state(page)).moves).toBe(4);
  await idle(page);
  await page.waitForFunction(() => [...document.querySelectorAll(".tray-tile")]
    .every((node) => node.getAnimations().length === 0));
  const placement = await page.evaluate(() => {
    const tile = document.querySelector(".tray-tile")!;
    const card = tile.getBoundingClientRect();
    const cell = document.querySelector(".rack-cells > span")!.getBoundingClientRect();
    return { dx: Math.abs(card.x - cell.x), dy: Math.abs(card.y - cell.y), visible: getComputedStyle(tile).visibility };
  });
  expect(placement.dx).toBeLessThan(1);
  expect(placement.dy).toBeLessThan(1);
  expect(placement.visible).toBe("visible");
  await expect(page.locator(".flying-tile")).toHaveCount(0);
});

test("rapid input respects a full basket and can recover with tools", async ({ page }) => {
  await page.goto("./");
  for (let i = 0; i < 36; i++) {
    const current = await state(page);
    if (current.status !== "playing") break;
    const available = await page.locator(".board-tile.available").evaluateAll((nodes) =>
      nodes.map((node) => Number((node as HTMLElement).dataset.id)));
    available.sort((a, b) =>
      current.tray.filter((id) => current.tiles[id].kind === current.tiles[a].kind).length -
      current.tray.filter((id) => current.tiles[id].kind === current.tiles[b].kind).length);
    await tapTile(page, available[0]);
  }
  const lost = await state(page);
  expect(lost.status).toBe("lost");
  expect(lost.tray).toHaveLength(7);
  const extra = Number(await page.locator(".board-tile.available").first().getAttribute("data-id"));
  await tapTile(page, extra);
  expect((await state(page)).moves).toBe(lost.moves);
  await idle(page);
  await page.getByRole("button", { name: "挪出三张，继续探索" }).click();
  expect((await state(page)).status).toBe("playing");
  await page.locator("#tool-shuffle").click();
  await idle(page);
  for (const id of (await state(page)).solution) await tapTile(page, id);
  await idle(page);
  expect((await state(page)).status).toBe("won");
  await expect(page.getByRole("heading", { name: "好心情，收集成功！" })).toBeVisible();
});

test("a burst of suspended flights settles on backgrounding and remains playable", async ({ page }) => {
  await page.goto("./");
  await page.evaluate(() => {
    const original = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      const animation = original.apply(this, args);
      animation.pause();
      return animation;
    };
  });
  const solution = (await state(page)).solution;
  for (const id of solution.slice(0, 6)) await tapTile(page, id);
  expect((await state(page)).moves).toBe(6);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await idle(page);
  await expect(page.locator("#effects")).toBeEmpty();
  const expectedTray = (await state(page)).tray;
  expect(await page.locator(".tray-tile").evaluateAll((nodes) =>
    nodes.map((node) => Number((node as HTMLElement).dataset.id)))).toEqual(expectedTray);
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await tapTile(page, solution[6]);
  await idle(page);
  expect((await state(page)).moves).toBe(7);
});

test("a dense mobile board accepts bursts under fourfold CPU slowdown", async ({ page, context }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.getByRole("button", { name: "每日挑战", exact: true }).click();
  const session = await context.newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const solution = (await state(page)).solution;
  for (const id of solution.slice(0, 24)) await tapTile(page, id);
  expect((await state(page)).moves).toBe(24);
  await idle(page);
  const current = await state(page);
  expect(current.status).toBe("playing");
  expect(await page.locator(".tray-tile").evaluateAll((nodes) =>
    nodes.map((node) => Number((node as HTMLElement).dataset.id)))).toEqual(current.tray);
  await expect(page.locator(".flying-tile")).toHaveCount(0);
  expect(errors).toEqual([]);
  await session.send("Emulation.setCPUThrottlingRate", { rate: 1 });
});
