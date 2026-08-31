import { describe, expect, it } from "vitest";

import { COLS, HIDDEN_ROWS, POP_MIN, ROWS } from "./config";
import {
  applyGravity,
  emptyGrid,
  findGroups,
  isAllClear,
  isTopOut,
  resolveChains,
} from "./engine";

import type { Cell, Grid } from "./types";

/** Build a grid from rows of digits, bottom-aligned. "." = empty. */
function board(...rows: string[]): Grid {
  const g = emptyGrid();
  rows.forEach((row, i) => {
    const r = ROWS - rows.length + i;
    [...row].forEach((ch, c) => {
      if (ch !== ".") g[r][c] = Number(ch) as Cell;
    });
  });
  return g;
}

const count = (g: Grid) => g.flat().filter((c) => c !== 0).length;

describe("gravity", () => {
  it("drops floating puyos to the bottom without losing or reordering them", () => {
    const g = emptyGrid();
    g[HIDDEN_ROWS][0] = 1;
    g[HIDDEN_ROWS + 1][0] = 2;
    const out = applyGravity(g);
    expect(count(out)).toBe(2);
    expect(out[ROWS - 2][0]).toBe(1); // column order preserved
    expect(out[ROWS - 1][0]).toBe(2);
  });

  it("is a no-op on a settled board", () => {
    const g = board("1.....", "2.....");
    expect(applyGravity(g)).toEqual(g);
  });
});

describe("groups", () => {
  it("groups only same-coloured orthogonal neighbours", () => {
    const g = board("11....", "12....");
    const sizes = findGroups(g)
      .map((gr) => gr.length)
      .sort((a, b) => b - a);
    expect(sizes).toEqual([3, 1]);
  });
});

describe("resolveChains", () => {
  it("leaves a board with no group of four untouched", () => {
    const g = board("111...");
    const res = resolveChains(g);
    expect(res.steps).toHaveLength(0);
    expect(res.maxChain).toBe(0);
    expect(res.totalScore).toBe(0);
    expect(res.finalGrid).toEqual(g);
  });

  it("pops a group of four and scores it once", () => {
    const g = board("11....", "11....");
    const res = resolveChains(g);
    expect(res.steps).toHaveLength(1);
    expect(res.steps[0].cleared).toBe(POP_MIN);
    expect(res.totalScore).toBeGreaterThan(0);
    expect(isAllClear(res.finalGrid)).toBe(true);
  });

  it("chains: the first pop drops puyos that complete the second group", () => {
    // Three blues (2) stand in column 0 and a fourth is stranded on the red
    // (1) staircase; clearing the reds drops it alongside them.
    const g = board("2.....", "2.....", "2.....", "12....", "111...");
    const res = resolveChains(g);
    expect(res.maxChain).toBe(2);
    expect(res.steps.map((s) => s.chain)).toEqual([1, 2]);
    // A longer chain must score more than the same pops would in isolation.
    expect(res.steps[1].score).toBeGreaterThan(res.steps[0].score);
  });

  it("every step's `after` grid matches its `afterPop` under gravity", () => {
    const g = board("2.....", "2.....", "2.....", "12....", "111...");
    for (const step of resolveChains(g).steps) {
      expect(step.after).toEqual(applyGravity(step.afterPop));
      expect(step.popped).toHaveLength(step.cleared);
    }
  });
});

describe("top out", () => {
  it("only triggers once the spawn column is blocked", () => {
    expect(isTopOut(emptyGrid())).toBe(false);
    const g = emptyGrid();
    for (let r = HIDDEN_ROWS; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) g[r][c] = 1;
    expect(isTopOut(applyGravity(g))).toBe(true);
  });
});
