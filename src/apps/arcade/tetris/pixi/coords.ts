import { CELL, HIDDEN_ROWS } from "../lib/config";

// Convert board grid coords to board-local pixel coords.
// Hidden rows sit above y=0 (negative), so the visible field starts at row HIDDEN_ROWS.
export function cellX(col: number): number {
  return col * CELL;
}
export function cellY(row: number): number {
  return (row - HIDDEN_ROWS) * CELL;
}
