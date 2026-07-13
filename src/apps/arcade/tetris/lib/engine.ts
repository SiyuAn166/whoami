// ============================================================================
// Tetris engine — Guideline-compliant game-rule computation.
// 7-bag randomizer · SRS rotation with full wall-kick tables · T-spin (3-corner
// + mini) detection · hold · ghost · lock delay · line-clear scoring with
// Back-to-Back and Combo. Pure logic only — no DOM, no React, no rendering.
// All static data (piece/kick tables, clear-type vocabulary, toast text) lives
// in config.ts; this file only computes over it.
// ============================================================================
import {
  BOX,
  CLEAR_DOUBLE,
  CLEAR_NONE,
  CLEAR_SINGLE,
  CLEAR_TETRIS,
  CLEAR_TRIPLE,
  CLEAR_TSPIN,
  CLEAR_TSPIN_DOUBLE,
  CLEAR_TSPIN_MINI,
  CLEAR_TSPIN_MINI_DOUBLE,
  CLEAR_TSPIN_MINI_SINGLE,
  CLEAR_TSPIN_SINGLE,
  CLEAR_TSPIN_TRIPLE,
  COLS,
  KICKS_I,
  KICKS_JLSTZ,
  PIECE_I,
  PIECE_O,
  PIECE_T,
  PIECES,
  SPAWN,
  TOAST_BY_CLEAR_TYPE,
  TOTAL_ROWS,
  type ClearType,
  type PieceType,
} from "./config";

/** Cell = null (empty) or a PieceType (locked block of that colour). */
export type Cell = PieceType | null;
export type Grid = Cell[][];

/** Rotation state 0=spawn, 1=CW, 2=180, 3=CCW. */
export type RotState = 0 | 1 | 2 | 3;

type TSpinResult = typeof CLEAR_TSPIN | typeof CLEAR_TSPIN_MINI;

/** Rotate a set of cells CW inside an n×n box. */
function rotateCW(cells: [number, number][], n: number): [number, number][] {
  return cells.map(([x, y]) => [n - 1 - y, x] as [number, number]);
}

/** Cache: cells for every piece × rotation state. */
const SHAPE_CACHE: Record<string, [number, number][]> = {};
export function shape(piece: PieceType, rot: RotState): [number, number][] {
  const key = piece + rot;
  if (SHAPE_CACHE[key]) return SHAPE_CACHE[key];
  let cells = SPAWN[piece].map((c) => [...c] as [number, number]);
  const n = BOX[piece];
  for (let i = 0; i < rot; i++) cells = rotateCW(cells, n);
  SHAPE_CACHE[key] = cells;
  return cells;
}

function kicks(
  piece: PieceType,
  from: RotState,
  to: RotState,
): [number, number][] {
  if (piece === PIECE_O) return [[0, 0]];
  const table = piece === PIECE_I ? KICKS_I : KICKS_JLSTZ;
  return table[`${from}>${to}`] ?? [[0, 0]];
}

// --- 7-bag randomizer --------------------------------------------------------
export class Bag {
  private queue: PieceType[] = [];
  private rng: () => number;
  constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }
  private fill() {
    const b = [...PIECES];
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    this.queue.push(...b);
  }
  /** Peek the next `n` pieces without consuming. */
  peek(n: number): PieceType[] {
    while (this.queue.length < n) this.fill();
    return this.queue.slice(0, n);
  }
  next(): PieceType {
    if (this.queue.length === 0) this.fill();
    return this.queue.shift()!;
  }
}

// --- Active piece state ------------------------------------------------------
export interface Active {
  piece: PieceType;
  x: number;
  y: number;
  rot: RotState;
  /** Was the last successful movement a rotation? (needed for T-spin). */
  lastWasRotation: boolean;
  /** Kick index used by the last rotation (5th kick → T-spin, not mini). */
  lastKick: number;
}

export interface StepResult {
  linesCleared: number;
  clearType: ClearType;
  scoreGained: number;
  backToBack: boolean;
  /** Length of the current back-to-back chain (consecutive difficult clears).
   *  0 = no difficult clear; 1 = first difficult clear (badge NOT shown yet);
   *  >=2 = B2B active (badge shown). */
  b2bChain: number;
  combo: number;
  toast: string | null;
}

// --- Game -------------------------------------------------------------------
export class Tetris {
  grid: Grid;
  active: Active;
  hold: PieceType | null = null;
  canHold = true;
  bag: Bag;
  score = 0;
  lines = 0;
  level = 1;
  over = false;
  combo = -1;
  b2b = false;
  /** Consecutive difficult-clear counter. See StepResult.b2bChain. */
  b2bChain = 0;
  /** Rows detected as full by lockDetect(), awaiting collapse. */
  pendingRows: number[] = [];

  constructor(rng: () => number = Math.random) {
    this.bag = new Bag(rng);
    this.grid = Array.from({ length: TOTAL_ROWS }, () =>
      Array<Cell>(COLS).fill(null),
    );
    this.active = this.spawn(this.bag.next());
  }

  /** Upcoming pieces for the Next queue. */
  next(n: number): PieceType[] {
    return this.bag.peek(n);
  }

  private spawn(piece: PieceType): Active {
    // Spawn centered near the top; y offset uses hidden rows.
    const a: Active = {
      piece,
      x: 3,
      y: 0,
      rot: 0,
      lastWasRotation: false,
      lastKick: 0,
    };
    if (this.collides(a.x, a.y, a.rot, piece)) this.over = true;
    return a;
  }

  collides(px: number, py: number, rot: RotState, piece: PieceType): boolean {
    return shape(piece, rot).some(([cx, cy]) => {
      const gx = px + cx;
      const gy = py + cy;
      if (gx < 0 || gx >= COLS || gy >= TOTAL_ROWS) return true;
      if (gy >= 0 && this.grid[gy][gx]) return true;
      return false;
    });
  }

  move(dx: number): boolean {
    const a = this.active;
    if (this.collides(a.x + dx, a.y, a.rot, a.piece)) return false;
    a.x += dx;
    a.lastWasRotation = false;
    return true;
  }

  /** Soft step down. Returns false if it couldn't (resting on stack). */
  softDrop(): boolean {
    const a = this.active;
    if (this.collides(a.x, a.y + 1, a.rot, a.piece)) return false;
    a.y += 1;
    a.lastWasRotation = false;
    return true;
  }

  rotate(dir: 1 | -1): boolean {
    const a = this.active;
    const from = a.rot;
    const to = ((((a.rot + dir) % 4) + 4) % 4) as RotState;
    const table = kicks(a.piece, from, to);
    for (let i = 0; i < table.length; i++) {
      const [kx, ky] = table[i];
      if (!this.collides(a.x + kx, a.y + ky, to, a.piece)) {
        a.x += kx;
        a.y += ky;
        a.rot = to;
        a.lastWasRotation = true;
        a.lastKick = i;
        return true;
      }
    }
    return false;
  }

  /** Y where the active piece would land (for ghost). */
  ghostY(): number {
    const a = this.active;
    let gy = a.y;
    while (!this.collides(a.x, gy + 1, a.rot, a.piece)) gy++;
    return gy;
  }

  holdPiece(): boolean {
    if (!this.canHold) return false;
    const cur = this.active.piece;
    if (this.hold === null) {
      this.hold = cur;
      this.active = this.spawn(this.bag.next());
    } else {
      const swap = this.hold;
      this.hold = cur;
      this.active = this.spawn(swap);
    }
    this.canHold = false;
    return true;
  }

  private cornersFilled(
    px: number,
    py: number,
  ): { front: number; back: number } {
    // For T-piece: pivot is at box center (1,1). Corners relative to pivot.
    const cx = px + 1;
    const cy = py + 1;
    const at = (x: number, y: number) =>
      x < 0 || x >= COLS || y >= TOTAL_ROWS || (y >= 0 && !!this.grid[y][x])
        ? 1
        : 0;
    // Four diagonal corners of the T bounding box.
    const tl = at(cx - 1, cy - 1);
    const tr = at(cx + 1, cy - 1);
    const bl = at(cx - 1, cy + 1);
    const br = at(cx + 1, cy + 1);
    // "front" corners depend on rotation (the two the T points away from flat side).
    const rot = this.active.rot;
    // front = the two corners on the side the T's stem points.
    let front = 0,
      back = 0;
    if (rot === 0) {
      front = tl + tr;
      back = bl + br;
    } else if (rot === 1) {
      front = tr + br;
      back = tl + bl;
    } else if (rot === 2) {
      front = bl + br;
      back = tl + tr;
    } else {
      front = tl + bl;
      back = tr + br;
    }
    return { front, back };
  }

  private detectTSpin(): TSpinResult | null {
    const a = this.active;
    if (a.piece !== PIECE_T || !a.lastWasRotation) return null;
    const { front, back } = this.cornersFilled(a.x, a.y);
    if (front + back < 3) return null;
    // 3-corner rule: T-spin if >=3 corners filled. Mini if front<2 unless
    // the last kick was the 5th (index 4) which upgrades to a full T-spin.
    if (front === 2) return CLEAR_TSPIN;
    if (a.lastKick === 4) return CLEAR_TSPIN;
    return CLEAR_TSPIN_MINI;
  }

  /** Lock the active piece, clear lines, score, and spawn next (atomic). */
  lock(): StepResult {
    const { result } = this.lockDetect();
    this.resolveClear();
    return result;
  }

  /**
   * Phase 1 of a lock: place the active piece into the grid, detect full rows
   * and compute score — but DO NOT collapse the rows or spawn the next piece.
   * Full rows stay visible (in this.pendingRows) so a clear animation can play.
   */
  lockDetect(): { rows: number[]; result: StepResult; willAllClear: boolean } {
    const a = this.active;
    const tspin = this.detectTSpin();
    shape(a.piece, a.rot).forEach(([cx, cy]) => {
      const gy = a.y + cy;
      if (gy >= 0) this.grid[gy][a.x + cx] = a.piece;
    });

    const rows: number[] = [];
    for (let r = 0; r < TOTAL_ROWS; r++) {
      if (this.grid[r].every((c) => c)) rows.push(r);
    }
    this.pendingRows = rows;

    // Predict All Clear before collapsing: removing the full rows empties the
    // board iff every non-full row is already empty. Used to pick the SFX up
    // front so the all-clear sound replaces (not stacks with) the normal one.
    const drop = new Set(rows);
    const willAllClear =
      rows.length > 0 &&
      this.grid.every((row, r) => drop.has(r) || row.every((c) => !c));

    const result = this.scoreClear(rows.length, tspin);
    return { rows, result, willAllClear };
  }

  /** Phase 2 of a lock: collapse pendingRows and spawn the next piece.
   *  Returns whether the collapse produced an All Clear (perfect clear). */
  resolveClear(): { allClear: boolean } {
    let allClear = false;
    if (this.pendingRows.length > 0) {
      const drop = new Set(this.pendingRows);
      const kept = this.grid.filter((_, r) => !drop.has(r));
      const removed = TOTAL_ROWS - kept.length;
      const empties: Grid = Array.from({ length: removed }, () =>
        Array<Cell>(COLS).fill(null),
      );
      this.grid = empties.concat(kept);
      this.pendingRows = [];
      // All Clear: the entire board is empty after collapsing.
      if (this.grid.every((row) => row.every((c) => !c))) {
        allClear = true;
        this.b2b = true; // All Clear counts as a difficult clear for B2B.
        if (this.b2bChain < 1) this.b2bChain = 1;
        this.score += 3000 * this.level;
      }
    }
    this.canHold = true;
    this.active = this.spawn(this.bag.next());
    return { allClear };
  }

  private scoreClear(cleared: number, tspin: TSpinResult | null): StepResult {
    let clearType: ClearType = CLEAR_NONE;
    let base = 0;
    const lvl = this.level;
    const isDifficult = cleared === 4 || (tspin && cleared > 0);

    if (tspin === CLEAR_TSPIN_MINI) {
      if (cleared === 0) {
        clearType = CLEAR_TSPIN_MINI;
        base = 100;
      } else if (cleared === 1) {
        clearType = CLEAR_TSPIN_MINI_SINGLE;
        base = 200;
      } else {
        clearType = CLEAR_TSPIN_MINI_DOUBLE;
        base = 400;
      }
    } else if (tspin === CLEAR_TSPIN) {
      if (cleared === 0) {
        clearType = CLEAR_TSPIN;
        base = 400;
      } else if (cleared === 1) {
        clearType = CLEAR_TSPIN_SINGLE;
        base = 800;
      } else if (cleared === 2) {
        clearType = CLEAR_TSPIN_DOUBLE;
        base = 1200;
      } else {
        clearType = CLEAR_TSPIN_TRIPLE;
        base = 1600;
      }
    } else {
      if (cleared === 1) {
        clearType = CLEAR_SINGLE;
        base = 100;
      } else if (cleared === 2) {
        clearType = CLEAR_DOUBLE;
        base = 300;
      } else if (cleared === 3) {
        clearType = CLEAR_TRIPLE;
        base = 500;
      } else if (cleared === 4) {
        clearType = CLEAR_TETRIS;
        base = 800;
      }
    }

    const toast = TOAST_BY_CLEAR_TYPE[clearType] ?? null;
    let gained = base * lvl;

    // Back-to-Back: a chain of consecutive DIFFICULT clears (Tetris or any
    // T-spin that clears lines). The chain is only broken by a NON-difficult
    // LINE clear — placing pieces that clear nothing does NOT break it.
    // The ×1.5 bonus (and the B2B badge) applies from the 2nd difficult clear
    // onward, i.e. when b2bChain reaches >= 2.
    let b2bActive = false;
    if (cleared > 0) {
      if (isDifficult) {
        this.b2bChain += 1;
        if (this.b2bChain >= 2) {
          gained = Math.floor(gained * 1.5);
          b2bActive = true;
        }
      } else {
        this.b2bChain = 0; // non-difficult line clear breaks the chain
      }
      this.b2b = !!isDifficult;
    }

    // Combo.
    if (cleared > 0) {
      this.combo++;
      if (this.combo > 0) gained += 50 * this.combo * lvl;
    } else {
      this.combo = -1;
    }

    if (cleared > 0) {
      this.lines += cleared;
      this.level = 1 + Math.floor(this.lines / 10);
    }
    this.score += gained;

    return {
      linesCleared: cleared,
      clearType,
      scoreGained: gained,
      backToBack: b2bActive,
      b2bChain: this.b2bChain,
      combo: this.combo,
      toast,
    };
  }

  /** Drop to the bottom and score the cells, but do NOT lock (for animated locks). */
  hardDropOnly(): number {
    let cells = 0;
    while (
      !this.collides(
        this.active.x,
        this.active.y + 1,
        this.active.rot,
        this.active.piece,
      )
    ) {
      this.active.y++;
      cells++;
    }
    this.score += cells * 2;
    return cells;
  }

  hardDrop(): { cells: number; result: StepResult } {
    let cells = 0;
    while (
      !this.collides(
        this.active.x,
        this.active.y + 1,
        this.active.rot,
        this.active.piece,
      )
    ) {
      this.active.y++;
      cells++;
    }
    this.score += cells * 2;
    const result = this.lock();
    return { cells, result };
  }

  /** Gravity interval (ms) for the current level — Guideline formula. */
  gravityMs(): number {
    const t = Math.pow(0.8 - (this.level - 1) * 0.007, this.level - 1);
    return Math.max(t * 1000, 20);
  }
}
