// ============================================================================
// Puyo engine — pure game-rule computation. Pair drop + rotation with simple
// wall/floor kicks, column gravity, 4-connected flood-fill group detection,
// and Puyo Puyo Tsu chain scoring. No DOM, no React, no rendering.
// All static data (colours, rule tables) lives in config.ts.
// ============================================================================
import {
  CHAIN_POWER,
  CLEAR_MIN,
  COLORS,
  COLOR_BONUS,
  COLOR_COUNT,
  COLS,
  HIDDEN_ROWS,
  TOTAL_ROWS,
  groupBonus,
  type PuyoColor,
} from "./config";

export type Cell = PuyoColor | null;
export type Grid = Cell[][];
/** 0 = satellite above axis, 1 = right, 2 = below, 3 = left. */
export type Rot = 0 | 1 | 2 | 3;

export interface Pair {
  axis: PuyoColor;
  sat: PuyoColor;
  x: number; // axis column
  y: number; // axis row
  rot: Rot;
}

/** One link of a chain reaction — carries snapshots so the view can animate. */
export interface ChainStep {
  chain: number; // 1-based chain index
  cleared: [number, number][]; // grid coords popped this step
  gained: number; // score gained this step
  colors: number; // distinct colours popped this step
  totalCleared: number; // puyos popped this step
}

const SAT_OFFSET: Record<Rot, [number, number]> = {
  0: [0, -1],
  1: [1, 0],
  2: [0, 1],
  3: [-1, 0],
};

function cloneGrid(g: Grid): Grid {
  return g.map((r) => r.slice());
}

/** The colours actually in play this game (first COLOR_COUNT of COLORS). */
export const ACTIVE_COLORS: PuyoColor[] = COLORS.slice(0, COLOR_COUNT);

// --- Authentic Puyo Puyo colour generation ----------------------------------
// Real Puyo is NOT a Tetris-style bag: every puyo is an INDEPENDENT uniform
// draw from the active palette. The one structural rule the pro games (Tsu and
// later) add is the OPENING RESTRICTION — the first few pairs are limited to a
// reduced set of colours so the opening is always buildable and never a jarring
// 4/5-colour scatter. We reproduce that exactly.
const OPENING_PAIRS = 3; // number of opening pairs drawn from the reduced set
const OPENING_COLORS = 3; // how many distinct colours those opening pairs use

/** Fisher-Yates shuffle of a copy of `arr` using rng (unbiased). */
function shuffled<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class Puyo {
  grid: Grid;
  pair: Pair;
  queue: Pair[] = [];
  rng: () => number;
  private openColors: PuyoColor[]; // reduced palette used for the opening pairs
  private generated = 0; // how many pairs have been generated this game
  score = 0;
  chainMax = 0;
  cleared = 0; // total puyos popped over the game
  over = false;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
    // Pick the reduced opening palette once per game.
    this.openColors = shuffled(ACTIVE_COLORS, rng).slice(
      0,
      Math.min(OPENING_COLORS, ACTIVE_COLORS.length),
    );
    this.grid = Array.from({ length: TOTAL_ROWS }, () =>
      Array<Cell>(COLS).fill(null),
    );
    this.fillQueue();
    this.pair = this.spawn();
  }

  private fillQueue() {
    while (this.queue.length < 3) this.queue.push(this.makePair());
  }

  /** Uniform pick from a colour pool. */
  private pickColor(pool: PuyoColor[]): PuyoColor {
    return pool[Math.floor(this.rng() * pool.length)];
  }

  /**
   * Next pair. The two puyos are independent uniform draws (authentic Puyo),
   * but the first OPENING_PAIRS pairs draw from the reduced opening palette.
   */
  private makePair(): Pair {
    const pool =
      this.generated < OPENING_PAIRS ? this.openColors : ACTIVE_COLORS;
    this.generated++;
    return {
      axis: this.pickColor(pool),
      sat: this.pickColor(pool),
      x: 2,
      y: HIDDEN_ROWS - 1,
      rot: 0,
    };
  }

  /** Upcoming pairs for the Next preview (does not consume). */
  next(n: number): Pair[] {
    this.fillQueue();
    return this.queue.slice(0, n);
  }

  private spawn(): Pair {
    this.fillQueue();
    const p = this.queue.shift()!;
    this.fillQueue();
    p.x = 2;
    p.y = HIDDEN_ROWS - 1;
    p.rot = 0;
    if (this.collidesPair(p)) this.over = true;
    return p;
  }

  /** Spawn the next active pair (called after a lock resolves). */
  spawnActive(): void {
    this.pair = this.spawn();
  }

  satPos(p: Pair): [number, number] {
    const [dx, dy] = SAT_OFFSET[p.rot];
    return [p.x + dx, p.y + dy];
  }

  private cellBlocked(x: number, y: number): boolean {
    if (x < 0 || x >= COLS || y >= TOTAL_ROWS) return true;
    if (y < 0) return false; // above the top is free space
    return !!this.grid[y][x];
  }

  collidesPair(p: Pair): boolean {
    const [sx, sy] = this.satPos(p);
    return this.cellBlocked(p.x, p.y) || this.cellBlocked(sx, sy);
  }

  move(dx: number): boolean {
    const p = { ...this.pair, x: this.pair.x + dx };
    if (this.collidesPair(p)) return false;
    this.pair.x += dx;
    return true;
  }

  rotate(dir: 1 | -1): boolean {
    const to = ((((this.pair.rot + dir) % 4) + 4) % 4) as Rot;
    const away = dir === 1 ? -1 : 1;
    // Try in place, then a horizontal wall-kick, then the opposite side, then a
    // floor-kick (lift up) so rotating against the bottom still succeeds.
    const kicks: [number, number][] = [
      [0, 0],
      [away, 0],
      [-away, 0],
      [0, -1],
    ];
    for (const [kx, ky] of kicks) {
      const p = {
        ...this.pair,
        rot: to,
        x: this.pair.x + kx,
        y: this.pair.y + ky,
      };
      if (!this.collidesPair(p)) {
        this.pair = p;
        return true;
      }
    }
    return false;
  }

  canFall(): boolean {
    return !this.collidesPair({ ...this.pair, y: this.pair.y + 1 });
  }

  softDrop(): boolean {
    if (this.canFall()) {
      this.pair.y++;
      return true;
    }
    return false;
  }

  /**
   * Preview-only: simulate hard-dropping the CURRENT pair at its ghost position
   * and resolving every chain link, WITHOUT mutating real state. Returns whether
   * placing the pair here pops anything and how many chain links it triggers.
   */
  predict(): { willClear: boolean; chains: number; cells: [number, number][] } {
    const landY = this.ghostDropY();
    const saved = this.grid;
    this.grid = cloneGrid(saved);
    try {
      const p = { ...this.pair, y: landY };
      const [sx, sy] = this.satPos(p);
      if (p.y >= 0 && p.y < TOTAL_ROWS && p.x >= 0 && p.x < COLS)
        this.grid[p.y][p.x] = p.axis;
      if (sy >= 0 && sy < TOTAL_ROWS && sx >= 0 && sx < COLS)
        this.grid[sy][sx] = p.sat;
      let chains = 0;
      // Cells that vanish on the FIRST pop (the immediate result of this drop).
      // These map onto real board coords (settled puyos don't move) + the
      // landing pair cells, so the view can blink exactly what will disappear.
      const cells: [number, number][] = [];
      // mirror the real chain loop, but scoreless: settle, pop, repeat.
      for (;;) {
        this.applyGravity();
        const groups = this.findClearGroups();
        if (groups.length === 0) break;
        chains++;
        for (const grp of groups)
          for (const [y, x] of grp) {
            if (chains === 1) cells.push([y, x]);
            this.grid[y][x] = null;
          }
      }
      return { willClear: chains > 0, chains, cells };
    } finally {
      this.grid = saved;
    }
  }

  /** Axis row where the pair would land (for the ghost preview). */
  ghostDropY(): number {
    let y = this.pair.y;
    while (!this.collidesPair({ ...this.pair, y: y + 1 })) y++;
    return y;
  }

  /** Lowest empty row in a column (where the next puyo dropped there rests). */
  private lowestFree(c: number): number {
    for (let r = TOTAL_ROWS - 1; r >= 0; r--) if (!this.grid[r][c]) return r;
    return -1;
  }

  /**
   * True resting cells of the pair's two puyos AFTER hard-drop AND gravity.
   * For a horizontal pair over uneven ground the two puyos settle in their own
   * columns at different rows, so the ghost must not draw them on a shared row.
   * Rows are absolute (include hidden rows); a row < 0 means it rests off-screen.
   */
  ghostSettled(): { ax: number; ay: number; sx: number; sy: number } {
    const landY = this.ghostDropY();
    const p = { ...this.pair, y: landY };
    const ax = p.x;
    const [sx, sy] = this.satPos(p);
    if (ax === sx) {
      // Vertical pair: both fall in one column and stack; the puyo that is
      // physically lower (larger y) ends on the bottom, the other just above.
      const bottom = this.lowestFree(ax);
      if (p.y >= sy) return { ax, ay: bottom, sx, sy: bottom - 1 };
      return { ax, ay: bottom - 1, sx, sy: bottom };
    }
    // Horizontal pair: each puyo settles independently in its own column.
    return { ax, ay: this.lowestFree(ax), sx, sy: this.lowestFree(sx) };
  }

  hardDrop(): number {
    let n = 0;
    while (this.canFall()) {
      this.pair.y++;
      n++;
    }
    return n;
  }

  /** Write the active pair's two puyos into the grid. */
  lockPair(): void {
    const p = this.pair;
    const [sx, sy] = this.satPos(p);
    if (p.y >= 0) this.grid[p.y][p.x] = p.axis;
    if (sy >= 0) this.grid[sy][sx] = p.sat;
  }

  /** Compact every column downward. Returns whether anything moved. */
  applyGravity(): boolean {
    let moved = false;
    for (let c = 0; c < COLS; c++) {
      let write = TOTAL_ROWS - 1;
      for (let r = TOTAL_ROWS - 1; r >= 0; r--) {
        if (this.grid[r][c]) {
          if (r !== write) {
            this.grid[write][c] = this.grid[r][c];
            this.grid[r][c] = null;
            moved = true;
          }
          write--;
        }
      }
    }
    return moved;
  }

  /**
   * Same as applyGravity but records every puyo that shifted, with its old
   * and new row, so the view can animate the fall. Grid ends fully settled.
   */
  applyGravityAnimated(): {
    col: number;
    from: number;
    to: number;
    color: PuyoColor;
  }[] {
    const moves: { col: number; from: number; to: number; color: PuyoColor }[] =
      [];
    for (let c = 0; c < COLS; c++) {
      let write = TOTAL_ROWS - 1;
      for (let r = TOTAL_ROWS - 1; r >= 0; r--) {
        const cell = this.grid[r][c];
        if (cell) {
          if (r !== write) {
            this.grid[write][c] = cell;
            this.grid[r][c] = null;
            moves.push({ col: c, from: r, to: write, color: cell });
          }
          write--;
        }
      }
    }
    return moves;
  }

  /** All 4-connected same-colour groups of size >= CLEAR_MIN. */
  findClearGroups(): [number, number][][] {
    const seen = Array.from({ length: TOTAL_ROWS }, () =>
      Array<boolean>(COLS).fill(false),
    );
    const groups: [number, number][][] = [];
    const dirs: [number, number][] = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (let r = 0; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const col = this.grid[r][c];
        if (!col || seen[r][c]) continue;
        const stack: [number, number][] = [[r, c]];
        const grp: [number, number][] = [];
        seen[r][c] = true;
        while (stack.length) {
          const [y, x] = stack.pop()!;
          grp.push([y, x]);
          for (const [dy, dx] of dirs) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny < 0 || ny >= TOTAL_ROWS || nx < 0 || nx >= COLS) continue;
            if (seen[ny][nx]) continue;
            if (this.grid[ny][nx] === col) {
              seen[ny][nx] = true;
              stack.push([ny, nx]);
            }
          }
        }
        if (grp.length >= CLEAR_MIN) groups.push(grp);
      }
    }
    return groups;
  }

  /**
   * One link of a chain: settle gravity, detect groups. If any pop, clear them,
   * score, and return the step. Returns null when nothing pops (chain ended).
   * `chain` is the 1-based index of THIS link.
   */
  resolveStep(chain: number): ChainStep | null {
    this.applyGravity();
    const groups = this.findClearGroups();
    if (groups.length === 0) return null;
    return this.commitClear(chain, groups);
  }

  /**
   * Remove pre-detected groups, score them, and return the step. Split out from
   * resolveStep so the view can BLINK the groups (flash phase) before they are
   * actually removed here (commit phase).
   */
  commitClear(chain: number, groups: [number, number][][]): ChainStep {
    const colorset = new Set<PuyoColor>();
    let total = 0;
    let gb = 0;
    const cleared: [number, number][] = [];
    for (const grp of groups) {
      total += grp.length;
      gb += groupBonus(grp.length);
      const [r0, c0] = grp[0];
      colorset.add(this.grid[r0][c0]!);
      for (const [y, x] of grp) {
        cleared.push([y, x]);
        this.grid[y][x] = null;
      }
    }
    const cp = CHAIN_POWER[Math.min(chain, CHAIN_POWER.length - 1)];
    const cb = COLOR_BONUS[Math.min(colorset.size, COLOR_BONUS.length - 1)];
    const mult = Math.max(1, Math.min(999, cp + cb + gb));
    const gained = 10 * total * mult;
    this.score += gained;
    this.cleared += total;
    if (chain > this.chainMax) this.chainMax = chain;
    return {
      chain,
      cleared,
      gained,
      colors: colorset.size,
      totalCleared: total,
    };
  }

  /** True when the whole board is empty (all-clear bonus opportunity). */
  isAllClear(): boolean {
    return this.grid.every((row) => row.every((c) => !c));
  }

  snapshot(): Grid {
    return cloneGrid(this.grid);
  }
}
