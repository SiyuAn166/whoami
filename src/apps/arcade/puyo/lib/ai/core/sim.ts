/**
 * ProPuyoAI — board simulator.
 *
 * Flat Uint8Array of length ROWS*COLS, index = row * COLS + col, row 0 at the
 * top. Column-sequential access is what the evaluator does most, and a flat
 * typed array keeps that in one cache line per column pass.
 *
 * Every rule here is a direct port of lib/engine.ts:
 *   - gravity settles per column from the bottom and DISCARDS anything that
 *     would come to rest in the vanish row (row 0), keeping that row clear;
 *   - grouping/clearing only considers rows >= HIDDEN_ROWS, so ghost-row
 *     puyos never connect and never pop;
 *   - the cascade loop is the deterministic iterative
 *     gravity -> find groups -> pop -> gravity -> repeat.
 */

import {
  CELL_COUNT,
  CHAIN_POWER,
  COLOR_BONUS,
  COLS,
  FIRST_VISIBLE_ROW,
  GHOST_ROW,
  groupBonus,
  POP_MIN,
  ROWS,
  SPAWN_COL,
  VANISH_ROW,
} from "./geometry";

export type Board = Uint8Array;

export function createBoard(): Board {
  return new Uint8Array(CELL_COUNT);
}

export function cloneInto(src: Board, dst: Board): Board {
  dst.set(src);
  return dst;
}

/**
 * Board pool. The search allocates thousands of boards per move; recycling
 * them from a flat pool means steady-state zero allocation, so no GC spike
 * lands in the middle of a React frame.
 */
export class BoardPool {
  private pool: Board[] = [];
  private used = 0;
  obtain(): Board {
    if (this.used === this.pool.length) this.pool.push(createBoard());
    const b = this.pool[this.used++];
    b.fill(0);
    return b;
  }
  obtainCopy(src: Board): Board {
    if (this.used === this.pool.length) this.pool.push(createBoard());
    const b = this.pool[this.used++];
    b.set(src);
    return b;
  }
  reset(): void {
    this.used = 0;
  }
  get size(): number {
    return this.pool.length;
  }
}

/** Row index of the topmost occupied cell in a column, or ROWS if empty. */
export function topRowOf(b: Board, c: number): number {
  for (let r = 0; r < ROWS; r++) if (b[r * COLS + c] !== 0) return r;
  return ROWS;
}

/** Number of puyos stacked in a column (ghost-row puyos included). */
export function heightOf(b: Board, c: number): number {
  return ROWS - topRowOf(b, c);
}

export function readHeights(b: Board, out: Int32Array): void {
  for (let c = 0; c < COLS; c++) {
    let r = 0;
    while (r < ROWS && b[r * COLS + c] === 0) r++;
    out[c] = ROWS - r;
  }
}

/** Engine top-out test: the on-screen X cell is occupied. */
export function isTopOut(b: Board): boolean {
  return b[FIRST_VISIBLE_ROW * COLS + SPAWN_COL] !== 0;
}

/** True if every chain-eligible cell is empty (zenkeshi opportunity). */
export function isAllClear(b: Board): boolean {
  for (let r = FIRST_VISIBLE_ROW; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) if (b[r * COLS + c] !== 0) return false;
  return true;
}

// ---- Gravity --------------------------------------------------------------
const gcol = new Uint8Array(ROWS);

/**
 * Settle every column. Port of engine applyGravity: the write pointer walks up
 * from the floor and stops at the vanish row, so surplus puyos are discarded
 * and row 0 stays clear as a travel corridor.
 */
export function applyGravity(b: Board): void {
  for (let c = 0; c < COLS; c++) {
    let n = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      const v = b[r * COLS + c];
      if (v !== 0) gcol[n++] = v;
    }
    let write = ROWS - 1;
    let i = 0;
    while (i < n && write > VANISH_ROW) {
      b[write * COLS + c] = gcol[i];
      i++;
      write--;
    }
    for (let r = write; r >= 0; r--) b[r * COLS + c] = 0;
  }
}

/** Settle a single column only. Cheaper than a full pass after one drop. */
export function applyGravityColumn(b: Board, c: number): void {
  let n = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    const v = b[r * COLS + c];
    if (v !== 0) gcol[n++] = v;
  }
  let write = ROWS - 1;
  let i = 0;
  while (i < n && write > VANISH_ROW) {
    b[write * COLS + c] = gcol[i];
    i++;
    write--;
  }
  for (let r = write; r >= 0; r--) b[r * COLS + c] = 0;
}

// ---- Cascade -------------------------------------------------------------
export interface SimOut {
  /** chain length */
  chain: number;
  /** total puyos cleared */
  cleared: number;
  /** Puyo Puyo Tsu score, all-clear bonus NOT included */
  score: number;
  /** number of separate groups that popped on chain step 1 */
  firstGroups: number;
}

export function makeSimOut(): SimOut {
  return { chain: 0, cleared: 0, score: 0, firstGroups: 0 };
}

/**
 * Resolve every cascade in place. Deterministic iterative loop, no fuzzy
 * logic: settle, flood-fill groups of >= POP_MIN in the chain-eligible rows,
 * remove them all simultaneously, settle again, repeat until nothing pops.
 */
// ---- Bitboard pop detection ----------------------------------------------
/**
 * One Uint16 per (color, column). Bit k holds row (ROWS-1-k), so bit 0 is the
 * floor and bits 0..11 cover exactly the chain-eligible rows. That makes M12
 * the direct analogue of ama's get_mask_12() and lets the closed-form pop mask
 * of FieldBit::get_mask_pop port over verbatim.
 *
 * Gravity stays in the byte domain: measured cost is identical there, and
 * bit-domain compaction would need a PEXT equivalent for no gain.
 */
const M12 = 0x0fff;
const MAX_COLOR_ID = 5;
const colBits = new Uint16Array((MAX_COLOR_ID + 1) * COLS);
const popBits = new Uint16Array(COLS);
const m3Bits = new Uint16Array(COLS);
const m2Bits = new Uint16Array(COLS);

/** Encode the chain-eligible rows of `b` into per-color column masks. */
function encodeBits(b: Board): number {
  colBits.fill(0);
  let present = 0;
  for (let r = FIRST_VISIBLE_ROW; r < ROWS; r++) {
    const bit = 1 << (ROWS - 1 - r);
    const row = r * COLS;
    for (let c = 0; c < COLS; c++) {
      const color = b[row + c];
      if (color !== 0) {
        colBits[color * COLS + c] |= bit;
        present |= 1 << color;
      }
    }
  }
  return present;
}

/**
 * Closed-form poppable mask for one color. Direct port of
 * FieldBit::get_mask_pop: shift in four directions, derive the >=3-connected
 * set and the mutually adjacent >=2-connected set, expand one ring, clip.
 */
function popMaskOf(base: number): number {
  const c0 = colBits[base] & M12;
  const c1 = colBits[base + 1] & M12;
  const c2 = colBits[base + 2] & M12;
  const c3 = colBits[base + 3] & M12;
  const c4 = colBits[base + 4] & M12;
  const c5 = colBits[base + 5] & M12;
  if ((c0 | c1 | c2 | c3 | c4 | c5) === 0) return 0;

  for (let c = 0; c < COLS; c++) {
    const m = colBits[base + c] & M12;
    if (m === 0) {
      m3Bits[c] = 0;
      m2Bits[c] = 0;
      continue;
    }
    const left = c === 0 ? 0 : colBits[base + c - 1] & M12;
    const right = c === COLS - 1 ? 0 : colBits[base + c + 1] & M12;
    const u = (m >>> 1) & m;
    const d = (m << 1) & M12 & m;
    const l = left & m;
    const r = right & m;
    const udAnd = u & d;
    const lrAnd = l & r;
    const udOr = u | d;
    const lrOr = l | r;
    m3Bits[c] = (udAnd & lrOr) | (lrAnd & udOr);
    m2Bits[c] = udAnd | lrAnd | (udOr & lrOr);
  }

  for (let c = 0; c < COLS; c++) {
    const m = m2Bits[c];
    const up = (m >>> 1) & m;
    const dn = (m << 1) & M12 & m;
    const lf = c === 0 ? 0 : m2Bits[c - 1] & m;
    const rt = c === COLS - 1 ? 0 : m2Bits[c + 1] & m;
    popBits[c] = m3Bits[c] | up | dn | lf | rt;
  }

  // get_expand then clip to the color's own cells.
  const e0 = popBits[0],
    e1 = popBits[1],
    e2 = popBits[2];
  const e3 = popBits[3],
    e4 = popBits[4],
    e5 = popBits[5];
  const p0 = (e0 | (e0 >>> 1) | ((e0 << 1) & M12) | e1) & c0;
  const p1 = (e1 | (e1 >>> 1) | ((e1 << 1) & M12) | e0 | e2) & c1;
  const p2 = (e2 | (e2 >>> 1) | ((e2 << 1) & M12) | e1 | e3) & c2;
  const p3 = (e3 | (e3 >>> 1) | ((e3 << 1) & M12) | e2 | e4) & c3;
  const p4 = (e4 | (e4 >>> 1) | ((e4 << 1) & M12) | e3 | e5) & c4;
  const p5 = (e5 | (e5 >>> 1) | ((e5 << 1) & M12) | e4) & c5;
  popBits[0] = p0;
  popBits[1] = p1;
  popBits[2] = p2;
  popBits[3] = p3;
  popBits[4] = p4;
  popBits[5] = p5;
  return p0 | p1 | p2 | p3 | p4 | p5;
}

/** popcount for the 12-bit column masks. */
function popcount16(v: number): number {
  v = v - ((v >>> 1) & 0x5555);
  v = (v & 0x3333) + ((v >>> 2) & 0x3333);
  v = (v + (v >>> 4)) & 0x0f0f;
  return (v + (v >>> 8)) & 0x1f;
}

const grp = new Uint16Array(COLS);
const rest = new Uint16Array(COLS);
const clearBits = new Uint16Array(COLS);

/**
 * Carve `popBits` into connected groups. Groups of >= POP_MIN are OR-ed into
 * `clearBits` and their bonuses accumulated; smaller fragments (which the
 * closed form can leave behind) are discarded. Returns the cleared count and
 * writes the group bonus sum / group count into module scratch.
 */
let splitBonus = 0;
let splitGroups = 0;

function splitAndMark(): number {
  splitBonus = 0;
  splitGroups = 0;
  let cleared = 0;
  for (let c = 0; c < COLS; c++) rest[c] = popBits[c];

  for (;;) {
    let sc = -1;
    let seed = 0;
    for (let c = 0; c < COLS; c++) {
      if (rest[c] !== 0) {
        sc = c;
        seed = rest[c] & -rest[c];
        break;
      }
    }
    if (sc < 0) break;

    for (let c = 0; c < COLS; c++) grp[c] = 0;
    grp[sc] = seed;

    for (;;) {
      let changed = false;
      for (let c = 0; c < COLS; c++) {
        const m = grp[c];
        let next = m | (m >>> 1) | ((m << 1) & M12);
        if (c > 0) next |= grp[c - 1];
        if (c < COLS - 1) next |= grp[c + 1];
        next &= rest[c];
        if (next !== m) {
          grp[c] = next;
          changed = true;
        }
      }
      if (!changed) break;
    }

    let size = 0;
    for (let c = 0; c < COLS; c++) {
      size += popcount16(grp[c]);
      rest[c] &= ~grp[c];
    }
    if (size >= POP_MIN) {
      splitGroups++;
      splitBonus += groupBonus(size);
      cleared += size;
      for (let c = 0; c < COLS; c++) clearBits[c] |= grp[c];
    }
  }
  return cleared;
}

/**
 * Resolve every cascade in place using bitboard pop detection. Same contract
 * and same results as the byte flood-fill: settle, find all groups of
 * >= POP_MIN, remove them simultaneously, settle, repeat.
 *
 */
/**
 * WASM cascade hook. core/wasm.ts installs this after a successful init; while
 * null every call uses the pure-JS path below.
 */
let wasmActive: ((b: Board, out: SimOut) => boolean) | null = null;
export function setWasmResolve(
  fn: ((b: Board, out: SimOut) => boolean) | null,
): void {
  wasmActive = fn;
}

export function resolve(b: Board, out: SimOut): void {
  /* WASM SIMD path when loaded; results are bit-identical to the JS below. */
  if (wasmActive !== null && wasmActive(b, out)) return;

  applyGravity(b);
  let chain = 0;
  let totalScore = 0;
  let totalCleared = 0;
  let firstGroups = 0;

  for (;;) {
    const present = encodeBits(b);
    if (present === 0) break;

    let cleared = 0;
    let groupBonusSum = 0;
    let colorMask = 0;
    let groups = 0;
    for (let c = 0; c < COLS; c++) clearBits[c] = 0;

    for (let color = 1; color <= MAX_COLOR_ID; color++) {
      if ((present & (1 << color)) === 0) continue;
      if (popMaskOf(color * COLS) === 0) continue;
      const got = splitAndMark();
      if (got === 0) continue;
      cleared += got;
      groupBonusSum += splitBonus;
      groups += splitGroups;
      colorMask |= 1 << color;
    }

    if (cleared === 0) break;
    chain++;
    if (chain === 1) firstGroups = groups;

    for (let c = 0; c < COLS; c++) {
      let m = clearBits[c];
      while (m !== 0) {
        const bit = m & -m;
        const k = 31 - Math.clz32(bit);
        b[(ROWS - 1 - k) * COLS + c] = 0;
        m ^= bit;
      }
    }

    let colors = 0;
    let cm = colorMask;
    while (cm !== 0) {
      colors += cm & 1;
      cm >>>= 1;
    }

    const power =
      CHAIN_POWER[chain < CHAIN_POWER.length ? chain : CHAIN_POWER.length - 1];
    const colorBonus =
      COLOR_BONUS[
        colors < COLOR_BONUS.length ? colors : COLOR_BONUS.length - 1
      ];
    let mult = power + colorBonus + groupBonusSum;
    if (mult < 1) mult = 1;
    if (mult > 999) mult = 999;
    totalScore += 10 * cleared * mult;
    totalCleared += cleared;

    applyGravity(b);
  }

  out.chain = chain;
  out.cleared = totalCleared;
  out.score = totalScore;
  out.firstGroups = firstGroups;
}

// ---- Placement -----------------------------------------------------------
/**
 * Drop one puyo into a column. Returns the row it rests in, or -1 if it fell
 * into the vanish row and was discarded.
 */
export function dropOne(b: Board, c: number, color: number): number {
  const t = topRowOf(b, c);
  const r = t - 1;
  if (r <= VANISH_ROW) return -1;
  b[r * COLS + c] = color;
  return r;
}

export interface PlaceOut {
  /** how many of the two puyos actually came to rest (0..2) */
  placed: number;
  /** how many were lost to the vanish row */
  discarded: number;
}

const placeScratch: PlaceOut = { placed: 0, discarded: 0 };

/**
 * Apply a settled pair placement. rot: 0 = child above axis, 1 = child right,
 * 2 = child below axis, 3 = child left — matching the engine's Orient.
 * Horizontal pairs land per column independently, exactly as the engine's
 * hardDrop + gravity does. Returns null when the placement is impossible.
 */
export function applyPair(
  b: Board,
  col: number,
  rot: number,
  axis: number,
  child: number,
): PlaceOut | null {
  placeScratch.placed = 0;
  placeScratch.discarded = 0;

  if (rot === 0 || rot === 2) {
    if (col < 0 || col >= COLS) return null;
    const t = topRowOf(b, col);
    const lowRow = t - 1;
    if (lowRow <= VANISH_ROW) return null;
    const lowColor = rot === 0 ? axis : child;
    const highColor = rot === 0 ? child : axis;
    b[lowRow * COLS + col] = lowColor;
    placeScratch.placed++;
    const highRow = lowRow - 1;
    if (highRow > VANISH_ROW) {
      b[highRow * COLS + col] = highColor;
      placeScratch.placed++;
    } else {
      placeScratch.discarded++;
    }
    return placeScratch;
  }

  const other = rot === 1 ? col + 1 : col - 1;
  if (col < 0 || col >= COLS || other < 0 || other >= COLS) return null;

  const ta = topRowOf(b, col) - 1;
  if (ta > VANISH_ROW) {
    b[ta * COLS + col] = axis;
    placeScratch.placed++;
  } else {
    placeScratch.discarded++;
  }
  const tb = topRowOf(b, other) - 1;
  if (tb > VANISH_ROW) {
    b[tb * COLS + other] = child;
    placeScratch.placed++;
  } else {
    placeScratch.discarded++;
  }
  if (placeScratch.placed === 0) return null;
  return placeScratch;
}

/**
 * Can the driver actually steer the pair there? The axis spawns in the vanish
 * row, which gravity keeps permanently clear, so horizontal and child-up
 * placements can always slide across. A child-down pair carries its child
 * through the ghost row, which has volume, so that sweep must be clear.
 */
export function isReachable(b: Board, col: number, rot: number): boolean {
  if (rot === 1 && col + 1 >= COLS) return false;
  if (rot === 3 && col - 1 < 0) return false;
  if (col < 0 || col >= COLS) return false;
  if (rot !== 2) return true;
  const lo = col < SPAWN_COL ? col : SPAWN_COL;
  const hi = col > SPAWN_COL ? col : SPAWN_COL;
  for (let c = lo; c <= hi; c++) {
    if (b[GHOST_ROW * COLS + c] !== 0) return false;
  }
  return true;
}

export interface Cand {
  col: number;
  rot: number;
}

/**
 * Enumerate the legal, reachable, non-duplicate placements. 22 for a
 * two-colour pair, 11 when both halves share a colour (rot 0 == rot 2 and the
 * two horizontal orientations collapse onto the same column pairs).
 */
export function candidates(
  b: Board,
  axis: number,
  child: number,
  out: Cand[],
): number {
  let n = 0;
  const same = axis === child;
  for (let col = 0; col < COLS; col++) {
    const t = topRowOf(b, col);
    if (t - 1 <= VANISH_ROW) continue;
    if (isReachable(b, col, 0)) {
      const e = out[n] ?? (out[n] = { col: 0, rot: 0 });
      e.col = col;
      e.rot = 0;
      n++;
    }
    if (!same && isReachable(b, col, 2)) {
      const e = out[n] ?? (out[n] = { col: 0, rot: 0 });
      e.col = col;
      e.rot = 2;
      n++;
    }
  }
  for (let col = 0; col + 1 < COLS; col++) {
    const ta = topRowOf(b, col) - 1;
    const tb = topRowOf(b, col + 1) - 1;
    if (ta <= VANISH_ROW && tb <= VANISH_ROW) continue;
    if (isReachable(b, col, 1)) {
      const e = out[n] ?? (out[n] = { col: 0, rot: 0 });
      e.col = col;
      e.rot = 1;
      n++;
    }
    if (!same && isReachable(b, col + 1, 3)) {
      const e = out[n] ?? (out[n] = { col: 0, rot: 0 });
      e.col = col + 1;
      e.rot = 3;
      n++;
    }
  }
  return n;
}
