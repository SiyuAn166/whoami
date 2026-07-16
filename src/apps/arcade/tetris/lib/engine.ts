import { COLS, ROWS, SCORE, LINES_PER_LEVEL, type PieceType } from "./config";
import type { Cell, Grid, Orient, Piece, ClearKind } from "./types";

// ---- shapes: 4x4 relative cell coords per orientation ----
// Each entry maps orientation -> array of [dr, dc] offsets from piece origin (r,c).
type Shape = Record<Orient, [number, number][]>;

const SHAPES: Record<PieceType, Shape> = {
  I: {
    0: [
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
    ],
    1: [
      [0, 2],
      [1, 2],
      [2, 2],
      [3, 2],
    ],
    2: [
      [2, 0],
      [2, 1],
      [2, 2],
      [2, 3],
    ],
    3: [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ],
  },
  O: {
    0: [
      [0, 1],
      [0, 2],
      [1, 1],
      [1, 2],
    ],
    1: [
      [0, 1],
      [0, 2],
      [1, 1],
      [1, 2],
    ],
    2: [
      [0, 1],
      [0, 2],
      [1, 1],
      [1, 2],
    ],
    3: [
      [0, 1],
      [0, 2],
      [1, 1],
      [1, 2],
    ],
  },
  T: {
    0: [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    1: [
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 1],
    ],
    2: [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 1],
    ],
    3: [
      [0, 1],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
  },
  S: {
    0: [
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
    ],
    1: [
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
    2: [
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
    ],
    3: [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
  },
  Z: {
    0: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
    1: [
      [0, 2],
      [1, 1],
      [1, 2],
      [2, 1],
    ],
    2: [
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 2],
    ],
    3: [
      [0, 1],
      [1, 0],
      [1, 1],
      [2, 0],
    ],
  },
  J: {
    0: [
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    1: [
      [0, 1],
      [0, 2],
      [1, 1],
      [2, 1],
    ],
    2: [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
    3: [
      [0, 1],
      [1, 1],
      [2, 0],
      [2, 1],
    ],
  },
  L: {
    0: [
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    1: [
      [0, 1],
      [1, 1],
      [2, 1],
      [2, 2],
    ],
    2: [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
    ],
    3: [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
};

// SRS wall-kick tables. Offsets are [dc, dr] tries applied in order.
// JLSTZ kicks
const KICKS_JLSTZ: Record<string, [number, number][]> = {
  "0>1": [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  "1>0": [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
  "1>2": [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
  "2>1": [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  "2>3": [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  "3>2": [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  "3>0": [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  "0>3": [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
};
// I kicks
const KICKS_I: Record<string, [number, number][]> = {
  "0>1": [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, -1],
    [1, 2],
  ],
  "1>0": [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, 1],
    [-1, -2],
  ],
  "1>2": [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, 2],
    [2, -1],
  ],
  "2>1": [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, -2],
    [-2, 1],
  ],
  "2>3": [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, 1],
    [-1, -2],
  ],
  "3>2": [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, -1],
    [1, 2],
  ],
  "3>0": [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, -2],
    [-2, 1],
  ],
  "0>3": [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, 2],
    [2, -1],
  ],
};

export function emptyGrid(): Grid {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(0));
}

export function cellsOf(p: Piece): [number, number][] {
  return SHAPES[p.type][p.o].map(([dr, dc]) => [p.r + dr, p.c + dc]);
}

export function fits(g: Grid, p: Piece): boolean {
  for (const [r, c] of cellsOf(p)) {
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return false;
    if (g[r][c] !== 0) return false;
  }
  return true;
}

export function spawnPiece(type: PieceType): Piece {
  // origin so the piece appears centered near columns 3-6, top hidden rows
  const c = type === "O" ? 3 : 3;
  return { type, r: 0, c, o: 0 };
}

export function move(g: Grid, p: Piece, dr: number, dc: number): Piece | null {
  const np: Piece = { ...p, r: p.r + dr, c: p.c + dc };
  return fits(g, np) ? np : null;
}

export interface RotateResult {
  piece: Piece;
  usedKick: [number, number];
  kickIndex: number;
}

export function rotate(g: Grid, p: Piece, dir: 1 | -1): RotateResult | null {
  if (p.type === "O") return { piece: p, usedKick: [0, 0], kickIndex: 0 };
  const from = p.o;
  const to = ((((p.o + dir) % 4) + 4) % 4) as Orient;
  const key = `${from}>${to}`;
  const table = p.type === "I" ? KICKS_I : KICKS_JLSTZ;
  const kicks = table[key] ?? [[0, 0]];
  for (let i = 0; i < kicks.length; i++) {
    const [dc, dr] = kicks[i];
    const np: Piece = { ...p, o: to, c: p.c + dc, r: p.r - dr };
    if (fits(g, np)) return { piece: np, usedKick: [dc, dr], kickIndex: i };
  }
  return null;
}

export function lockPiece(g: Grid, p: Piece): Grid {
  const ng = g.map((row) => row.slice());
  for (const [r, c] of cellsOf(p)) {
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) ng[r][c] = p.type;
  }
  return ng;
}

export function ghostRow(g: Grid, p: Piece): Piece {
  let gp = p;
  // step down until blocked

  while (true) {
    const nx = move(g, gp, 1, 0);
    if (!nx) break;
    gp = nx;
  }
  return gp;
}

// full rows -> indices
export function fullRows(g: Grid): number[] {
  const rows: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    if (g[r].every((c) => c !== 0)) rows.push(r);
  }
  return rows;
}

export function clearRows(g: Grid, rows: number[]): Grid {
  if (rows.length === 0) return g;
  const set = new Set(rows);
  const kept = g.filter((_, r) => !set.has(r));
  const ng: Grid = [];
  for (let i = 0; i < rows.length; i++) ng.push(Array<Cell>(COLS).fill(0));
  ng.push(...kept);
  return ng;
}

// board is fully empty (perfect clear)
export function isAllClear(g: Grid): boolean {
  return g.every((row) => row.every((c) => c === 0));
}

// ---- T-spin detection (3-corner rule) ----
// lastRotateKick: index used in the last rotation (>=0 if last action was rotate)
export function detectTSpin(
  g: Grid,
  p: Piece,
  lastActionWasRotate: boolean,
  kickIndex: number,
): "none" | "tspin" | "mini" {
  if (p.type !== "T" || !lastActionWasRotate) return "none";
  // T center is at [p.r+1, p.c+1] for all orientations in our shape table
  const cr = p.r + 1,
    cc = p.c + 1;
  const corners: [number, number][] = [
    [cr - 1, cc - 1],
    [cr - 1, cc + 1],
    [cr + 1, cc - 1],
    [cr + 1, cc + 1],
  ];
  const occupied = corners.map(([r, c]) =>
    r < 0 || r >= ROWS || c < 0 || c >= COLS ? true : g[r][c] !== 0,
  );
  const count = occupied.filter(Boolean).length;
  if (count < 3) return "none";
  // front corners depend on orientation
  const frontByOrient: Record<Orient, [number, number][]> = {
    0: [
      [cr - 1, cc - 1],
      [cr - 1, cc + 1],
    ],
    1: [
      [cr - 1, cc + 1],
      [cr + 1, cc + 1],
    ],
    2: [
      [cr + 1, cc - 1],
      [cr + 1, cc + 1],
    ],
    3: [
      [cr - 1, cc - 1],
      [cr + 1, cc - 1],
    ],
  };
  const front = frontByOrient[p.o];
  const frontOcc = front.filter(([r, c]) =>
    r < 0 || r >= ROWS || c < 0 || c >= COLS ? true : g[r][c] !== 0,
  ).length;
  // both front corners filled -> full T-spin; else mini (unless kick index 4 = TST-style -> full)
  if (frontOcc === 2) return "tspin";
  if (kickIndex === 4) return "tspin";
  return "mini";
}

export function classify(
  linesCleared: number,
  tspin: "none" | "tspin" | "mini",
): ClearKind {
  if (tspin === "tspin") {
    if (linesCleared === 0) return "tspin";
    if (linesCleared === 1) return "tspin-single";
    if (linesCleared === 2) return "tspin-double";
    return "tspin-triple";
  }
  if (tspin === "mini") {
    if (linesCleared === 0) return "tspin-mini";
    return "tspin-mini-single";
  }
  switch (linesCleared) {
    case 1:
      return "single";
    case 2:
      return "double";
    case 3:
      return "triple";
    case 4:
      return "tetris";
    default:
      return "none";
  }
}

export function baseScore(kind: ClearKind): number {
  switch (kind) {
    case "single":
      return SCORE.single;
    case "double":
      return SCORE.double;
    case "triple":
      return SCORE.triple;
    case "tetris":
      return SCORE.tetris;
    case "tspin-mini":
      return SCORE.tspinMini;
    case "tspin-mini-single":
      return SCORE.tspinMiniSingle;
    case "tspin":
      return SCORE.tspin;
    case "tspin-single":
      return SCORE.tspinSingle;
    case "tspin-double":
      return SCORE.tspinDouble;
    case "tspin-triple":
      return SCORE.tspinTriple;
    default:
      return 0;
  }
}

export function isDifficult(kind: ClearKind): boolean {
  // difficult clears sustain back-to-back
  return (
    kind === "tetris" ||
    (kind.startsWith("tspin") && kind !== "tspin" && kind !== "tspin-mini")
  );
}

export function levelForLines(lines: number): number {
  return Math.floor(lines / LINES_PER_LEVEL);
}
