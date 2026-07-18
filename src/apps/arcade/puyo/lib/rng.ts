// Deterministic, seedable colour sequence generator for five-colour Puyo.
//
// Implements the pre-generated pool model (Puyo Puyo Champions, 5-colour mode):
//
// 1. Per game (per 256-puyo block) a fixed pool of 256 puyos / 128 pairs is
//    generated up front; pieces are then consumed sequentially by a pointer.
// 2. Two pools are built from ONE continuous PRNG stream:
//      Pool3 — linear fill 0,1,2,0,1,2,... (three colours)
//      Pool5 — linear fill 0,1,2,3,4,... (five colours, the target pool)
//    Pool3 is shuffled first, then — WITHOUT reseeding — the same stream
//    keeps running to shuffle Pool5.
// 3. Shuffle = standard reverse Fisher-Yates (i from SIZE-1 down to 1), with
//    the swap index drawn from the SHRINKING range [0, i] each step, giving a
//    mathematically unbiased permutation.
// 4. Opening overwrite: Pool5[0..openingSlots-1] = Pool3[0..openingSlots-1],
//    so the first two pairs (four puyos) can only be colours {0,1,2} — the
//    4th and 5th colours are impossible in the opening.
// 5. Pairs are read as (Pool5[2n] = axis, Pool5[2n+1] = trigger).
// 6. When the pointer reaches 256 the block is exhausted: the SAME continuous
//    stream (never reseeded) keeps running to re-run the whole build (fill,
//    shuffle, overwrite) with the pointer reset to 0.
//
// The stream never advances from player actions — only from block builds — so
// the sequence is fully predetermined by the initial seed.

import { ALL_COLORS, NUM_COLORS } from "./config";

import type { Color } from "./types";

export const POOL_SIZE = 256;

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ColorBagOptions {
  seed?: number;
  /** Number of distinct colours in the main pool (default NUM_COLORS = 5). */
  colorCount?: number;
  /** Opening pairs copied from the 3-colour pool (default 2 = first 4 puyos). */
  openingPairs?: number;
}

export class ColorBag {
  private rand: () => number;
  private readonly colors5: Color[];
  private readonly colors3: Color[];
  private readonly openingSlots: number;

  private pool: Color[] = [];
  private pointer = 0;

  constructor(opts: ColorBagOptions | number = {}) {
    // Back-compat: `new ColorBag(seed)` still works.
    const o: ColorBagOptions = typeof opts === "number" ? { seed: opts } : opts;
    const seed = o.seed ?? (Math.random() * 2 ** 32) >>> 0;
    this.rand = mulberry32(seed);

    const colorCount = Math.max(
      3,
      Math.min(o.colorCount ?? NUM_COLORS, ALL_COLORS.length),
    );
    const openingPairs = Math.max(0, o.openingPairs ?? 2);

    // Colours 0..4 map onto ALL_COLORS (1..5). Pool3 is the first 3 of them.
    this.colors5 = ALL_COLORS.slice(0, colorCount);
    this.colors3 = ALL_COLORS.slice(0, Math.min(3, colorCount));
    this.openingSlots = Math.min(openingPairs * 2, POOL_SIZE);

    this.buildBlock();
  }

  /** Linear fill: colours[0], colours[1], ... cycled to fill POOL_SIZE. */
  private fill(colours: Color[]): Color[] {
    const pool = new Array<Color>(POOL_SIZE);
    for (let i = 0; i < POOL_SIZE; i++) pool[i] = colours[i % colours.length];
    return pool;
  }

  /** Reverse Fisher-Yates over one continuous stream; j in [0, i] (unbiased). */
  private shufflePool(pool: Color[]): void {
    for (let i = POOL_SIZE - 1; i > 0; i--) {
      const j = Math.floor(this.rand() * (i + 1)); // standard Fisher-Yates: j in [0, i]
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
  }

  /** Build one 256-puyo block from the current continuous stream. */
  private buildBlock(): void {
    const pool3 = this.fill(this.colors3);
    const pool5 = this.fill(this.colors5);

    // One continuous stream: shuffle Pool3 first, then Pool5 — no reseed.
    this.shufflePool(pool3);
    this.shufflePool(pool5);

    // Opening overwrite (checkpoint 1): first openingSlots come from Pool3.
    for (let i = 0; i < this.openingSlots; i++) pool5[i] = pool3[i];

    this.pool = pool5;
    this.pointer = 0;
  }

  /** Pool exhausted: rebuild the next 256-block from the SAME continuous PRNG
   *  stream. We deliberately do NOT re-instantiate mulberry32 here — reseeding
   *  would truncate the engine's internal state and start a new stream, breaking
   *  the "one continuous, never-reset random river" guarantee. */
  private rebuild(): void {
    this.buildBlock();
  }

  /** Next single puyo from the pool. */
  next(): Color {
    if (this.pointer >= POOL_SIZE) this.rebuild();
    return this.pool[this.pointer++];
  }

  /** A pair: [axis = pool[2n], trigger = pool[2n+1]]. */
  pair(): [Color, Color] {
    if (this.pointer + 2 > POOL_SIZE) this.rebuild();
    const axis = this.pool[this.pointer];
    const trigger = this.pool[this.pointer + 1];
    this.pointer += 2;
    return [axis, trigger];
  }
}
