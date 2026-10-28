import { describe, expect, test } from "vitest";
import {
  Game,
  LEVEL_POOLS,
  levelVariant,
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
import { boardHeight } from "../src/layouts";

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

describe("two-stage certified puzzle bank", () => {
  test("three easy and six hard templates stay inside the board without same-layer overlap", () => {
    expect(LEVEL_POOLS.map((pool) => pool.length)).toEqual([3, 6]);
    for (let level = 0; level < 2; level++) for (let seed = 0; seed < 36; seed++) {
      const { tiles } = generateLevel(level, seed);
      expect(tiles).toHaveLength(levelVariant(level, seed).tiles);
      for (const tile of tiles) {
        expect(tile.x).toBeGreaterThanOrEqual(0);
        expect(tile.y).toBeGreaterThanOrEqual(0);
        expect(tile.x + TILE_SIZE).toBeLessThanOrEqual(BOARD_WIDTH);
        expect(tile.y + TILE_SIZE).toBeLessThanOrEqual(boardHeight(level));
        for (const other of tiles) {
          if (tile.id >= other.id || tile.z !== other.z) continue;
          expect(Math.abs(tile.x - other.x) >= TILE_SIZE || Math.abs(tile.y - other.y) >= TILE_SIZE,
            `${level}/${seed}: ${tile.id},${other.id}`).toBe(true);
        }
      }
    }
  });

  test("all hard layouts retain connected seven-column bases, seam caps and two deep stacks", () => {
    for (let i = 0; i < 6; i++) {
      const state = generateLevel(1, i * 3);
      const base = state.tiles.filter((tile) => tile.z === 0);
      const visited = new Set([base[0].id]); const pending = [base[0]];
      while (pending.length) {
        const current = pending.pop()!;
        for (const tile of base) {
          const dx = Math.abs(tile.x - current.x), dy = Math.abs(tile.y - current.y);
          if (!visited.has(tile.id) && ((dx === 55 && dy === 0) || (dy === 55 && dx === 0))) {
            visited.add(tile.id); pending.push(tile);
          }
        }
      }
      expect(visited.size).toBe(base.length);
      expect(new Set(base.map((tile) => tile.x)).size).toBe(7);
      expect(base.length).toBe(52);
      for (const cap of state.tiles.filter((tile) => tile.z > 0 && tile.z < 64))
        expect(base.filter((tile) => covers(cap, tile)).length, `${state.variant}: cap ${cap.id} at ${cap.x},${cap.y}`).toBeGreaterThanOrEqual(2);
      expect(state.tiles.filter((tile) => tile.z >= 64)).toHaveLength(LEVEL_POOLS[1][i].depth * 2);
    }
  });

  test("every pairing, mirror and symbol permutation has a complete legal no-tool winning path", () => {
    const seen = [new Set<string>(), new Set<string>()];
    for (let level = 0; level < 2; level++) for (let seed = 0; seed < 180; seed++) {
      const game = new Game(level, seed); seen[level].add(game.state.variant);
      for (const id of [...game.state.solution]) {
        expect(game.pick(id).accepted).toBe(true);
        expect(game.state.status).not.toBe("lost");
      }
      expect(game.state.status).toBe("won");
      expect(game.state.tools).toEqual({ undo: 1, remove: 1, shuffle: 1 });
    }
    expect(seen.map((set) => set.size)).toEqual([3, 6]);
  }, 30000);

  test("easy stages are forgiving even with random legal choices", () => {
    for (let seed = 0; seed < 60; seed++) {
      const game = new Game(0, seed);
      while (game.state.status === "playing") {
        const available = availableTiles(game.state);
        game.pick(available[(seed + game.state.moves * 7) % available.length]);
      }
      expect(game.state.status).toBe("won");
    }
  });

  test("seeded replay is identical and a different pairing changes both stage templates", () => {
    expect(generateLevel(1, 7)).toEqual(generateLevel(1, 7));
    for (let seed = 0; seed < 18; seed++) {
      expect(levelVariant(0, seed + 7).id).not.toBe(levelVariant(0, seed).id);
      expect(levelVariant(1, seed + 7).id).not.toBe(levelVariant(1, seed).id);
    }
  });

  test("hard shuffle preserves geometry and counts without dropping difficulty to easy triples", () => {
    for (let variant = 0; variant < 6; variant++) {
      const game = new Game(1, variant * 3);
      const before = multiset(game.state);
      const geometry = game.state.tiles.map(({ id, x, y, z }) => ({ id, x, y, z }));
      expect(game.shuffle()).toBe(true);
      expect(multiset(game.state)).toEqual(before);
      expect(game.state.tiles.map(({ id, x, y, z }) => ({ id, x, y, z }))).toEqual(geometry);
      let pressured = 0;
      for (const id of [...game.state.solution]) {
        expect(game.pick(id).accepted).toBe(true);
        expect(game.state.status).not.toBe("lost");
        if (game.state.tray.length >= 5) pressured++;
      }
      expect(game.state.status).toBe("won");
      expect(pressured / game.state.tiles.length).toBeGreaterThan(.5);
    }
  });

  test("shuffle with fixed tray and reserve preserves cards and a complete winning path", () => {
    for (let seed = 0; seed < 36; seed++) {
      const game = new Game(1, seed);
      const start = [...game.state.solution];
      start.slice(0, 4).forEach((id) => game.pick(id));
      game.remove();
      const before = multiset(game.state);
      const fixed = [...game.state.tray, ...game.state.reserve];
      const kinds = fixed.map((id) => game.state.tiles[id].kind);
      expect(game.shuffle()).toBe(true);
      expect(multiset(game.state)).toEqual(before);
      expect(fixed.map((id) => game.state.tiles[id].kind)).toEqual(kinds);
      for (const id of [...game.state.solution]) {
        expect(game.pick(id).accepted).toBe(true);
        expect(game.state.status).not.toBe("lost");
      }
      expect(game.state.status).toBe("won");
      expect(game.shuffle()).toBe(false);
    }
  });

  test("six different singles cannot be rescued by a fake shuffle and consume no tool", () => {
    const game = fixture([0,1,2,3,4,5,0,0,1,1,2,2,3,3,4,4,5,5], [0,1,2,3,4,5]);
    expect(createReshuffle(game.state, 42)).toBe(null);
    expect(game.shuffle()).toBe(false);
    expect(game.state.tools.shuffle).toBe(1);
  });
});
