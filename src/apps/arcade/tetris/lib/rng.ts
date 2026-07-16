import { PIECES, type PieceType } from "./config";

// 7-bag randomizer with a small seedable PRNG (mulberry32).
export class Bag {
  private queue: PieceType[] = [];
  private rand: () => number;

  constructor(seed?: number) {
    let s = (seed ?? Date.now() >>> 0) || 1;
    this.rand = () => {
      s |= 0;
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    this.refill();
  }

  private refill() {
    const b = [...PIECES];
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(this.rand() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    this.queue.push(...b);
  }

  next(): PieceType {
    if (this.queue.length <= PIECES.length) this.refill();
    return this.queue.shift()!;
  }

  peek(n: number): PieceType[] {
    while (this.queue.length < n) this.refill();
    return this.queue.slice(0, n);
  }
}
