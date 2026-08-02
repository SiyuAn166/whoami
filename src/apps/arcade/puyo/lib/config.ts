// Board geometry, atlas sizing, timings and Puyo Puyo Tsu scoring tables.
// Everything tunable lives here so the rest of the bundle stays declarative.
//
// Geometry mirrors puyogg/puyosim-gg exactly so the layout.png field frame and
// the puyo.json spritesheet line up pixel-for-pixel (native 64x60 cells).

import type { Color } from "./types";

// ---- Board geometry -------------------------------------------------------
export const COLS = 6;
/** Total rows including hidden rows at the top. */
export const ROWS = 14;
/**
 * Hidden rows at the top (puyos here never pop and are not drawn).
 *
 * The two hidden rows have DIFFERENT rules (Puyo Puyo Champions / VS physics):
 *
 *   row 1 = GHOST_ROW  (13th row) - puyos rest here permanently but never
 *           connect and never clear. They fall in once space opens below.
 *           This row has volume: it blocks lateral movement.
 *
 *   row 0 = VANISH_ROW (14th row) - a puyo coming to rest here vanishes
 *           immediately. Kept permanently clear by the engine, so it doubles
 *           as the travel corridor above a stack that reaches the ghost row.
 *
 * The death column tops out the instant a puyo settles on the visible top
 * cell (grid[HIDDEN_ROWS][SPAWN_COL]), so it never uses this headroom.
 */
export const HIDDEN_ROWS = 2;
/** Spawn column (0-indexed 3rd column, classic PPT spawn). */
export const SPAWN_COL = 2;
/**
 * 14th row (index 0): a puyo coming to rest here vanishes immediately.
 * Official Champions/VS technique - used to discard colours you don't want.
 */
export const VANISH_ROW = 0;
/**
 * 13th row: the Ghost Puyo row. Puyos rest here permanently but never connect
 * and never clear; they drop in once space opens below.
 */
export const GHOST_ROW = HIDDEN_ROWS - 1;
/**
 * Axis spawn row: the vanish row, NOT the ghost row.
 *
 * The axis must spawn and travel in the vanish row because that row is the
 * only one guaranteed clear. The ghost row has volume - a single ghost puyo
 * in any column would otherwise block the pair from moving across it, making
 * it impossible to reach a column to dump unwanted colours. Spawning here is
 * safe: pieces only vanish when they come to REST in row 0, and a piece
 * spawned here immediately falls, so it never settles in the vanish row.
 */
export const SPAWN_ROW = VANISH_ROW;

/** Rows that take part in grouping / clearing (excludes both hidden rows). */
export function isPlayableRow(r: number): boolean {
  return r >= HIDDEN_ROWS;
}

// ---- Colours --------------------------------------------------------------
/** Atlas frame prefixes, indexed by Color (1..5). Index 0 unused. */
export const COLOR_KEYS = [
  "",
  "red",
  "green",
  "blue",
  "yellow",
  "purple",
] as const;
/** How many colours are in play (classic Puyo uses 4-5; this build uses 5). */
export const NUM_COLORS = 5;
export const ALL_COLORS: Color[] = [1, 2, 3, 4, 5];

// ---- Atlas sizing ---------------------------------------------------------
// puyo.json frames are 64x60 with 72px stepping. We render at native size so
// the connection nubs of neighbouring frames meet exactly, like puyo.gg.
export const FRAME_W = 64;
export const FRAME_H = 60;
/** Displayed cell size in px (native). */
export const CELL_W = 64;
export const CELL_H = 60;
// Rendered at native atlas size, so both scale factors are exactly 1 today.
// Kept as named factors (rather than hard-coding 1) so a future re-skin with a
// different cell/atlas size scales every sprite consistently in one place.
export const SCALE_X = CELL_W / FRAME_W; // 1
export const SCALE_Y = CELL_H / FRAME_H; // 1

// ---- Field frame layout (layout.png, from puyosim-gg frame.ts) ------------
// Border sprite positions are relative to the frame container origin.
export const FRAME = {
  totalW: 436,
  totalH: 836,
  border: {
    top: { x: 0, y: 0 },
    leftTop: { x: 0, y: 52 },
    leftBot: { x: 0, y: 404 },
    rightTop: { x: 417, y: 52 },
    rightBot: { x: 417, y: 404 },
    bottom: { x: 0, y: 770 },
  },
  /** Where the puyo field content container sits inside the frame. */
  fieldX: 25,
  fieldY: 52,
  /** Inner clip rect for the playable area (hides the hidden spawn row). */
  clip: { x: 17, y: 52, w: 402, h: 718 },
} as const;

// ---- Stage (canvas) layout -----------------------------------------------
// Frame is placed at (frameX, frameY); everything else is positioned relative
// to puyosim's absolute coordinates (their frame sat at y=132).
export const STAGE = {
  width: 640,
  height: 992,
  frameX: 16,
  frameY: 132, // headroom above the frame for the spawn area (puyosim-style)
  // offsets below are frame-relative (added to frameX/frameY)
  next: { x: 452, y: 56 }, // next window: top aligned just below the top border
  score: { x: 30, y: 800 }, // score text baseline area on bottom tray
  chain: { x: 432, y: 700 }, // chain counter (chain_font), scale 0.85
  garbage: { x: 337, y: 783, scale: 0.7 },
} as const;

// ---- Timings (ms) ---------------------------------------------------------
export const TIMING = {
  gravity: 333,
  softDrop: 45,
  lockDelay: 333,
  das: 133, // ~8 frames @60fps — Puyo Puyo Champions DAS (delay before repeat).
  arr: 33, // ~2 frames @60fps — Puyo Puyo Champions ARR (repeat interval).
  popMs: 450,
  dropPerRowMs: 80, // linear fall: ms per row (constant-speed gravity)
  bounceFrameMs: 22, // ms per squash/stretch frame on landing
  bounceMs: 308, // total landing bounce = 14 frames * bounceFrameMs
  settlePause: 90,
  chainPopupMs: 900,
} as const;

// ---- Scoring (Puyo Puyo Tsu) ---------------------------------------------
/** Chain power, indexed by chain number (chain 1 -> index 1). */
export const CHAIN_POWER = [
  0, 0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416,
  448, 480, 512, 544, 576, 608, 640, 672, 704, 736, 768, 800,
];

/** Colour bonus, indexed by number of distinct colours cleared in a step. */
export const COLOR_BONUS = [0, 0, 3, 6, 12, 24];

/** Group bonus by group size (>=11 -> 10). */
export function groupBonus(size: number): number {
  if (size >= 11) return 10;
  const table = [0, 0, 0, 0, 0, 2, 3, 4, 5, 6, 7];
  return table[size] ?? 0;
}

/** Minimum group size that pops. */
export const POP_MIN = 4;

/** All-clear (zenkeshi) bonus. */
export const ALL_CLEAR_BONUS = 3600;

// ---- Garbage / nuisance (Puyo Puyo Tsu) ----------------------------------
/** Target points: score per single garbage puyo. Standard Tsu value. */
export const TARGET_POINT = 70;

/** Nuisance icon denominations, largest first. Frame names live in puyo atlas. */
export const GARBAGE_ICONS: { value: number; frame: string }[] = [
  { value: 720, frame: "crown.png" },
  { value: 360, frame: "moon.png" },
  { value: 180, frame: "star.png" },
  { value: 30, frame: "rock.png" },
  { value: 6, frame: "line.png" },
  { value: 1, frame: "unit.png" },
];

/**
 * Break a garbage count into atlas icon frames (greedy, largest first).
 * Capped at `maxIcons` slots to fit the tray, biggest denominations kept.
 */
export function garbageToIcons(n: number, maxIcons = 6): string[] {
  const out: string[] = [];
  let rem = Math.max(0, Math.floor(n));
  for (const { value, frame } of GARBAGE_ICONS) {
    let cnt = Math.floor(rem / value);
    rem -= cnt * value;
    while (cnt-- > 0 && out.length < maxIcons) out.push(frame);
    if (out.length >= maxIcons) break;
  }
  return out;
}
