// Deterministic, seedable colour sequence generator (mulberry32).
// Seeding lets us reproduce a run for practice drills if desired.

import { NUM_COLORS } from "./config";
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

export class ColorBag {
  private rand: () => number;
  constructor(seed = (Math.random() * 2 ** 32) >>> 0) {
    this.rand = mulberry32(seed);
  }
  /** Next colour in 1..NUM_COLORS. */
  next(): Color {
    return (1 + Math.floor(this.rand() * NUM_COLORS)) as Color;
  }
  /** A fresh pair of colours. */
  pair(): [Color, Color] {
    return [this.next(), this.next()];
  }
}
