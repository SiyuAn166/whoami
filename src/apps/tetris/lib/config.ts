// ============================================================================
// Tetris static resources — board/piece geometry, rule tables, display text,
// keybindings, timing, and visual tuning. Nothing in this file computes
// anything; engine.ts (pure game-rule computation) and the view layer
// (rendering, input, sound) just read from it.
// ============================================================================

// --- Board geometry -----------------------------------------------------------
export const COLS = 10;
export const ROWS = 20;
/** Hidden rows above the visible field where pieces spawn. */
export const HIDDEN_ROWS = 2;
export const TOTAL_ROWS = ROWS + HIDDEN_ROWS;

// --- Board geometry (pixels) ------------------------------------------------
export const CELL = 35;
export const BOARD_W = COLS * CELL; // 500
export const BOARD_H = ROWS * CELL; // 1000

// --- Pieces -------------------------------------------------------------------
export type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
export const PIECES: PieceType[] = ["I", "O", "T", "S", "Z", "J", "L"];

// Piece identities the game RULES (not just geometry) branch on: O never
// wall-kicks, I has its own kick table, only T can T-spin.
export const PIECE_O: PieceType = "O";
export const PIECE_I: PieceType = "I";
export const PIECE_T: PieceType = "T";

// --- Piece geometry: each piece's 4 minos in each rotation state -------------
// Coordinates are [x, y] within a 4x4 (I) or 3x3 (others) bounding box, y down.
export const SPAWN: Record<PieceType, [number, number][]> = {
  I: [
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
  ],
  O: [
    [1, 0],
    [2, 0],
    [1, 1],
    [2, 1],
  ],
  T: [
    [1, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
  S: [
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
  ],
  Z: [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
  ],
  J: [
    [0, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
  L: [
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
};
// Rotation pivot box size per piece.
export const BOX: Record<PieceType, number> = {
  I: 4,
  O: 4,
  T: 3,
  S: 3,
  Z: 3,
  J: 3,
  L: 3,
};

// --- SRS wall-kick tables (offsets in [x, y], y DOWN) ------------------------
// Standard SRS is defined y-up; converted to y-down here (negated y).
export type KickTable = Record<string, [number, number][]>;
export const KICKS_JLSTZ: KickTable = {
  "0>1": [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  "1>0": [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  "1>2": [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  "2>1": [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  "2>3": [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
  "3>2": [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  "3>0": [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  "0>3": [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
};
export const KICKS_I: KickTable = {
  "0>1": [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, 1],
    [1, -2],
  ],
  "1>0": [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, -1],
    [-1, 2],
  ],
  "1>2": [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, -2],
    [2, 1],
  ],
  "2>1": [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, 2],
    [-2, -1],
  ],
  "2>3": [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, -1],
    [-1, 2],
  ],
  "3>2": [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, 1],
    [1, -2],
  ],
  "3>0": [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, 2],
    [-2, -1],
  ],
  "0>3": [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, -2],
    [2, 1],
  ],
};

// --- Clear types + their display text ----------------------------------------
// Constants are the source of truth; ClearType is derived FROM them via
// `typeof` below, so the type and its members can never drift apart. (No
// `: ClearType` annotation on these — that would widen every `typeof CLEAR_X`
// back to the full union and defeat the point.)
export const CLEAR_NONE = "none";
export const CLEAR_SINGLE = "single";
export const CLEAR_DOUBLE = "double";
export const CLEAR_TRIPLE = "triple";
export const CLEAR_TETRIS = "tetris";
export const CLEAR_TSPIN = "tspin";
export const CLEAR_TSPIN_MINI = "tspin-mini";
export const CLEAR_TSPIN_SINGLE = "tspin-single";
export const CLEAR_TSPIN_DOUBLE = "tspin-double";
export const CLEAR_TSPIN_TRIPLE = "tspin-triple";
export const CLEAR_TSPIN_MINI_SINGLE = "tspin-mini-single";
export const CLEAR_TSPIN_MINI_DOUBLE = "tspin-mini-double";
export const CLEAR_ALLCLEAR = "allclear";

export type ClearType =
  | typeof CLEAR_NONE
  | typeof CLEAR_SINGLE
  | typeof CLEAR_DOUBLE
  | typeof CLEAR_TRIPLE
  | typeof CLEAR_TETRIS
  | typeof CLEAR_TSPIN
  | typeof CLEAR_TSPIN_MINI
  | typeof CLEAR_TSPIN_SINGLE
  | typeof CLEAR_TSPIN_DOUBLE
  | typeof CLEAR_TSPIN_TRIPLE
  | typeof CLEAR_TSPIN_MINI_SINGLE
  | typeof CLEAR_TSPIN_MINI_DOUBLE
  | typeof CLEAR_ALLCLEAR;

const TOAST_TSPIN_MINI = "T-SPIN MINI";
const TOAST_TSPIN_MINI_SINGLE = "T-SPIN MINI SINGLE";
const TOAST_TSPIN_MINI_DOUBLE = "T-SPIN MINI DOUBLE";
const TOAST_TSPIN = "T-SPIN";
const TOAST_TSPIN_SINGLE = "T-SPIN SINGLE";
const TOAST_TSPIN_DOUBLE = "T-SPIN DOUBLE";
const TOAST_TSPIN_TRIPLE = "T-SPIN TRIPLE";
const TOAST_TETRIS = "TETRIS";

/** Display text for clear types that trigger an on-screen toast. */
export const TOAST_BY_CLEAR_TYPE: Partial<Record<ClearType, string>> = {
  [CLEAR_TSPIN_MINI]: TOAST_TSPIN_MINI,
  [CLEAR_TSPIN_MINI_SINGLE]: TOAST_TSPIN_MINI_SINGLE,
  [CLEAR_TSPIN_MINI_DOUBLE]: TOAST_TSPIN_MINI_DOUBLE,
  [CLEAR_TSPIN]: TOAST_TSPIN,
  [CLEAR_TSPIN_SINGLE]: TOAST_TSPIN_SINGLE,
  [CLEAR_TSPIN_DOUBLE]: TOAST_TSPIN_DOUBLE,
  [CLEAR_TSPIN_TRIPLE]: TOAST_TSPIN_TRIPLE,
  [CLEAR_TETRIS]: TOAST_TETRIS,
};

/** All Clear's toast text. Reported via resolveClear()'s return value rather
 *  than StepResult.toast, since it can only be known after rows collapse. */
export const ALL_CLEAR_TOAST = "ALL CLEAR";

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

// --- Feedback timing (ms) ----------------------------------------------------
export const TOAST_MS = 1500; // how long a clear-label toast / B2B / REN stays visible

// --- Keyboard controls --------------------------------------------------------
export const KEY_LEFT = "ArrowLeft";
export const KEY_RIGHT = "ArrowRight";
export const KEY_SOFT_DROP = "ArrowDown";
export const KEY_ROTATE_CW_ARROW = "ArrowUp";
export const KEY_ROTATE_CW_X = "x";
export const KEY_ROTATE_CW_X_UPPER = "X";
export const KEY_ROTATE_CCW_Z = "z";
export const KEY_ROTATE_CCW_Z_UPPER = "Z";
export const KEY_HOLD_C = "c";
export const KEY_HOLD_C_UPPER = "C";
export const KEY_CONFIRM = " "; // hard drop while playing; start/restart otherwise
export const KEY_PAUSE = "Escape";
/** Custom window event the titlebar "?" button fires to open in-game help. */
export const HELP_EVENT = "tetris:help";

// --- Sound tuning ---------------------------------------------------------
// Min gap between retriggers of a rapid-fire one-shot, so held keys/fast
// input can't overlap the same clip into an inaudible buzz.
export const SOUND_RETRIGGER_MIN_GAP_MS = 40;
export const GAIN_MOVE = 0.15;
export const GAIN_DROP = 0.5;
export const GAIN_DROPDOWN = 0.6;
export const GAIN_ROTATE = 0.7;
export const GAIN_HARDDROP = 0.7;
export const GAIN_HOLD = 0.45;
export const GAIN_ALLCLEAR = 0.7;

// --- Board render tuning -----------------------------------------------------
export const GRID_LINE_COLOR = "rgba(255,255,255,.05)";
export const SWEEP_HEAD_COLOR_START = "rgba(255,255,255,0)";
export const SWEEP_HEAD_COLOR_END = "rgba(255,255,255,.85)";
export const SWEEP_HEAD_WIDTH_PX = 34; // width of the bright gradient leading the wipe

// --- Tile look (spec: bevel=0.12, pit=0.12, middleBar=0.04) ------------------
// A single tile is a self-contained "framed crystal tile": dark grid line →
// bright beveled rim (top brightest, sides mid, bottom darkest) → matte core
// with a subtle 「日」 inset (two shallow pits + a slight middle ridge).
export const TILE_PARAMS = {
  bevel: 0.12, // outer beveled-rim thickness (fraction of cell)
  pit: 0.12, // 「日」 top/bottom inset depth
  middleBar: 0.04, // middle ridge callback thickness
  gridLine: true, // dark separating outline between cells
  topRim: 0.55, // top edge brightness (light from above)
  sideRim: 0.22, // left/right edge brightness
  bottomRim: -0.42, // bottom edge (shadow)
  outline: -0.86, // dark grid line luminance
};

/** Base colours per piece (high-saturation, opaque). */
export const PIECE_COLORS: Record<PieceType, string> = {
  I: "#22b6e6",
  O: "#f2c31a",
  T: "#a24be0",
  S: "#3fca4e",
  Z: "#e8483f",
  J: "#3f6ee8",
  L: "#f2911a",
};
