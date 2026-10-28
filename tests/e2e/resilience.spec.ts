import { test, expect, type Page, enterHard } from "./fixtures";
import type { GameState } from "../../src/game";

type DebugWindow = Window & {
  __MEADOW__: { getState: () => GameState; isBusy: () => boolean };
};
const state = (page: Page) =>
  page.evaluate(() => (window as DebugWindow).__MEADOW__.getState());
const idle = (page: Page) =>
  page.waitForFunction(() => !(window as DebugWindow).__MEADOW__.isBusy(), null, {
    timeout: 2000,
  });

for (const failure of ["throw", "pause"] as const) {
  test(`animation ${failure} cannot lock picking, matching or shuffling`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("./");
    await page.evaluate((failure) => {
      const original = Element.prototype.animate;
      Element.prototype.animate = function (...args) {
        if (failure === "throw") throw new Error("Simulated animation failure");
        const animation = original.apply(this, args);
        animation.pause(); // A real pending Animation.finished promise.
        return animation;
      };
    }, failure);
    const solution = (await state(page)).solution;
    for (const id of solution.slice(0, 3)) {
      await page.locator(`.board-tile[data-id="${id}"]`).click();
      await idle(page);
    }
    expect((await state(page)).cleared).toBe(3);
    await expect(page.locator(".tray-tile")).toHaveCount(0);
    await page.locator("#tool-shuffle").click();
    await idle(page);
    expect((await state(page)).tools.shuffle).toBe(0);
    const next = (await state(page)).solution[0];
    await page.locator(`.board-tile[data-id="${next}"]`).click();
    await idle(page);
    expect((await state(page)).moves).toBe(4);
    await expect(page.locator(".flying-tile")).toHaveCount(0);
    await expect(page.locator(".tray-tile")).toHaveCount(1);
    expect(errors).toEqual([]);
  });
}

test("backgrounding an in-flight match settles the UI and releases effects", async ({ page }) => {
  await page.goto("./");
  const solution = (await state(page)).solution;
  for (const id of solution.slice(0, 2)) {
    await page.locator(`.board-tile[data-id="${id}"]`).click();
    await idle(page);
  }
  await page.locator(`.board-tile[data-id="${solution[2]}"]`).click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.getAnimations().forEach((animation) => animation.pause());
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await idle(page);
  await expect(page.locator("#effects")).toBeEmpty();
  await expect(page.locator(".tray-tile")).toHaveCount(0);
  expect((await state(page)).cleared).toBe(3);
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.locator(`.board-tile[data-id="${solution[3]}"]`).click();
  await idle(page);
  expect((await state(page)).moves).toBe(4);
});

test("picking preserves untouched board nodes during sustained play", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  const solution = (await state(page)).solution;
  const observer = await page.evaluateHandle(() => {
    const added: Node[] = [];
    const observer = new MutationObserver((records) => {
      records.forEach((record) => added.push(...record.addedNodes));
    });
    observer.observe(document.querySelector("#board")!, { childList: true });
    return { added, observer };
  });
  for (const id of solution) {
    await page.locator(`.board-tile[data-id="${id}"]`).click();
    await idle(page);
  }
  expect((await state(page)).status).toBe("won");
  expect(await observer.evaluate(({ added }) => added.length)).toBe(0);
  await observer.evaluate(({ observer }) => observer.disconnect());
});

test("a dense board stays playable with normal motion and a throttled CPU", async ({ page, context }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  await enterHard(page);
  const session = await context.newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const solution = (await state(page)).solution;
  const started = Date.now();
  for (const id of solution.slice(0, 24)) {
    await page.locator(`.board-tile[data-id="${id}"]`).click();
    await idle(page);
    expect(await page.locator("#effects > *").count()).toBeLessThanOrEqual(64);
  }
  expect((await state(page)).moves).toBe(24);
  expect((await state(page)).status).toBe("playing");
  await expect(page.locator("#effects")).toBeEmpty({ timeout: 4000 });
  await test.info().attach("throttled-play.json", {
    body: JSON.stringify({ cpuSlowdown: 4, tiles: (await state(page)).tiles.length, picks: 24, elapsedMs: Date.now() - started }),
    contentType: "application/json",
  });
  await session.send("Emulation.setCPUThrottlingRate", { rate: 1 });
});
