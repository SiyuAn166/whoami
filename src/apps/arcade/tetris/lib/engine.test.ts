import { describe, expect, it } from "vitest";

import { COLS, ROWS } from "./config";
import {
  clearRows,
  emptyGrid,
  fits,
  fullRows,
  ghostRow,
  isAllClear,
  lockPiece,
  move,
  rotate,
  spawnPiece,
} from "./engine";

import type { Grid } from "./types";

const fillRow = (g: Grid, r: number, gap?: number) => {
  for (let c = 0; c < COLS; c++) if (c !== gap) g[r][c] = "I";
  return g;
};

describe("board geometry", () => {
  it("starts empty at the configured size", () => {
    const g = emptyGrid();
    expect(g).toHaveLength(ROWS);
    expect(g[0]).toHaveLength(COLS);
    expect(isAllClear(g)).toBe(true);
  });

  it("rejects pieces outside the board or over a filled cell", () => {
    const g = emptyGrid();
    expect(fits(g, spawnPiece("T"))).toBe(true);
    expect(fits(g, { ...spawnPiece("T"), c: -3 })).toBe(false);
    expect(fits(g, { ...spawnPiece("T"), c: COLS })).toBe(false);
    expect(fits(g, { ...spawnPiece("T"), r: ROWS })).toBe(false);

    const blocked = lockPiece(emptyGrid(), spawnPiece("O"));
    expect(fits(blocked, spawnPiece("O"))).toBe(false);
  });

  it("move returns null instead of an out-of-bounds piece", () => {
    const g = emptyGrid();
    expect(move(g, spawnPiece("T"), 0, -COLS)).toBeNull();
    expect(move(g, spawnPiece("T"), 1, 0)).not.toBeNull();
  });
});

describe("drop and lock", () => {
  it("ghostRow lands the piece on the floor and locking fills its cells", () => {
    const g = emptyGrid();
    const landed = ghostRow(g, spawnPiece("O"));
    expect(move(g, landed, 1, 0)).toBeNull(); // nothing below it
    const locked = lockPiece(g, landed);
    expect(isAllClear(locked)).toBe(false);
    expect(locked[ROWS - 1].filter((c) => c !== 0)).toHaveLength(2);
  });

  it("ghostRow stops on top of settled blocks", () => {
    const g = fillRow(emptyGrid(), ROWS - 1);
    const landed = ghostRow(g, spawnPiece("O"));
    expect(landed.r).toBeLessThan(ghostRow(emptyGrid(), spawnPiece("O")).r);
  });
});

describe("line clears", () => {
  it("reports only complete rows", () => {
    const g = emptyGrid();
    fillRow(g, ROWS - 1);
    fillRow(g, ROWS - 2, 4); // one gap ⇒ not a clear
    expect(fullRows(g)).toEqual([ROWS - 1]);
  });

  it("clearing keeps the board height and shifts survivors down", () => {
    const g = emptyGrid();
    fillRow(g, ROWS - 1);
    g[ROWS - 2][0] = "T";
    const out = clearRows(g, [ROWS - 1]);
    expect(out).toHaveLength(ROWS);
    expect(out[ROWS - 1][0]).toBe("T"); // survivor fell one row
    expect(fullRows(out)).toEqual([]);
  });

  it("clearing every filled row leaves a perfect clear", () => {
    const g = fillRow(emptyGrid(), ROWS - 1);
    expect(isAllClear(clearRows(g, fullRows(g)))).toBe(true);
  });
});

describe("rotation", () => {
  it("O never changes orientation, and a free T cycles back in four turns", () => {
    const g = emptyGrid();
    expect(rotate(g, spawnPiece("O"), 1)?.piece.o).toBe(0);

    let p = spawnPiece("T");
    for (let i = 0; i < 4; i++) {
      const res = rotate(g, p, 1);
      expect(res).not.toBeNull();
      p = res!.piece;
    }
    expect(p.o).toBe(0);
  });

  it("kicks the piece out of a wall instead of failing", () => {
    const g = emptyGrid();
    const atWall = { ...spawnPiece("T"), c: -1, o: 0 as const };
    const res = rotate(g, atWall, 1);
    expect(res).not.toBeNull();
    expect(fits(g, res!.piece)).toBe(true);
  });
});
