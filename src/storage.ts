export interface Progress {
  completed: number[];
  bestMoves: Record<number, number>;
  daily: Record<string, number>;
  sound: boolean;
  reducedMotion: boolean;
}
const KEY = "meadow-match-v1";
export function readProgress(): Progress {
  const empty: Progress = {
    completed: [],
    bestMoves: {},
    daily: {},
    sound: false,
    reducedMotion: false,
  };
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (!data || typeof data !== "object") return empty;
    return {
      completed: Array.isArray(data.completed)
        ? [
            ...new Set<number>(
              data.completed.filter(
                (v: unknown) =>
                  Number.isInteger(v) && Number(v) >= 0 && Number(v) < 10,
              ),
            ),
          ]
        : [],
      bestMoves: validScores(data.bestMoves),
      daily: validScores(data.daily),
      sound: data.sound === true,
      reducedMotion: data.reducedMotion === true,
    };
  } catch {
    return empty;
  }
}
function validScores(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, score]) =>
        typeof score === "number" && Number.isFinite(score) && score > 0,
    ),
  );
}
export function saveProgress(progress: Progress): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}
