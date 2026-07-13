// ============================================================================
// Puyo static resources — board geometry, colours, rule tables, timing, keys.
// Nothing here computes: engine.ts (pure rules) and the view layer read from it.
// Mirrors the tetris/lib/config.ts split so both games share one architecture.
// ============================================================================

// --- Board geometry ----------------------------------------------------------
export const COLS = 6;
export const ROWS = 12;
/** Hidden rows above the visible field where the pair spawns. */
export const HIDDEN_ROWS = 2;
export const TOTAL_ROWS = ROWS + HIDDEN_ROWS; // 14

// --- Board geometry (pixels) -------------------------------------------------
export const CELL = 50;
export const BOARD_W = COLS * CELL; // 300
export const BOARD_H = ROWS * CELL; // 600

// --- Colours -----------------------------------------------------------------
export type PuyoColor = "R" | "G" | "B" | "Y" | "P";
export const COLORS: PuyoColor[] = ["R", "G", "B", "Y", "P"];
/** How many distinct colours are actually put in play (<= COLORS.length). */
export const COLOR_COUNT = 5;

/** Base colours per puyo (high-saturation, glossy). */
export const PUYO_COLORS: Record<PuyoColor, string> = {
  R: "#f0483f",
  G: "#3fca4e",
  B: "#3f6ee8",
  Y: "#f2c31a",
  P: "#a24be0",
};

/** Group size required to pop. */
export const CLEAR_MIN = 4;

// --- Side panels -------------------------------------------------------------
export const NEXT_COUNT = 2; // upcoming pairs previewed
export const NEXT_W = 96;
export const NEXT_SLOT_H = 82;
export const NEXT_CELL = 26;

// --- Input timing (ms) -------------------------------------------------------
export const DAS = 140; // delayed auto-shift before repeat kicks in
export const ARR = 45; // auto-repeat rate once shifting
export const SOFT_DROP_MS = 45; // gravity interval while soft-dropping
export const LOCK_DELAY = 500; // grace time on the floor before locking

// --- Base gravity (ms per cell) ---------------------------------------------
export const GRAVITY_MS = 720;
export function gravityMsForChainCount(cleared: number): number {
  // Speeds up a little as the board fills — cleared = total puyos removed.
  return Math.max(160, GRAVITY_MS - Math.floor(cleared / 24) * 60);
}

// --- Chain animation timing (ms) --------------------------------------------
export const FLASH_MS = 480; // how long a group blinks + pops before removal
export const POP_MS = 200; // settle beat between successive chain pops
// Post-lock / post-pop settle uses REAL gravity: every puyo accelerates at the
// same rate (cells per ms^2), so nearer puyos land first and a puyo dropping
// into a deep gap keeps falling longer. Duration scales with the fall distance
// instead of a fixed snap. SETTLE_MIN_MS is a floor so tiny 1-cell drops read.
export const FALL_ACCEL = 0.0001; // gravity for the settle animation (cells/ms^2)
export const SETTLE_MIN_MS = 200; // minimum settle duration, ms
export const TOAST_MS = 1400; // how long the chain badge lingers after a chain

// --- Scoring (Puyo Puyo Tsu formula) ----------------------------------------
// step score = 10 * totalCleared * clamp(chainPower + colorBonus + groupBonus, 1, 999)
// Indexed by 1-based chain number; index 0 unused, chain 1 -> 0.
export const CHAIN_POWER = [
  0, 0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416,
  448, 480, 512, 544, 576, 608, 640, 672,
];
/** Indexed by number of distinct colours cleared in the same chain step. */
export const COLOR_BONUS = [0, 0, 3, 6, 12, 24];
/** Extra bonus for oversized groups. */
export function groupBonus(size: number): number {
  if (size <= 4) return 0;
  if (size >= 11) return 10;
  return (
    ({ 5: 2, 6: 3, 7: 4, 8: 5, 9: 6, 10: 7 } as Record<number, number>)[size] ??
    0
  );
}

// --- Keyboard controls -------------------------------------------------------
export const KEY_LEFT = "ArrowLeft";
export const KEY_RIGHT = "ArrowRight";
export const KEY_SOFT_DROP = "ArrowDown";
export const KEY_ROTATE_CW_ARROW = "ArrowUp";
export const KEY_ROTATE_CW_X = "x";
export const KEY_ROTATE_CW_X_UPPER = "X";
export const KEY_ROTATE_CCW_Z = "z";
export const KEY_ROTATE_CCW_Z_UPPER = "Z";
export const KEY_HARD_DROP = " ";
export const KEY_PAUSE = "Escape";

/** Custom window event the titlebar "?" button fires to open in-game help. */
export const HELP_EVENT = "puyo:help";
