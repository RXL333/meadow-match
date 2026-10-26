import type { Tile } from "./game";

type Point = readonly [number, number];

// Authored silhouettes: gaps, off-axis branches and separate edge stacks.
// Cards stay upright. Their positions, rather than decorative rotations, form the layout.
const GROUND: Point[] = [
  [142, 18],
  [205, 6],
  [270, 32],
  [76, 58],
  [141, 84],
  [207, 70],
  [286, 96],
  [18, 119],
  [81, 125],
  [145, 145],
  [209, 136],
  [311, 160],
  [58, 192],
  [123, 209],
  [188, 204],
  [253, 225],
  [145, 272],
  [328, 27],
];
const BRANCHES: Point[] = [
  [105, 37],
  [171, 48],
  [246, 84],
  [60, 103],
  [125, 133],
  [214, 155],
  [75, 199],
  [155, 220],
  [282, 204],
  [322, 133],
  [38, 34],
  [232, 265],
];
const ISLANDS: Point[] = [
  [143, 101],
  [213, 108],
  [104, 185],
  [37, 73],
  [219, 20],
  [281, 146],
  [78, 259],
  [177, 254],
  [310, 70],
  [73, 7],
  [246, 217],
  [165, 182],
];
const TRAILS: Point[] = [
  [105, 15],
  [173, 45],
  [239, 65],
  [305, 18],
  [45, 127],
  [113, 145],
  [182, 118],
  [304, 128],
  [81, 224],
  [149, 246],
  [220, 194],
  [283, 236],
];

export const LEVEL_TILE_COUNTS = [
  36, 42, 48, 54, 60, 66, 72, 78, 84, 90,
] as const;
const EDGE_DEPTHS = [3, 4, 5, 6, 6, 7, 8, 9, 9, 10] as const;

export function buildIrregularTiles(
  level: number,
  random: () => number,
): Tile[] {
  const tiles: Tile[] = [];
  const variant = (Math.floor(random() * 4) + level) % 4;
  const flipX = !!(variant & 1);
  const flipY = !!(variant & 2);
  const add = (x: number, y: number, z: number) => {
    tiles.push({
      id: tiles.length,
      kind: 0,
      z,
      x: flipX ? 366 - x : x,
      y: flipY ? 280 - y : y,
    });
  };

  const coreCount = LEVEL_TILE_COUNTS[level] - EDGE_DEPTHS[level] * 2;
  const layers: Point[][] = [
    GROUND,
    BRANCHES,
    ISLANDS,
    TRAILS,
    BRANCHES.map(([x, y]) => [x + 12, y - 8] as const),
    ISLANDS.map(([x, y]) => [x + 8, y + 4] as const),
  ];
  let remaining = coreCount;
  for (let z = 0; remaining > 0; z++) {
    const layer = layers[z];
    if (!layer) throw new Error("Missing authored board layer");
    const limit = z === 1 && level < 2 ? 9 + level : layer.length;
    const take = Math.min(limit, remaining);
    layer.slice(0, take).forEach(([x, y]) => add(x, y, z));
    remaining -= take;
  }

  for (let z = 0; z < EDGE_DEPTHS[level]; z++) {
    add(12 + z * 2, 255 - z * 4, z);
    add(345 - z * 2, 270 - z * 4, z);
  }
  return tiles;
}
