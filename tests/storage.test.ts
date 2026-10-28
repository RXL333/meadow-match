import { afterEach, expect, test, vi } from "vitest";
import { readProgress, saveProgress, advanceChallenge } from "../src/storage";

afterEach(() => vi.unstubAllGlobals());
function storage(values: Record<string, string> = {}) {
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values[key] ?? null,
    setItem: (key: string, value: string) => { values[key] = value; },
  });
  return values;
}
test("legacy achievements do not unlock the hard stage, while sound and motion settings migrate", () => {
  storage({ "meadow-match-v1": JSON.stringify({ completed: [0,1,2,3,4,5,6,7,8,9], sound: true, reducedMotion: true }) });
  const progress = readProgress();
  expect(progress.completed).toEqual([]);
  expect(progress.roundsCleared).toBe(0);
  expect(progress.sound).toBe(true);
  expect(progress.reducedMotion).toBe(true);
});
test("two-stage progress and pairing survive reload, and changing rounds keeps total wins", () => {
  storage();
  const progress = readProgress();
  progress.challengeSeed = 0; progress.completed = [0]; progress.roundsCleared = 3;
  expect(saveProgress(progress)).toBe(true);
  expect(readProgress()).toEqual(progress);
  advanceChallenge(progress);
  expect(progress.challengeSeed).toBe(7);
  expect(progress.completed).toEqual([]);
  expect(progress.roundsCleared).toBe(3);
  progress.challengeSeed = 0xffffffff;
  advanceChallenge(progress);
  expect(progress.challengeSeed).toBe(10);
});
test("invalid or out-of-order completion cannot skip the easy stage", () => {
  storage({ "meadow-match-v2": JSON.stringify({ completed: [1,9], challengeSeed: -1, roundsCleared: -1 }) });
  const progress = readProgress();
  expect(progress.completed).toEqual([]);
  expect(progress.roundsCleared).toBe(0);
  expect(progress.challengeSeed).toBeGreaterThanOrEqual(0);
});
test("blocked persistence does not crash gameplay", () => {
  vi.stubGlobal("localStorage", { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); } });
  const progress = readProgress();
  expect(progress.completed).toEqual([]);
  expect(saveProgress(progress)).toBe(false);
});
