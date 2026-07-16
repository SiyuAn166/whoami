// Pure shared types for the Puyo engine. No React / Pixi / DOM here.

/** 0 = empty cell; 1..5 = a colour index (see COLOR_KEYS in config). */
export type Cell = 0 | 1 | 2 | 3 | 4 | 5;

/** Colour index that is guaranteed non-empty. */
export type Color = 1 | 2 | 3 | 4 | 5;

/** Row-major grid: grid[r][c]. Row 0 is the hidden spawn row. */
export type Grid = Cell[][];

export type Mode = "practice" | "play";

/** Pair orientation: 0 = satellite up, 1 = right, 2 = down, 3 = left. */
export type Orient = 0 | 1 | 2 | 3;

export interface Piece {
  /** Axis (pivot) puyo grid position. */
  r: number;
  c: number;
  /** Axis colour. */
  axis: Color;
  /** Satellite colour. */
  sat: Color;
  orient: Orient;
}

export interface Coord {
  r: number;
  c: number;
}

/** One step of a chain reaction, with everything the renderer needs. */
export interface ChainStep {
  /** 1-indexed chain number for this step. */
  chain: number;
  /** Cells that pop this step (with their colour, for burst tinting). */
  popped: { r: number; c: number; color: Color }[];
  /** Number of distinct groups that popped. */
  groups: number;
  /** Distinct colours cleared this step. */
  colors: number;
  /** Total puyos cleared this step. */
  cleared: number;
  /** Score gained on this step. */
  score: number;
  /** Field before the pop (connections intact). */
  before: Grid;
  /** Field right after removing popped puyos, before gravity. */
  afterPop: Grid;
  /** Field after gravity settles the survivors. */
  after: Grid;
}

export interface ResolveResult {
  steps: ChainStep[];
  finalGrid: Grid;
  totalScore: number;
  maxChain: number;
}
