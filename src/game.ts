import { boardHeight, buildIrregularTiles } from "./layouts";

export const TILE_SIZE = 54;
export const BOARD_WIDTH = 420;
export const BOARD_HEIGHT = boardHeight(9);
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

export const LEVELS = [
  { name: "初见牧场", subtitle: "从三份小美好开始", kinds: 5, pressure: 2 },
  { name: "草莓来信", subtitle: "藏在叶子下的小惊喜", kinds: 6, pressure: 2 },
  { name: "午后微风", subtitle: "慢一点，也没有关系", kinds: 7, pressure: 3 },
  { name: "麦田散步", subtitle: "给下一步留一点余地", kinds: 8, pressure: 3 },
  { name: "蘑菇秘境", subtitle: "向更深处找找看", kinds: 9, pressure: 3 },
  { name: "南瓜小屋", subtitle: "收好这份秋日礼物", kinds: 10, pressure: 4 },
  { name: "林间拾光", subtitle: "让每一次选择都发光", kinds: 11, pressure: 4 },
  {
    name: "四叶心愿",
    subtitle: "幸运也偏爱有准备的羊",
    kinds: 12,
    pressure: 4,
  },
  {
    name: "云朵来客",
    subtitle: "距离好消息又近了一点",
    kinds: 12,
    pressure: 5,
  },
  { name: "星光牧场", subtitle: "把整片星光收入囊中", kinds: 12, pressure: 5 },
] as const;

export interface Tile {
  id: number;
  kind: number;
  x: number;
  y: number;
  z: number;
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

export function availableTiles(
  state: Pick<Snapshot, "tiles" | "board">,
): number[] {
  const present = new Set(state.board);
  return state.board.filter(
    (id) =>
      !state.tiles.some(
        (tile) => present.has(tile.id) && covers(tile, state.tiles[id]),
      ),
  );
}

function removalOrder(
  tiles: Tile[],
  ids: number[],
  random: () => number,
): number[] {
  const remaining = [...ids];
  const result: number[] = [];
  while (remaining.length) {
    const available = availableTiles({ tiles, board: remaining });
    const chosen = available[Math.floor(random() * available.length)];
    if (chosen === undefined) throw new Error("Invalid cyclic board");
    result.push(chosen);
    remaining.splice(remaining.indexOf(chosen), 1);
  }
  return result;
}

function boundedSequence(
  groups: number,
  kindCount: number,
  pressure: number,
  random: () => number,
  tutorial: boolean,
): number[] {
  const result: number[] = [];
  while (groups > 0) {
    const size = tutorial && !result.length ? 1 : Math.min(groups, pressure);
    const kinds = shuffleArray(
      Array.from({ length: kindCount }, (_, i) => i),
      random,
    ).slice(0, size);
    const batch = kinds.flatMap((kind) => [kind, kind, kind]);
    let accepted: number[] | undefined;
    for (let attempt = 0; attempt < 500; attempt++) {
      const candidate = shuffleArray(batch, random);
      const tray: number[] = [];
      const valid = candidate.every((kind) => {
        tray.push(kind);
        if (tray.filter((k) => k === kind).length === 3) {
          for (let i = tray.length - 1; i >= 0; i--)
            if (tray[i] === kind) tray.splice(i, 1);
        }
        return tray.length < CAPACITY;
      });
      if (valid) {
        accepted = candidate;
        break;
      }
    }
    result.push(...(accepted ?? batch));
    groups -= size;
  }
  return result;
}

export function generateLevel(
  level: number,
  seed = 1026 + level * 7919,
): GameState {
  level = Math.max(0, Math.min(LEVELS.length - 1, Math.floor(level)));
  const random = randomGenerator(seed);
  const tiles = buildIrregularTiles(level, random);
  const board = tiles.map((t) => t.id);
  const solution = removalOrder(tiles, board, random);
  const config = LEVELS[level];
  const sequence = boundedSequence(
    tiles.length / 3,
    config.kinds,
    config.pressure,
    random,
    level === 0,
  );
  solution.forEach((id, i) => {
    tiles[id].kind = sequence[i];
  });
  return {
    tiles,
    board,
    tray: [],
    reserve: [],
    status: "playing",
    moves: 0,
    cleared: 0,
    tools: { undo: 1, remove: 1, shuffle: 1 },
    solution,
    seed,
    level,
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
