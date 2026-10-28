import { test, expect } from "vitest";
import { measureDifficulty } from "./helpers/difficulty";

test("every hard template has a high-pressure no-tool path and resists local matching", () => {
  const reports = Array.from({ length: 6 }, (_, i) => measureDifficulty(i * 3));
  console.table(reports);
  for (const report of reports) {
    expect(report.witnessWon, report.variant).toBe(true);
    expect(report.peak, report.variant).toBe(6);
    expect(report.pressureShare, report.variant).toBeGreaterThan(.5);
    expect(report.frontKinds, report.variant).toBeGreaterThanOrEqual(6);
    expect(report.greedyWins, report.variant).toBeLessThanOrEqual(1);
  }
}, 30000);
