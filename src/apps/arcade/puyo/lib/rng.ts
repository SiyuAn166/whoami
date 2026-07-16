// Deterministic, seedable colour sequence generator (mulberry32).
// Seeding lets us reproduce a run for practice drills if desired.
//
// Professional spawn rules (Puyo Puyo Tsu style):
//   1. A game uses a fixed palette of `colorCount` colours (default 4),
//      chosen at random from the 5 available at construction time.
//   2. The first `openingPairs` pairs (default 3) are drawn from only a
//      3-colour subset of that palette, so the player can never be dealt an
//      unfair 4-colour opening that forces an early topout.

import { NUM_COLORS, ALL_COLORS } from "./config";
import type { Color } from "./types";

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
  /** Number of distinct colours used this game (default NUM_COLORS = 4). */
  colorCount?: number;
  /** Opening pairs restricted to a 3-colour subset (default 3). */
  openingPairs?: number;
}

export class ColorBag {
  private rand: () => number;
  private palette: Color[];
  private early: Color[];
  private dealt = 0;
  private readonly openingPairs: number;

  constructor(opts: ColorBagOptions | number = {}) {
    // Back-compat: `new ColorBag(seed)` still works.
    const o: ColorBagOptions = typeof opts === "number" ? { seed: opts } : opts;
    const seed = o.seed ?? (Math.random() * 2 ** 32) >>> 0;
    this.rand = mulberry32(seed);

    const colorCount = Math.max(
      3,
      Math.min(o.colorCount ?? NUM_COLORS, ALL_COLORS.length),
    );
    this.openingPairs = o.openingPairs ?? 3;

    // Pick this game's palette: shuffle the full colour list, take colorCount.
    this.palette = this.shuffle([...ALL_COLORS]).slice(0, colorCount);
    // Opening subset: the first 3 palette colours (or fewer if colorCount < 3).
    this.early = this.palette.slice(0, Math.min(3, colorCount));
  }

  private shuffle(a: Color[]): Color[] {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  private pick(from: Color[]): Color {
    return from[Math.floor(this.rand() * from.length)];
  }

  /** Next colour drawn from the full game palette. */
  next(): Color {
    return this.pick(this.palette);
  }

  /** A fresh pair, honouring the opening 3-colour restriction. */
  pair(): [Color, Color] {
    const src = this.dealt < this.openingPairs ? this.early : this.palette;
    this.dealt++;
    return [this.pick(src), this.pick(src)];
  }
}
