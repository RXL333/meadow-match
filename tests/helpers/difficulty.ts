import { Game, availableTiles, randomGenerator } from "../../src/game";

export function measureDifficulty(seed: number, trials = 32) {
  const witness = new Game(1, seed);
  const initial = witness.state;
  const front = availableTiles(initial);
  let peak = 0;
  let pressured = 0;
  for (const id of [...initial.solution]) {
    if (!witness.pick(id).accepted || witness.state.status === "lost") throw new Error("Invalid witness");
    peak = Math.max(peak, witness.state.tray.length);
    if (witness.state.tray.length >= 5) pressured++;
  }
  let wins = 0;
  let totalMoves = 0;
  for (let run = 0; run < trials; run++) {
    const game = new Game(1, seed);
    const random = randomGenerator(8317 + run * 104729);
    while (game.state.status === "playing") {
      const state = game.state;
      const available = availableTiles(state);
      if (!available.length) break;
      const tray = new Map<number, number>();
      const visible = new Map<number, number>();
      for (const id of state.tray) tray.set(state.tiles[id].kind, (tray.get(state.tiles[id].kind) ?? 0) + 1);
      for (const id of available) visible.set(state.tiles[id].kind, (visible.get(state.tiles[id].kind) ?? 0) + 1);
      const ranked = available.map((id) => {
        const kind = state.tiles[id].kind;
        const count = tray.get(kind) ?? 0;
        // The bot sees exposed faces and local matches, never the certified solution.
        const complete = (visible.get(kind) ?? 0) >= 3 - count;
        const score = (complete ? 1000 : 0) + count * (run % 2 ? 80 : 30) +
          (visible.get(kind) ?? 0) * 3 + random() * (run % 3 ? 8 : 25);
        return { id, score };
      }).sort((a, b) => b.score - a.score);
      game.pick(ranked[0].id);
    }
    if (game.state.status === "won") wins++;
    totalMoves += game.state.moves;
  }
  return {
    variant: initial.variant, tiles: initial.tiles.length, peak,
    pressureShare: pressured / initial.tiles.length,
    frontKinds: new Set(front.map((id) => initial.tiles[id].kind)).size,
    greedyWins: wins, greedyTrials: trials, greedyAverageMoves: totalMoves / trials,
    witnessWon: witness.state.status === "won",
  };
}
