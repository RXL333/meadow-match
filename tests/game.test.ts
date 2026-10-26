import { describe, expect, test } from "vitest";
import {
  Game,
  availableTiles,
  createReshuffle,
  generateLevel,
  dailySeed,
  shanghaiDate,
  covers,
  TILE_SIZE,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  type GameState,
  type Tile,
} from "../src/game";
import { LEVEL_TILE_COUNTS } from "../src/layouts";

function fixture(kinds: number[], tray: number[] = []): Game {
  const game = new Game(0);
  const tiles: Tile[] = kinds.map((kind, id) => ({
    id,
    kind,
    x: id * 60,
    y: 0,
    z: 0,
  }));
  game.state = {
    ...game.state,
    tiles,
    board: tiles.map((t) => t.id).filter((id) => !tray.includes(id)),
    tray,
    reserve: [],
    status: "playing",
    moves: 0,
    cleared: 0,
  };
  return game;
}

function multiset(state: GameState): number[] {
  return [...state.board, ...state.tray, ...state.reserve]
    .map((id) => state.tiles[id].kind)
    .sort((a, b) => a - b);
}

describe("rules and transactions", () => {
  test("covered cards cannot be selected or selected twice", () => {
    const game = new Game(0);
    const available = availableTiles(game.state);
    const blocked = game.state.board.find((id) => !available.includes(id))!;
    expect(game.pick(blocked).accepted).toBe(false);
    expect(game.pick(available[0]).accepted).toBe(true);
    expect(game.pick(available[0]).accepted).toBe(false);
    expect(game.state.moves).toBe(1);
  });
  test("the seventh card resolves a triple before checking failure", () => {
    const game = fixture([0, 0, 1, 2, 3, 4, 0], [0, 1, 2, 3, 4, 5]);
    expect(game.pick(6).matched).toHaveLength(3);
    expect(game.state.tray).toHaveLength(4);
    expect(game.state.status).toBe("playing");
  });
  test("the seventh nonmatching card loses and undo recovers", () => {
    const game = fixture([0, 1, 2, 3, 4, 5, 6], [0, 1, 2, 3, 4, 5]);
    game.pick(6);
    expect(game.state.status).toBe("lost");
    expect(game.undo()).toBe(true);
    expect(game.state.status).toBe("playing");
    expect(game.state.tray).toHaveLength(6);
    expect(game.state.board).toEqual([6]);
    expect(game.undo()).toBe(false);
  });
  test("undo restores a completed triple as one entire transaction", () => {
    const game = fixture([0, 0, 0]);
    game.pick(0);
    game.pick(1);
    // Keep the game unfinished so that undo is available after a match.
    game.state.tiles.push({ id: 3, kind: 1, x: 200, y: 0, z: 0 });
    game.state.board.push(3);
    const before = structuredClone(game.state);
    game.pick(2);
    expect(game.state.cleared).toBe(3);
    expect(game.undo()).toBe(true);
    expect(game.state.tray).toEqual(before.tray);
    expect(game.state.board).toEqual(before.board);
    expect(game.state.cleared).toBe(0);
    expect(game.state.moves).toBe(2);
  });
  test("removed cards remain in reserve and must also be cleared to win", () => {
    const game = fixture([0, 1, 2, 0, 1, 2, 0, 1, 2]);
    game.pick(0);
    game.pick(1);
    game.pick(2);
    expect(game.remove()).toBe(true);
    expect(game.state.reserve).toEqual([0, 1, 2]);
    expect(game.state.tray).toHaveLength(0);
    expect(game.remove()).toBe(false);
    for (const id of [3, 6, 0, 4, 7, 1, 5, 8, 2])
      expect(game.pick(id).accepted).toBe(true);
    expect(game.state.status).toBe("won");
    expect(game.state.reserve).toEqual([]);
  });
  test("taking the last board card does not win while unmatched cards remain", () => {
    const game = fixture([0, 1, 2]);
    [0, 1, 2].forEach((id) => game.pick(id));
    expect(game.state.board).toEqual([]);
    expect(game.state.status).toBe("playing");
  });
});

describe("generation and certified reshuffle", () => {
  test("irregular layouts fit the board without overlapping cards in the same layer", () => {
    for (let level = 0; level < 10; level++) {
      for (let seed = 1; seed <= 40; seed++) {
        const { tiles } = generateLevel(level, seed);
        expect(tiles).toHaveLength(LEVEL_TILE_COUNTS[level]);
        for (const tile of tiles) {
          expect(tile.x).toBeGreaterThanOrEqual(0);
          expect(tile.y).toBeGreaterThanOrEqual(0);
          expect(tile.x + TILE_SIZE).toBeLessThanOrEqual(BOARD_WIDTH);
          expect(tile.y + TILE_SIZE).toBeLessThanOrEqual(BOARD_HEIGHT);
          for (const other of tiles) {
            if (tile.id >= other.id || tile.z !== other.z) continue;
            expect(
              Math.abs(tile.x - other.x) >= TILE_SIZE ||
                Math.abs(tile.y - other.y) >= TILE_SIZE,
              `level ${level + 1}, seed ${seed}: same-layer cards ${tile.id} and ${other.id}`,
            ).toBe(true);
          }
        }
      }
    }
  });
  test("the opening board offers two separate layered edge stacks", () => {
    const state = generateLevel(0);
    const stacks = availableTiles(state).filter(
      (id) =>
        state.tiles.filter(
          (tile) =>
            covers(state.tiles[id], tile) &&
            Math.abs(tile.x - state.tiles[id].x) <= 12 &&
            Math.abs(tile.y - state.tiles[id].y) <= 20,
        ).length >= 2,
    );
    expect(stacks.length).toBeGreaterThanOrEqual(2);
  });
  test("reshuffling preserves the irregular geometry as well as tile counts", () => {
    const game = new Game(9);
    const geometry = game.state.tiles.map(({ id, x, y, z }) => ({
      id,
      x,
      y,
      z,
    }));
    expect(game.shuffle()).toBe(true);
    expect(
      game.state.tiles.map(({ id, x, y, z }) => ({ id, x, y, z })),
    ).toEqual(geometry);
  });
  test("all 10 levels, across 40 seeds each, have a legal winning path", () => {
    for (let level = 0; level < 10; level++)
      for (let seed = 1; seed <= 40; seed++) {
        const game = new Game(level, seed);
        const solution = [...game.state.solution];
        for (const id of solution) {
          expect(availableTiles(game.state)).toContain(id);
          expect(game.pick(id).accepted).toBe(true);
          expect(game.state.status).not.toBe("lost");
        }
        expect(game.state.status).toBe("won");
        expect(game.state.cleared).toBe(game.state.tiles.length);
      }
  }, 30000);
  test("same seed produces the same board", () => {
    expect(generateLevel(7, 123)).toEqual(generateLevel(7, 123));
    expect(generateLevel(7, 123).tiles).not.toEqual(
      generateLevel(7, 124).tiles,
    );
  });
  test("shuffle preserves all tile counts and yields a legal winning path with a nonempty tray and reserve", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const game = new Game(7, seed);
      const start = [...game.state.solution];
      start.slice(0, 4).forEach((id) => game.pick(id));
      game.remove();
      const kindBefore = multiset(game.state);
      const fixedIds = [...game.state.tray, ...game.state.reserve];
      const fixedKinds = fixedIds.map((id) => game.state.tiles[id].kind);
      expect(game.shuffle()).toBe(true);
      expect(multiset(game.state)).toEqual(kindBefore);
      expect(fixedIds.map((id) => game.state.tiles[id].kind)).toEqual(
        fixedKinds,
      );
      const solution = [...game.state.solution];
      for (const id of solution) {
        expect(game.pick(id).accepted).toBe(true);
        expect(game.state.status).not.toBe("lost");
      }
      expect(game.state.status).toBe("won");
      expect(game.state.tools.shuffle).toBe(0);
      expect(game.shuffle()).toBe(false);
    }
  });
  test("six different tray cards cannot be rescued by shuffling and must not consume the tool", () => {
    const game = fixture(
      [0, 1, 2, 3, 4, 5, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
      [0, 1, 2, 3, 4, 5],
    );
    expect(createReshuffle(game.state, 42)).toBe(null);
    expect(game.shuffle()).toBe(false);
    expect(game.state.tools.shuffle).toBe(1);
  });
  test("daily reset is based on Shanghai midnight and deterministic per day", () => {
    expect(shanghaiDate(new Date("2026-10-26T15:59:59Z"))).toBe("2026-10-26");
    expect(shanghaiDate(new Date("2026-10-26T16:00:00Z"))).toBe("2026-10-27");
    expect(dailySeed("2026-10-26")).toBe(dailySeed("2026-10-26"));
    expect(dailySeed("2026-10-26")).not.toBe(dailySeed("2026-10-27"));
  });
});
