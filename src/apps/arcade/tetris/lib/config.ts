// Pure configuration — no Pixi, no React. Single source of truth.

export const COLS = 10;
export const VISIBLE_ROWS = 20;
export const HIDDEN_ROWS = 2; // spawn buffer above the visible field
export const ROWS = VISIBLE_ROWS + HIDDEN_ROWS;

export const CELL = 30; // px per cell (board)
export const PREVIEW_CELL = 22; // px per cell (next/hold boxes)

export const NEXT_COUNT = 5;

// ---- timing (ms) ----
export const LOCK_DELAY = 500; // grounded grace before lock
export const MAX_LOCK_RESETS = 15; // move/rotate resets before forced lock
export const DAS = 150; // delayed auto shift
export const ARR = 33; // auto repeat rate
export const SOFT_DROP_FACTOR = 20; // soft-drop speed multiplier

// gravity per level (ms per cell), classic-ish curve
export function gravityMs(level: number): number {
  const table = [
    1000, 793, 618, 473, 355, 262, 190, 135, 94, 64, 43, 28, 18, 11, 7,
  ];
  return table[Math.min(level, table.length - 1)];
}

// ---- scoring ----
export const SCORE = {
  single: 100,
  double: 300,
  triple: 500,
  tetris: 800,
  tspinMini: 100,
  tspinMiniSingle: 200,
  tspin: 400,
  tspinSingle: 800,
  tspinDouble: 1200,
  tspinTriple: 1600,
  softDropPerCell: 1,
  hardDropPerCell: 2,
  comboUnit: 50,
  allClearBonus: 2000,
  b2bMultiplier: 1.5,
};

export const LINES_PER_LEVEL = 10;

export type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
export const PIECES: PieceType[] = ["I", "O", "T", "S", "Z", "J", "L"];

// glossy base colors per piece
export const PIECE_COLORS: Record<PieceType, string> = {
  I: "#22b6e6",
  O: "#f2c31a",
  T: "#a24be0",
  S: "#3fca4e",
  Z: "#e8483f",
  J: "#3f6ee8",
  L: "#f2911a",
};

// 「日」 inset tile look — screen-space bevel + two pits + middle ridge
export const TILE = {
  bevel: 0.12, // outer beveled-rim thickness (fraction of cell)
  pit: 0.12, // 「日」 top/bottom inset depth
  middleBar: 0.04, // middle ridge callback thickness
  gridLine: true, // dark separating outline between cells
  topRim: 0.55, // top edge brightness (light from above)
  sideRim: 0.22, // left/right edge brightness
  bottomRim: -0.42, // bottom edge (shadow)
  outline: -0.86, // dark grid line luminance
};

// Alias consumed by the tile renderer (pixi/tiles.ts).
export const TILE_PARAMS = TILE;

// spawn column offsets baked into engine shapes; SPAWN row = top hidden row
export const SPAWN_ROW = 0;

// ---- sound asset map (files kept from original project) ----
export const SOUNDS = {
  move: "move.wav",
  rotate: "rotate.wav",
  drop: "drop.wav",
  softDrop: "dropdown.wav",
  hardDrop: "harddrop.wav",
  hold: "hold.wav",
  lineClear: "singleline.wav",
  tetris: "tetris.wav",
  tspin2: "tspin2.wav",
  tspin3: "tspin3.wav",
  allClear: "allclear.wav",
} as const;
export type SoundName = keyof typeof SOUNDS;

// ---- line-clear sweep animation (mirrored from the canvas project) ----
export const CLEAR_MS = 220; // wipe duration
export const SWEEP_HEAD_WIDTH_PX = Math.round(CELL * 0.95); // bright leading head
export const SWEEP_WELL_COLOR = 0x0d1020; // well fill revealed by the wipe
export const SWEEP_GRID_COLOR = 0x2a3050; // grid lines redrawn over the wipe
export const SWEEP_HEAD_COLOR = 0xffffff; // additive white gradient head
export const SWEEP_HEAD_ALPHA = 0.85;
