/**
 * Shared React bridge.
 *
 * Everything in this file is engine-agnostic: it converts the React `Grid`
 * into the flat board the simulators use, reads a falling pair in any of the
 * shapes the engine produces, and infers the live colour palette.
 *
 * The wasm engine and the prefetch pipeline consume this identically, so the
 * conversion lives in exactly one place and the two can never disagree about
 * what the board looks like.
 */

import { COLS, ROWS } from "./geometry";
import { type Board, createBoard } from "./sim";

/** Which algorithm produced a decision. Only the native ama build remains. */
export type EngineName = "ama";

export interface MoveResult {
  column: number;
  rotation: number;
}

export interface Diagnostics extends MoveResult {
  /** Which engine produced this decision. */
  engine: EngineName;
  /** Chain this move fires on this tick (0 when it is a building move). */
  firedChain: number;
  /** Best chain count reachable anywhere under the chosen root. */
  projectedChain: number;
  /** Accumulated expected chain score of the chosen root. */
  expectedScore: number;
  /** Plies searched. */
  depth: number;
  /** Nodes expanded across all queues. */
  nodes: number;
  /** Legal root placements considered. */
  candidates: number;
  /** Occupied cells before the move. */
  cells: number;
  /** Tallest column before the move. */
  maxHeight: number;
  /** Board is empty after the move resolves. */
  allClear: boolean;
  elapsedMs: number;
}

export type PairLike =
  | { axis: number; sat: number }
  | { axis: number; child: number }
  | [number, number]
  | null
  | undefined;

export function readPair(
  p: PairLike,
  fallback: [number, number],
): [number, number] {
  if (p == null) return fallback;
  if (Array.isArray(p)) {
    const a = p[0] | 0;
    const b = p[1] | 0;
    if (a >= 1 && a <= 5 && b >= 1 && b <= 5) return [a, b];
    return fallback;
  }
  const o = p as Record<string, number>;
  const a = (o.axis ?? 0) | 0;
  const b = (o.sat ?? o.child ?? 0) | 0;
  if (a >= 1 && a <= 5 && b >= 1 && b <= 5) return [a, b];
  return fallback;
}

/**
 * Read the engine's Cell[][] into the AI's flat board. Accepts either the
 * nested row-major grid or an already-flat array of the same length.
 */
export function readGrid(grid: unknown, into?: Board): Board {
  const b = into ?? createBoard();
  b.fill(0);
  if (!Array.isArray(grid)) return b;
  const nested = Array.isArray(grid[0]);
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      let v: unknown;
      if (nested) {
        const row = (grid as unknown[][])[r];
        v = row ? row[c] : 0;
      } else {
        v = (grid as unknown[])[r * COLS + c];
      }
      const n = typeof v === "number" ? v | 0 : 0;
      b[r * COLS + c] = n >= 1 && n <= 5 ? n : 0;
    }
  }
  return b;
}

/**
 * Live palette. The engine's ColorBag samples a random 3/4/5-colour SUBSET of
 * {1..5} per game, so the palette may be e.g. {1,3,4,5}. ama's fixed queues
 * index into the palette, so it must be the real one — inferred from the board
 * plus the pairs in hand on every call.
 */
export function paletteOf(
  b: Board,
  pairs: [number, number][],
  explicit?: number[],
): number[] {
  if (explicit && explicit.length >= 2) {
    const s = explicit.filter((c) => c >= 1 && c <= 5);
    if (s.length >= 2) return [...new Set(s)].sort((x, y) => x - y);
  }
  const seen = new Set<number>();
  for (let i = 0; i < b.length; i += 1) {
    const v = b[i];
    if (v >= 1 && v <= 5) seen.add(v);
  }
  for (const p of pairs) {
    if (p[0] >= 1 && p[0] <= 5) seen.add(p[0]);
    if (p[1] >= 1 && p[1] <= 5) seen.add(p[1]);
  }
  if (seen.size === 0) return [1, 2, 3, 4];
  return [...seen].sort((a, c) => a - c);
}

/** Occupied cells on a board. */
export function cellCount(b: Board): number {
  let n = 0;
  for (let i = 0; i < b.length; i += 1) if (b[i] !== 0) n += 1;
  return n;
}

/** Monotonic clock that works in both the browser and Node. */
export function now(): number {
  if (
    typeof performance !== "undefined" &&
    typeof performance.now === "function"
  ) {
    return performance.now();
  }
  return Date.now();
}
