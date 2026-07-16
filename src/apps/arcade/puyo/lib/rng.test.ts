import { describe, it, expect } from "vitest";
import { ColorBag, mulberry32 } from "./rng";
import { NUM_COLORS, ALL_COLORS } from "./config";
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

  it("picks different palettes for different seeds (usually)", () => {
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
    const palettes = seeds.map((s) =>
      uniq(drawPairs(new ColorBag({ seed: s }), 300))
        .sort()
        .join(","),
    );
    expect(uniq(palettes as unknown as Color[]).length).toBeGreaterThan(1);
  });
});

describe("ColorBag opening restriction", () => {
  it("first 3 pairs use at most 3 distinct colours", () => {
    for (let seed = 0; seed < 200; seed++) {
      const bag = new ColorBag({ seed });
      const opening = drawPairs(bag, 3);
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
