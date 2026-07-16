// Grid <-> pixel mapping for the board container.
import { CELL_H, CELL_W, HIDDEN_ROWS } from "../lib/config";

export function cellX(c: number): number {
  return c * CELL_W + CELL_W / 2;
}
/** Visible-space y for a grid row (hidden rows map above y=0 and get clipped). */
export function cellY(r: number): number {
  return (r - HIDDEN_ROWS) * CELL_H + CELL_H / 2;
}
