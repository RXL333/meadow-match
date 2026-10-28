export interface LevelVariant {
  id: string;
  name: string;
  tiles: number;
  depth: number;
  pattern: number;
  seed: number;
}

export const LEVELS = [
  { name: "简单关", subtitle: "先收集一份小美好", kinds: 3, pressure: 1 },
  { name: "极难关", subtitle: "看得远一点，才走得到最后", kinds: 12, pressure: 6 },
] as const;

export const LEVEL_POOLS: readonly (readonly LevelVariant[])[] = [
  [
    { id: "berry", name: "草莓初见", tiles: 12, depth: 0, pattern: 0, seed: 1031 },
    { id: "sunny", name: "暖阳草甸", tiles: 15, depth: 0, pattern: 1, seed: 2063 },
    { id: "clover", name: "四叶小径", tiles: 18, depth: 1, pattern: 2, seed: 3097 },
  ],
  [
    { id: "mist", name: "迷雾牧场", tiles: 144, depth: 16, pattern: 0, seed: 4109 },
    { id: "towers", name: "双塔秘境", tiles: 156, depth: 18, pattern: 1, seed: 5219 },
    { id: "bramble", name: "荆棘回廊", tiles: 168, depth: 20, pattern: 2, seed: 6323 },
    { id: "forest", name: "深林叠影", tiles: 180, depth: 22, pattern: 3, seed: 7433 },
    { id: "moon", name: "月下迷径", tiles: 192, depth: 24, pattern: 4, seed: 8537 },
    { id: "stars", name: "星光终局", tiles: 204, depth: 26, pattern: 5, seed: 9649 },
  ],
];

export function normalizeLevel(level: number): number {
  return Number.isFinite(level) ? Math.max(0, Math.min(1, Math.floor(level))) : 0;
}

export function levelVariant(level: number, seed: number): LevelVariant {
  const stage = normalizeLevel(level);
  const index = stage === 0 ? (seed >>> 0) % 3 : Math.floor((seed >>> 0) / 3) % 6;
  return LEVEL_POOLS[stage][index];
}
