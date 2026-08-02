/**
 * ProPuyoAI — constants.
 *
 * Geometry and scoring tables mirror lib/config.ts exactly. The AI weights and
 * search constants are a direct transcription of citrus610/ama
 * (ai/search/beam/eval.h, ai/search/beam/beam.h, config.json).
 */

/* ------------------------------------------------------------------ *
 * Board geometry — must match lib/config.ts.
 * ------------------------------------------------------------------ */

export const COLS = 6;
export const ROWS = 14;
export const CELL_COUNT = ROWS * COLS;

/** Row 0: anything settling here is discarded by the engine. */
export const VANISH_ROW = 0;
/** Row 1: occupies space but never connects and never pops. */
export const GHOST_ROW = 1;
/** Rows >= 2 take part in grouping and clearing. */
export const FIRST_VISIBLE_ROW = 2;
export const HIDDEN_ROWS = 2;
/** Rows 2..13 => 12 playable rows per column. */
export const PLAYABLE_ROWS = ROWS - HIDDEN_ROWS;
/** Rows 1..13 can physically hold a puyo. */
export const MAX_COL_FILL = ROWS - 1;

export const POP_MIN = 4;
export const SPAWN_COL = 2;

/** Cells that can actually hold a puyo: row 0 discards on landing. */
export const STORABLE_CELLS = COLS * MAX_COL_FILL;

/** Cells that participate in popping (rows 2..13). */
export const PLAYABLE_CELLS = PLAYABLE_ROWS * COLS;

export const EMPTY = 0;
export const TOP_STORABLE_ROW = GHOST_ROW;
export const DEATH_ROW = FIRST_VISIBLE_ROW;
export const DEATH_COL = SPAWN_COL;
export const ALL_CLEAR_BONUS = 3600;
export const TARGET_POINT = 70;

/** Colors are 1..5; 0 is empty. */
export const MIN_COLOR = 1;
export const MAX_COLOR = 5;
export const COLOR_SPAN = MAX_COLOR - MIN_COLOR + 1;

/* ------------------------------------------------------------------ *
 * Scoring tables — transcribed from lib/config.ts.
 * ------------------------------------------------------------------ */

export const CHAIN_POWER: readonly number[] = [
  0, 0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416,
  448, 480, 512, 544, 576, 608, 640, 672,
];

export const COLOR_BONUS: readonly number[] = [0, 0, 3, 6, 12, 24];

export function groupBonus(size: number): number {
  if (size <= 4) return 0;
  if (size === 5) return 2;
  if (size === 6) return 3;
  if (size === 7) return 4;
  if (size === 8) return 5;
  if (size === 9) return 6;
  if (size === 10) return 7;
  return 10;
}

export function chainPowerAt(chain: number): number {
  if (chain <= 0) return 0;
  if (chain < CHAIN_POWER.length) return CHAIN_POWER[chain];
  return CHAIN_POWER[CHAIN_POWER.length - 1];
}
