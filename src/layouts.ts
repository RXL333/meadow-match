import type { Tile } from "./game";
import type { LevelVariant } from "./levels";

type Point = readonly [number, number];
const STEP = 55;
const LEFT = 18;
const TOP = 17;
const CAPS: readonly (readonly Point[])[] = [
  [[1.5,.5],[5.1,.6],[3.7,1.7],[.5,2.6],[2.6,6.4],[4.7,6.95]],
  [[2.4,.5],[4.7,.7],[1.1,2.3],[4,3.7],[.6,5.1],[4.8,6.8]],
  [[1.4,.6],[4.6,.5],[2.7,2.1],[.6,3.7],[4.8,4.9],[2.5,6.8]],
  [[1.5,.6],[4.8,1.3],[.6,2.5],[3.4,3.5],[1.6,5.6],[4.7,6.8]],
  [[2.4,.5],[4.9,1.5],[.6,2.5],[3.4,4.2],[.7,5.7],[4.7,6.7]],
  [[1.5,.5],[4.7,.6],[.6,2.6],[3.6,3.3],[1.7,5.3],[4.7,6.8]],
];

export function boardHeight(level: number): number {
  return level === 0 ? 242 : 482;
}

export function buildIrregularTiles(level: number, variant: LevelVariant): Tile[] {
  const tiles: Tile[] = [];
  const add = (x: number, y: number, z: number) =>
    tiles.push({ id: tiles.length, kind: 0, x, y, z });
  if (level === 0) {
    const cols = variant.tiles === 12 ? 4 : 5;
    const left = (420 - ((cols - 1) * STEP + 54)) / 2;
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < cols; col++) add(left + col * STEP, 38 + row * STEP, 0);
    if (variant.tiles === 18)
      for (const [col, row] of [[.5,.5],[2.5,.5],[1.5,1.5]])
        add(left + col * STEP, 38 + row * STEP, 1);
    return tiles;
  }
  // A connected seven-column field, with space for the two deep corner stacks.
  for (let row = 0; row < 8; row++)
    for (let col = 0; col < 7; col++) {
      if ((col === 0 && row < 2) || (col === 6 && row >= 6)) continue;
      add(LEFT + col * STEP, TOP + row * STEP, 0);
    }
  const caps = CAPS[variant.pattern];
  const capCount = variant.tiles - variant.depth * 2 - tiles.length;
  for (let i = 0; i < capCount; i++) {
    const layer = Math.floor(i / caps.length);
    const [col, row] = caps[i % caps.length];
    const shiftX = [0, -5, 5][layer % 3];
    const shiftY = [0, -5, -10][layer % 3];
    add(LEFT + col * STEP + shiftX, TOP + row * STEP + shiftY, layer + 1);
  }
  for (let i = 0; i < variant.depth; i++) {
    const offset = (variant.depth - 1 - i) * 48 / (variant.depth - 1);
    add(LEFT, TOP + STEP - offset, 64 + i);
    add(LEFT + 6 * STEP, TOP + 7 * STEP - offset, 64 + i);
  }
  return tiles;
}
