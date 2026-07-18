import { describe, expect, it } from "vitest";

import { ALL_COLORS, NUM_COLORS } from "./config";
import { ColorBag, mulberry32, POOL_SIZE } from "./rng";

import type { Color } from "./types";

const uniq = (xs: Color[]) => [...new Set(xs)];

function drawPairs(bag: ColorBag, n: number): Color[] {
  const out: Color[] = [];
  for (let i = 0; i < n; i++) out.push(...bag.pair());
  return out;
}

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("returns values in [0, 1)", () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("differs across seeds", () => {
    expect(mulberry32(1)()).not.toEqual(mulberry32(2)());
  });
});

describe("ColorBag palette", () => {
  it("uses exactly NUM_COLORS distinct colours by default", () => {
    const bag = new ColorBag({ seed: 42 });
    const colors = uniq(drawPairs(bag, 500));
    expect(colors.length).toBe(NUM_COLORS);
  });

  it("every colour is a valid ALL_COLORS member", () => {
    const bag = new ColorBag({ seed: 99 });
    for (const c of drawPairs(bag, 500)) {
      expect(ALL_COLORS).toContain(c);
    }
  });

  it("honours a custom colorCount", () => {
    const bag = new ColorBag({ seed: 3, colorCount: 5, openingPairs: 0 });
    expect(uniq(drawPairs(bag, 1000)).length).toBe(5);
  });

  it("clamps colorCount to at least 3 and at most ALL_COLORS.length", () => {
    const low = new ColorBag({ seed: 1, colorCount: 1, openingPairs: 0 });
    expect(uniq(drawPairs(low, 1000)).length).toBe(3);
    const high = new ColorBag({ seed: 1, colorCount: 99, openingPairs: 0 });
    expect(uniq(drawPairs(high, 1000)).length).toBe(ALL_COLORS.length);
  });

  it("produces different sequences for different seeds", () => {
    const a = JSON.stringify(drawPairs(new ColorBag({ seed: 1 }), 300));
    const b = JSON.stringify(drawPairs(new ColorBag({ seed: 2 }), 300));
    expect(a).not.toEqual(b);
  });
});

describe("ColorBag opening restriction", () => {
  it("first 2 pairs (first four puyos) use at most 3 distinct colors", () => {
    for (let seed = 0; seed < 200; seed++) {
      const bag = new ColorBag({ seed });
      const opening = drawPairs(bag, 2);
      expect(uniq(opening).length).toBeLessThanOrEqual(3);
    }
  });

  it("respects a custom openingPairs count", () => {
    for (let seed = 0; seed < 100; seed++) {
      const bag = new ColorBag({ seed, openingPairs: 5 });
      const opening = drawPairs(bag, 5);
      expect(uniq(opening).length).toBeLessThanOrEqual(3);
    }
  });

  it("openingPairs: 0 disables the restriction", () => {
    // Over many seeds, at least one 4-colour game should show 4 colours early.
    let sawFour = false;
    for (let seed = 0; seed < 200 && !sawFour; seed++) {
      const bag = new ColorBag({ seed, openingPairs: 0 });
      if (uniq(drawPairs(bag, 3)).length === 4) sawFour = true;
    }
    expect(sawFour).toBe(true);
  });

  it("the opening subset is drawn from the game palette", () => {
    for (let seed = 0; seed < 100; seed++) {
      const bag = new ColorBag({ seed });
      const all = drawPairs(bag, 300);
      const palette = new Set(all);
      const opening = all.slice(0, 6);
      for (const c of opening) expect(palette.has(c)).toBe(true);
    }
  });
});

describe("ColorBag determinism & API", () => {
  it("same seed => identical pair stream", () => {
    const a = new ColorBag({ seed: 2024 });
    const b = new ColorBag({ seed: 2024 });
    expect(drawPairs(a, 100)).toEqual(drawPairs(b, 100));
  });

  it("legacy numeric constructor still works and is seeded", () => {
    const a = new ColorBag(555);
    const b = new ColorBag(555);
    expect(drawPairs(a, 50)).toEqual(drawPairs(b, 50));
  });

  it("pair() returns a 2-tuple of valid colours", () => {
    const bag = new ColorBag({ seed: 1 });
    const p = bag.pair();
    expect(p).toHaveLength(2);
    expect(ALL_COLORS).toContain(p[0]);
    expect(ALL_COLORS).toContain(p[1]);
  });

  it("next() draws from the full palette", () => {
    const bag = new ColorBag({ seed: 77 });
    const colors = uniq(Array.from({ length: 500 }, () => bag.next()));
    expect(colors.length).toBe(NUM_COLORS);
  });
});

describe("ColorBag pool model", () => {
  it("exposes a 256-puyo (128-pair) block size", () => {
    expect(POOL_SIZE).toBe(256);
  });

  it("stays deterministic across a block boundary (>128 pairs)", () => {
    const a = new ColorBag({ seed: 2026 });
    const b = new ColorBag({ seed: 2026 });
    expect(drawPairs(a, 300)).toEqual(drawPairs(b, 300)); // 300 > 128 => rebuilt
  });

  it("re-applies the opening restriction on every rebuilt block", () => {
    const bag = new ColorBag({ seed: 42 });
    for (let block = 0; block < 8; block++) {
      const opening = [...bag.pair(), ...bag.pair()]; // first 2 pairs of block
      expect(uniq(opening).length).toBeLessThanOrEqual(3);
      for (let i = 0; i < 126; i++) bag.pair(); // consume rest of the 128-pair block
    }
  });

  it("allows the 4th/5th colour from the third pair onward (opening is 2 pairs)", () => {
    let sawLate = false;
    for (let seed = 0; seed < 500 && !sawLate; seed++) {
      const bag = new ColorBag({ seed });
      bag.pair();
      bag.pair();
      const p3 = bag.pair();
      const late = ALL_COLORS.slice(3); // colours 4 and 5
      if (p3.some((c) => late.includes(c))) sawLate = true;
    }
    expect(sawLate).toBe(true);
  });
});

describe("ColorBag continuous PRNG stream (no reseed on rebuild)", () => {
  it("is reproducible across three blocks (>256 pairs) from the initial seed", () => {
    const a = new ColorBag({ seed: 2024 });
    const b = new ColorBag({ seed: 2024 });
    // 384 pairs = 768 puyos spans three 256-puyo blocks.
    expect(drawPairs(a, 384)).toEqual(drawPairs(b, 384));
  });

  it("advances the stream on rebuild, so consecutive blocks are not identical", () => {
    const bag = new ColorBag({ seed: 2024, openingPairs: 0 });
    const block1 = drawPairs(bag, 128); // first 256 puyos
    const block2 = drawPairs(bag, 128); // rebuilt block, same continuous stream
    // A reset-to-initial-seed rebuild would make block2 === block1; a continuous
    // stream must keep flowing forward, so the two blocks differ.
    expect(JSON.stringify(block2)).not.toEqual(JSON.stringify(block1));
  });

  it("keeps the opening restriction after crossing several block boundaries", () => {
    const bag = new ColorBag({ seed: 7 });
    const late = ALL_COLORS.slice(3); // colours 4 and 5
    for (let block = 0; block < 4; block++) {
      const opening = [...bag.pair(), ...bag.pair()]; // first 2 pairs of the block
      expect(opening.some((c) => late.includes(c))).toBe(false);
      for (let i = 0; i < 126; i++) bag.pair(); // consume the rest of the block
    }
  });

  it("produces a near-balanced distribution per block (unbiased Fisher-Yates)", () => {
    // Linear fill + Fisher-Yates keeps colour counts close to POOL_SIZE / 5.
    const bag = new ColorBag({ seed: 123, openingPairs: 0 });
    const counts = new Map<Color, number>();
    for (let i = 0; i < 128; i++) {
      for (const c of bag.pair()) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    const expected = POOL_SIZE / NUM_COLORS; // ~51.2
    for (const c of ALL_COLORS) {
      const n = counts.get(c) ?? 0;
      // Balanced pool: every colour is within a few of the exact share.
      expect(Math.abs(n - expected)).toBeLessThanOrEqual(5);
    }
  });
});
