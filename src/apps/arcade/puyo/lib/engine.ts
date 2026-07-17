// Pure Puyo engine: grid ops, pair movement/rotation with kicks, flood-fill
// group detection and Puyo Puyo Tsu chain resolution + scoring.
// No framework imports — safe to unit test in isolation.

import {
  CHAIN_POWER,
  COLOR_BONUS,
  COLS,
  groupBonus,
  HIDDEN_ROWS,
  POP_MIN,
  ROWS,
  SPAWN_COL,
} from "./config";
import type {
  Cell,
  ChainStep,
  Color,
  Coord,
  Grid,
  Orient,
  Piece,
  ResolveResult,
} from "./types";

// ---- Grid helpers ---------------------------------------------------------
export function emptyGrid(): Grid {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(0));
}

export function cloneGrid(g: Grid): Grid {
  return g.map((row) => row.slice() as Cell[]);
}

// ---- Pair (piece) geometry ------------------------------------------------
const SAT_OFFSET: Record<Orient, [number, number]> = {
  0: [-1, 0], // up
  1: [0, 1], // right
  2: [1, 0], // down
  3: [0, -1], // left
};

export function satPos(p: Piece): Coord {
  const [dr, dc] = SAT_OFFSET[p.orient];
  return { r: p.r + dr, c: p.c + dc };
}

export function pieceCells(p: Piece): [Coord, Coord] {
  return [{ r: p.r, c: p.c }, satPos(p)];
}

/** A cell is free if in horizontal bounds, above the floor and empty. */
function free(g: Grid, r: number, c: number): boolean {
  if (c < 0 || c >= COLS) return false;
  if (r >= ROWS) return false;
  if (r < 0) return true; // above the top is allowed (spawn area)
  return g[r][c] === 0;
}

function fits(g: Grid, p: Piece): boolean {
  const [a, b] = pieceCells(p);
  return free(g, a.r, a.c) && free(g, b.r, b.c);
}

/**
 * Top-out test. The death cell is the on-screen red X: the 3rd column
 * (SPAWN_COL) at the first visible row (HIDDEN_ROWS). Once a puyo settles
 * there and nothing clears it, the game is over. NB: this is one row BELOW
 * SPAWN_ROW (which is the hidden spawn row 0), so we test the X cell directly
 * rather than the spawn-fit, otherwise top-out fires a puyo too late (after an
 * invisible stack builds in the hidden row).
 */
export function isTopOut(g: Grid): boolean {
  return g[HIDDEN_ROWS][SPAWN_COL] !== 0;
}

export function move(g: Grid, p: Piece, dc: number): Piece {
  const np = { ...p, c: p.c + dc };
  return fits(g, np) ? np : p;
}

/** Try to move the pair down one row. Returns null if it cannot. */
export function stepDown(g: Grid, p: Piece): Piece | null {
  const np = { ...p, r: p.r + 1 };
  return fits(g, np) ? np : null;
}

// Kick offsets tried (in order) after a rotation, applied to the axis.
const KICKS: [number, number][] = [
  [0, 0],
  [0, -1],
  [0, 1],
  [-1, 0],
  [-1, -1],
  [-1, 1],
  [1, 0],
];

export function rotate(g: Grid, p: Piece, dir: 1 | -1): Piece {
  const orient = ((((p.orient + dir) % 4) + 4) % 4) as Orient;
  for (const [dr, dc] of KICKS) {
    const np: Piece = { ...p, orient, r: p.r + dr, c: p.c + dc };
    if (fits(g, np)) return np;
  }
  return p; // rotation blocked; keep as-is
}

/** Drop the pair straight down to its resting position. */
export function hardDropPiece(g: Grid, p: Piece): Piece {
  let cur = p;
  for (;;) {
    const nx = stepDown(g, cur);
    if (!nx) return cur;
    cur = nx;
  }
}

/**
 * Lock a pair into the grid. Puyos are placed at their current cells; if the
 * satellite is above the top (r<0) it is dropped onto the stack column-wise by
 * the subsequent gravity pass. Returns a new grid.
 */
export function lockPiece(g: Grid, p: Piece): Grid {
  const out = cloneGrid(g);
  const cells: { r: number; c: number; color: Color }[] = [
    { r: p.r, c: p.c, color: p.axis },
    { ...satPos(p), color: p.sat },
  ];
  // Place the lower puyo (larger r) first so a same-column pair stacks right.
  cells.sort((a, b) => b.r - a.r);
  for (const { r, c, color } of cells) placeCell(out, r, c, color);
  return out;
}

function placeCell(g: Grid, r: number, c: number, color: Color) {
  if (c < 0 || c >= COLS) return;
  let rr = Math.max(r, 0);
  if (rr >= ROWS) rr = ROWS - 1;
  if (g[rr][c] === 0) {
    g[rr][c] = color;
    return;
  }
  // Reserved cell taken (satellite pushed up): drop to nearest empty above.
  for (let k = rr - 1; k >= 0; k--) {
    if (g[k][c] === 0) {
      g[k][c] = color;
      return;
    }
  }
}

// ---- Gravity --------------------------------------------------------------
/** Settle floating puyos to the bottom of each column. Returns new grid. */
export function applyGravity(g: Grid): Grid {
  const out = emptyGrid();
  for (let c = 0; c < COLS; c++) {
    let write = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      const v = g[r][c];
      if (v !== 0) {
        out[write][c] = v;
        write--;
      }
    }
  }
  return out;
}

// ---- Connection mask (for rendering) --------------------------------------
// Bit weights match the atlas: down=1, up=2, right=4, left=8.
export function connectionMask(g: Grid, r: number, c: number): number {
  const color = g[r][c];
  if (color === 0) return 0;
  if (r < HIDDEN_ROWS) return 0; // hidden-row puyos never connect visually
  let m = 0;
  if (r < ROWS - 1 && g[r + 1][c] === color) m += 1; // down
  if (r > HIDDEN_ROWS && g[r - 1][c] === color) m += 2; // up
  if (c < COLS - 1 && g[r][c + 1] === color) m += 4; // right
  if (c > 0 && g[r][c - 1] === color) m += 8; // left
  return m;
}

// ---- Flood fill groups ----------------------------------------------------
/** All same-colour connected groups in the poppable region (rows >= HIDDEN). */
export function findGroups(g: Grid): Coord[][] {
  const seen = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const groups: Coord[][] = [];
  for (let r = HIDDEN_ROWS; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const color = g[r][c];
      if (color === 0 || seen[r][c]) continue;
      const stack: Coord[] = [{ r, c }];
      const group: Coord[] = [];
      seen[r][c] = true;
      while (stack.length) {
        const cur = stack.pop()!;
        group.push(cur);
        const neigh = [
          { r: cur.r + 1, c: cur.c },
          { r: cur.r - 1, c: cur.c },
          { r: cur.r, c: cur.c + 1 },
          { r: cur.r, c: cur.c - 1 },
        ];
        for (const n of neigh) {
          if (
            n.r >= HIDDEN_ROWS &&
            n.r < ROWS &&
            n.c >= 0 &&
            n.c < COLS &&
            !seen[n.r][n.c] &&
            g[n.r][n.c] === color
          ) {
            seen[n.r][n.c] = true;
            stack.push(n);
          }
        }
      }
      groups.push(group);
    }
  }
  return groups;
}

// ---- Chain resolution + scoring ------------------------------------------
export function resolveChains(start: Grid): ResolveResult {
  const steps: ChainStep[] = [];
  let grid = applyGravity(start);
  let chain = 0;
  let totalScore = 0;

  for (;;) {
    const groups = findGroups(grid).filter((gr) => gr.length >= POP_MIN);
    if (groups.length === 0) break;
    chain++;

    const before = cloneGrid(grid);
    const popped: ChainStep["popped"] = [];
    const colorsSet = new Set<Color>();
    let groupBonusSum = 0;
    let cleared = 0;

    const afterPop = cloneGrid(grid);
    for (const gr of groups) {
      groupBonusSum += groupBonus(gr.length);
      cleared += gr.length;
      for (const { r, c } of gr) {
        const color = grid[r][c] as Color;
        colorsSet.add(color);
        popped.push({ r, c, color });
        afterPop[r][c] = 0;
      }
    }

    const power = CHAIN_POWER[Math.min(chain, CHAIN_POWER.length - 1)];
    const colorBonus =
      COLOR_BONUS[Math.min(colorsSet.size, COLOR_BONUS.length - 1)];
    const multiplier = Math.min(
      Math.max(power + colorBonus + groupBonusSum, 1),
      999,
    );
    const score = 10 * cleared * multiplier;
    totalScore += score;

    const after = applyGravity(afterPop);
    steps.push({
      chain,
      popped,
      groups: groups.length,
      colors: colorsSet.size,
      cleared,
      score,
      before,
      afterPop,
      after,
    });
    grid = after;
  }

  return { steps, finalGrid: grid, totalScore, maxChain: chain };
}

/** True if the board is completely empty (all clear bonus opportunity). */
export function isAllClear(g: Grid): boolean {
  for (let r = HIDDEN_ROWS; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) if (g[r][c] !== 0) return false;
  return true;
}

// Backwards-compatible export name (old bundle exposed `Puyo`).
export const Puyo = {
  emptyGrid,
  cloneGrid,
  applyGravity,
  findGroups,
  resolveChains,
  connectionMask,
};
