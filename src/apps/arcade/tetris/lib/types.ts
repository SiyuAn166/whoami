import type { PieceType } from "./config";

// grid cell: 0 = empty, otherwise the PieceType that filled it
export type Cell = 0 | PieceType;
export type Grid = Cell[][]; // [ROWS][COLS], row 0 at top

export type Orient = 0 | 1 | 2 | 3;

export interface Piece {
  type: PieceType;
  r: number; // row of the piece origin (top-left of its bounding box)
  c: number; // col of the piece origin
  o: Orient; // rotation state
}

export type Status = "control" | "resolving" | "gameover";

export type ClearKind =
  | "none"
  | "single"
  | "double"
  | "triple"
  | "tetris"
  | "tspin-mini"
  | "tspin-mini-single"
  | "tspin"
  | "tspin-single"
  | "tspin-double"
  | "tspin-triple";

export interface ClearResult {
  kind: ClearKind;
  rows: number[]; // cleared row indices
  linesCleared: number;
  isTSpin: boolean;
  isBackToBack: boolean;
  combo: number;
  allClear: boolean;
  scoreGained: number;
}

export interface HudSnapshot {
  score: number;
  level: number;
  lines: number;
  combo: number;
  status: Status;
}
