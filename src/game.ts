import { boardHeight, buildIrregularTiles } from "./layouts";
import { LEVELS, levelVariant, normalizeLevel } from "./levels";
export { LEVELS, LEVEL_POOLS, levelVariant } from "./levels";

export const TILE_SIZE = 54;
export const BOARD_WIDTH = 420;
export const BOARD_HEIGHT = boardHeight(1);
export const CAPACITY = 7;

export const KINDS = [
  { name: "草莓", color: "#df7972" },
  { name: "胡萝卜", color: "#e7a15b" },
  { name: "玉米", color: "#e5c86e" },
  { name: "蘑菇", color: "#b89578" },
  { name: "南瓜", color: "#d9a36b" },
  { name: "苹果", color: "#d47466" },
  { name: "麦穗", color: "#c9b46a" },
  { name: "西兰花", color: "#91af76" },
  { name: "向日葵", color: "#dfbf60" },
  { name: "四叶草", color: "#85a776" },
  { name: "橡果", color: "#b08a61" },
  { name: "羊毛球", color: "#c8bc9c" },
] as const;

export interface Tile {
  readonly id: number;
  kind: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}
export interface Tools {
  undo: number;
  remove: number;
  shuffle: number;
}
export interface Snapshot {
  tiles: Tile[];
  board: number[];
  tray: number[];
  reserve: number[];
  status: "playing" | "won" | "lost";
  moves: number;
  cleared: number;
}
export interface GameState extends Snapshot {
  tools: Tools;
  solution: number[];
  seed: number;
  level: number;
  variant: string;
}
export interface MoveResult {
  accepted: boolean;
  matched: number[];
  source?: "board" | "reserve";
}

export function randomGenerator(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleArray<T>(items: T[], random: () => number): T[] {
  const output = [...items];
  for (let i = output.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
}

export function covers(upper: Tile, lower: Tile): boolean {
  return (
    upper.z > lower.z &&
    Math.abs(upper.x - lower.x) < TILE_SIZE - 1 &&
    Math.abs(upper.y - lower.y) < TILE_SIZE - 1
  );
}

// Geometry never changes during play. A new array after undo/shuffle gets its own index.
const geometry = new WeakMap<Tile[], { length: number; blockers: number[][]; below: number[][] }>();
function geometryFor(tiles: Tile[]) {
  let cached = geometry.get(tiles);
  if (cached?.length === tiles.length) return cached;
  const blockers = tiles.map(() => [] as number[]);
  const below = tiles.map(() => [] as number[]);
  for (const upper of tiles)
    for (const lower of tiles)
      if (covers(upper, lower)) {
        blockers[lower.id].push(upper.id);
        below[upper.id].push(lower.id);
      }
  cached = { length: tiles.length, blockers, below };
  geometry.set(tiles, cached);
  return cached;
}

export function availableTiles(state: Pick<Snapshot, "tiles" | "board">): number[] {
  const present = new Set(state.board);
  const { blockers } = geometryFor(state.tiles);
  return state.board.filter((id) => !blockers[id].some((upper) => present.has(upper)));
}

function removalOrder(tiles: Tile[], ids: number[], random: () => number): number[] {
  const { blockers, below } = geometryFor(tiles);
  const present = new Set(ids);
  const counts = tiles.map((tile) => blockers[tile.id].filter((id) => present.has(id)).length);
  const ready = ids.filter((id) => counts[id] === 0);
  const result: number[] = [];
  while (ready.length) {
    const index = Math.floor(random() * ready.length);
    const [id] = ready.splice(index, 1);
    result.push(id);
    present.delete(id);
    for (const lower of below[id])
      if (present.has(lower) && --counts[lower] === 0) ready.push(lower);
  }
  if (result.length !== ids.length) throw new Error("Invalid cyclic board");
  return result;
}

function kindSequence(groups: number, kindCount: number, random: () => number, hard: boolean, groupCounts?: number[]): number[] {
  if (!hard) return Array.from({ length: groups }, (_, i) => Array(3).fill(i % kindCount)).flat();
  const kinds = shuffleArray(Array.from({ length: kindCount }, (_, i) => i), random);
  const unopened = groupCounts ? [...groupCounts] : Array(kindCount).fill(Math.floor(groups / kindCount)) as number[];
  if (!groupCounts) for (let i = 0; i < groups % kindCount; i++) unopened[kinds[i]]++;
  const carried = Array(kindCount).fill(0) as number[];
  const lastUsed = Array(kindCount).fill(0) as number[];
  const sequence: number[] = [];
  let load = 0;
  while (sequence.length < groups * 3) {
    const grow = kinds.filter((kind) => {
      if (load >= CAPACITY - 1 || carried[kind] === 2) return false;
      if (carried[kind] === 0 && !unopened[kind]) return false;
      // Six different singles would have no legal seventh card. Keep a pair available.
      return load !== 5 || carried[kind] === 1 || carried.some((count) => count === 2);
    });
    const close = kinds.filter((kind) => carried[kind] === 2);
    let kind: number;
    if (grow.length) {
      kind = grow[Math.floor(random() * grow.length)];
    } else if (close.length) {
      // Closing recent pairs keeps older unfinished matches in the basket across deeper layers.
      close.sort((a, b) => lastUsed[b] - lastUsed[a]);
      kind = close[Math.min(close.length - 1, Math.floor(random() * Math.min(2, close.length)))];
    } else throw new Error("No safe continuation for certified sequence");
    if (carried[kind] === 0) unopened[kind]--;
    carried[kind]++;
    load++;
    lastUsed[kind] = sequence.length;
    sequence.push(kind);
    if (carried[kind] === 3) { carried[kind] = 0; load -= 3; }
    if (load >= CAPACITY) throw new Error("Certified sequence overflow");
  }
  if (load) throw new Error("Unfinished certified sequence");
  return sequence;
}

const templates = new Map<string, { tiles: Tile[]; solution: number[] }>();
export function generateLevel(level: number, seed = 1026): GameState {
  level = normalizeLevel(level);
  seed = seed >>> 0;
  const variant = levelVariant(level, seed);
  let template = templates.get(variant.id);
  if (!template) {
    const random = randomGenerator(variant.seed);
    const tiles = buildIrregularTiles(level, variant);
    const solution = removalOrder(tiles, tiles.map((t) => t.id), random);
    const sequence = kindSequence(tiles.length / 3, LEVELS[level].kinds, random, level === 1);
    solution.forEach((id, i) => { tiles[id].kind = sequence[i]; });
    template = { tiles, solution };
    templates.set(variant.id, template);
  }
  // Mirroring and bijective symbol remapping preserve the certified puzzle and its difficulty.
  const random = randomGenerator(seed ^ 0x93a7bc15);
  const symbols = shuffleArray(Array.from({ length: KINDS.length }, (_, i) => i), random);
  const mirror = random() < .5;
  const tiles = template.tiles.map((tile) => ({
    ...tile, kind: symbols[tile.kind], x: mirror ? BOARD_WIDTH - TILE_SIZE - tile.x : tile.x,
  }));
  return {
    tiles, board: tiles.map((t) => t.id), tray: [], reserve: [], status: "playing",
    moves: 0, cleared: 0, tools: { undo: 1, remove: 1, shuffle: 1 },
    solution: [...template.solution], seed, level, variant: variant.id,
  };
}

function snapshot(state: Snapshot): Snapshot {
  return {
    tiles: state.tiles.map((t) => ({ ...t })),
    board: [...state.board],
    tray: [...state.tray],
    reserve: [...state.reserve],
    status: state.status,
    moves: state.moves,
    cleared: state.cleared,
  };
}

/** Reassign only board faces. Keeps the exact multiset and fixed tray/reserve faces. */
export function createReshuffle(
  state: GameState,
  seed: number,
): { tiles: Tile[]; solution: number[] } | null {
  const counts = new Map<number, number>();
  state.board.forEach((id) =>
    counts.set(
      state.tiles[id].kind,
      (counts.get(state.tiles[id].kind) ?? 0) + 1,
    ),
  );
  const tiles = state.tiles.map((t) => ({ ...t }));
  const order = removalOrder(tiles, state.board, randomGenerator(seed));
  const tray = state.tray.map((id) => tiles[id].kind);
  const reserve = [...state.reserve];
  const solution: number[] = [];
  let cursor = 0;
  while (cursor < order.length || reserve.length) {
    // Clear the fixed carried cards first, then keep the remaining hard puzzle interleaved.
    // A shuffle must not turn the whole second stage into consecutive easy triples.
    if (state.level === 1 && !tray.length && !reserve.length) {
      if ([...counts.values()].some((count) => count % 3 !== 0)) return null;
      const sequence = kindSequence((order.length - cursor) / 3, KINDS.length,
        randomGenerator(seed ^ 0x72ab3159), true,
        Array.from({ length: KINDS.length }, (_, kind) => (counts.get(kind) ?? 0) / 3));
      order.slice(cursor).forEach((id, i) => { tiles[id].kind = sequence[i]; solution.push(id); });
      return { tiles, solution };
    }
    const targets = Array.from(
      new Set([
        ...tray,
        ...reserve.map((id) => tiles[id].kind),
        ...counts.keys(),
      ]),
    )
      .filter(
        (kind) =>
          (counts.get(kind) ?? 0) +
            reserve.filter((id) => tiles[id].kind === kind).length >
          0,
      )
      .sort(
        (a, b) =>
          tray.filter((k) => k === b).length -
          tray.filter((k) => k === a).length,
      );
    const target = targets.find((kind) => {
      const needed = 3 - tray.filter((k) => k === kind).length;
      const remaining =
        (counts.get(kind) ?? 0) +
        reserve.filter((id) => tiles[id].kind === kind).length;
      return remaining >= needed && tray.length + needed - 1 < CAPACITY;
    });
    if (target === undefined) return null;
    const needed = 3 - tray.filter((k) => k === target).length;
    for (let i = 0; i < needed; i++) {
      const reserveIndex = reserve.findIndex((id) => tiles[id].kind === target);
      if (reserveIndex !== -1) {
        solution.push(reserve.splice(reserveIndex, 1)[0]);
      } else {
        const id = order[cursor++];
        if (id === undefined || !(counts.get(target) ?? 0)) return null;
        tiles[id].kind = target;
        counts.set(target, counts.get(target)! - 1);
        solution.push(id);
      }
      tray.push(target);
    }
    for (let i = tray.length - 1; i >= 0; i--)
      if (tray[i] === target) tray.splice(i, 1);
  }
  return tray.length ? null : { tiles, solution };
}

export class Game {
  state: GameState;
  private previous: Snapshot | null = null;
  constructor(level: number, seed?: number) {
    this.state = generateLevel(level, seed);
  }

  pick(id: number): MoveResult {
    const state = this.state;
    const source = state.reserve.includes(id) ? "reserve" : "board";
    if (
      state.status !== "playing" ||
      !Number.isInteger(id) ||
      !state.tiles[id] ||
      (source === "board" && !availableTiles(state).includes(id))
    )
      return { accepted: false, matched: [] };
    this.previous = snapshot(state);
    const container = source === "board" ? state.board : state.reserve;
    container.splice(container.indexOf(id), 1);
    const kind = state.tiles[id].kind;
    const last = state.tray.findLastIndex(
      (tid) => state.tiles[tid].kind === kind,
    );
    state.tray.splice(last < 0 ? state.tray.length : last + 1, 0, id);
    state.moves++;
    const same = state.tray.filter((tid) => state.tiles[tid].kind === kind);
    const matched = same.length === 3 ? same : [];
    if (matched.length) {
      state.tray = state.tray.filter((tid) => !matched.includes(tid));
      state.cleared += 3;
    }
    if (!state.board.length && !state.tray.length && !state.reserve.length)
      state.status = "won";
    else if (state.tray.length >= CAPACITY) state.status = "lost";
    return { accepted: true, matched, source };
  }

  undo(): boolean {
    if (!this.state.tools.undo || !this.previous || this.state.status === "won")
      return false;
    const tools = { ...this.state.tools, undo: this.state.tools.undo - 1 };
    Object.assign(this.state, this.previous, { tools });
    this.previous = null;
    return true;
  }

  remove(): boolean {
    const state = this.state;
    if (
      !state.tools.remove ||
      !state.tray.length ||
      state.reserve.length ||
      state.status === "won"
    )
      return false;
    state.reserve.push(...state.tray.splice(0, 3));
    state.tools.remove--;
    state.status = "playing";
    this.previous = null;
    return true;
  }

  shuffle(): boolean {
    if (
      !this.state.tools.shuffle ||
      this.state.status !== "playing" ||
      !this.state.board.length
    )
      return false;
    const result = createReshuffle(
      this.state,
      this.state.seed + this.state.moves * 97 + 17,
    );
    if (!result) return false;
    this.state.tiles = result.tiles;
    this.state.solution = result.solution;
    this.state.tools.shuffle--;
    this.previous = null;
    return true;
  }

  canUndo(): boolean {
    return (
      !!this.previous && !!this.state.tools.undo && this.state.status !== "won"
    );
  }
}

export function shanghaiDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return ["year", "month", "day"]
    .map((type) => parts.find((p) => p.type === type)!.value)
    .join("-");
}

export function dailySeed(day = shanghaiDate()): number {
  return [...`meadow-${day}`].reduce(
    (hash, char) => (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0,
    7,
  );
}
