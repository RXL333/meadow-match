export interface Progress {
  completed: number[];
  bestMoves: Record<number, number>;
  challengeSeed: number;
  roundsCleared: number;
  sound: boolean;
  reducedMotion: boolean;
}
const KEY = "meadow-match-v2";
function freshSeed(): number {
  try { return crypto.getRandomValues(new Uint32Array(1))[0]; }
  catch { return Date.now() >>> 0; }
}
export function readProgress(): Progress {
  const empty: Progress = {
    completed: [], bestMoves: {}, challengeSeed: freshSeed(), roundsCleared: 0,
    sound: false, reducedMotion: false,
  };
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (!data || typeof data !== "object") {
      // Old ten-level achievements do not unlock a new hard puzzle; keep the player's settings.
      const legacy = JSON.parse(localStorage.getItem("meadow-match-v1") ?? "null");
      empty.sound = legacy?.sound === true;
      empty.reducedMotion = legacy?.reducedMotion === true;
      return empty;
    }
    const completed = Array.isArray(data.completed) && data.completed.includes(0)
      ? data.completed.includes(1) ? [0, 1] : [0] : [];
    return {
      completed,
      bestMoves: validScores(data.bestMoves),
      challengeSeed: Number.isInteger(data.challengeSeed) && data.challengeSeed >= 0 && data.challengeSeed <= 0xffffffff
        ? data.challengeSeed : empty.challengeSeed,
      roundsCleared: Number.isSafeInteger(data.roundsCleared) && data.roundsCleared >= 0 ? data.roundsCleared : 0,
      sound: data.sound === true, reducedMotion: data.reducedMotion === true,
    };
  } catch { return empty; }
}
function validScores(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value).filter(([key, score]) =>
    (key === "0" || key === "1") && typeof score === "number" && Number.isFinite(score) && score > 0));
}
export function advanceChallenge(progress: Progress) {
  // Coprime to the 18 easy/hard pairings; changes both templates without repeating the last hard one.
  progress.challengeSeed = (progress.challengeSeed + 7) % 0xfffffffc;
  progress.completed = [];
  progress.bestMoves = {};
}
export function saveProgress(progress: Progress): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(progress)); return true; }
  catch { return false; }
}
