// ============================================================================
// Tetris view/config constants — layout sizes and input timings.
// Kept separate from engine logic so tuning feel (DAS/ARR/lock) or resizing
// the board never touches game rules.
// ============================================================================
import { COLS, ROWS } from "./engine";

// --- Board geometry (pixels) ------------------------------------------------
export const CELL = 30;
export const BOARD_W = COLS * CELL; // 300
export const BOARD_H = ROWS * CELL; // 600

// --- Side panels ------------------------------------------------------------
export const NEXT_COUNT = 5; // how many upcoming pieces to preview
export const HOLD_W = 96;
export const HOLD_H = 64;
export const HOLD_CELL = 15; // mini-cell size in the Hold box
export const NEXT_W = 92;
export const NEXT_SLOT_H = 60; // height per Next slot
export const NEXT_CELL = 13; // mini-cell size in the Next queue

// --- Input timing (ms) ------------------------------------------------------
export const DAS = 140; // delayed auto-shift before repeat kicks in
export const ARR = 30; // auto-repeat rate once shifting
export const SOFT_DROP_MS = 40; // gravity interval while soft-dropping
export const LOCK_DELAY = 500; // grace time on the floor before locking
export const LOCK_RESET_CAP = 15; // max move/rotate lock-delay resets
export const CLEAR_MS = 220; // line-clear wipe animation duration
