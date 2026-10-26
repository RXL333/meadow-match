import type { Tile } from "./game";

type Point = readonly [number, number];

export const LEVEL_TILE_COUNTS = [
  36, 42, 48, 54, 60, 66, 72, 78, 84, 90,
] as const;
const ROW_COUNTS = [4, 4, 5, 5, 6, 6, 7, 7, 8, 8] as const;
const EDGE_DEPTHS = [3, 4, 5, 6, 6, 7, 8, 9, 9, 10] as const;
const STEP = 55;
const LEFT = 18;
const TOP = 17;

export function boardHeight(level: number): number {
  return ROW_COUNTS[level] * STEP + 42;
}

export function buildIrregularTiles(
  level: number,
  random: () => number,
): Tile[] {
  const tiles: Tile[] = [];
  const rows = ROW_COUNTS[level];
  const flipX = random() < 0.5;
  const add = (x: number, y: number, z: number) => {
    tiles.push({ id: tiles.length, kind: 0, z, x: flipX ? 366 - x : x, y });
  };

  // A close-packed seven-column field, with two corners cut out for deep piles.
  // The silhouette stays continuous instead of scattering individual cards.
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < 7; col++) {
      if ((col === 0 && row < 2) || (col === 6 && row >= rows - 2)) continue;
      add(LEFT + col * STEP, TOP + row * STEP, 0);
    }
  }

  // Six local, off-grid caps cross the seams of the base field. Later levels
  // deepen these small clusters while retaining the reference's broad face-up area.
  const caps: Point[] = [
    [1.5, 0.5],
    [5.1, 0.6],
    [3.7, 1.7],
    [0.5, 2.6],
    [2.6, rows - 1.6],
    [4.7, rows - 1.05],
  ];
  const capCount = LEVEL_TILE_COUNTS[level] - EDGE_DEPTHS[level] * 2 - tiles.length;
  for (let i = 0; i < capCount; i++) {
    const layer = Math.floor(i / caps.length);
    const [col, row] = caps[i % caps.length];
    const shift = layer % 2 ? -7 : 0;
    add(LEFT + col * STEP + shift, TOP + row * STEP - layer * 6, layer + 1);
  }

  // Front cards stay on the field's grid; their exposed backs fan upward.
  for (let i = 0; i < EDGE_DEPTHS[level]; i++) {
    const offset = (EDGE_DEPTHS[level] - 1 - i) * 5;
    add(LEFT, TOP + STEP - offset, 8 + i);
    add(LEFT + 6 * STEP, TOP + (rows - 1) * STEP - offset, 8 + i);
  }
  return tiles;
}
