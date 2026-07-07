// ============================================================================
// engine.test.ts — Vitest unit tests for the Tetris engine.
// Run:  npx vitest            (watch)   ·   npx vitest run   (once)
// Place at: src/apps/tetris/engine.test.ts  (next to engine.ts)
// ============================================================================
import { describe, it, expect } from "vitest";
import {
  Bag,
  Tetris,
  shape,
  PIECES,
  COLS,
  TOTAL_ROWS,
  type PieceType,
  type Grid,
  type Cell,
} from "./engine";

// A deterministic RNG so tests are reproducible.
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    // xorshift32
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };
}

// Build an empty grid of the engine's real dimensions.
function emptyGrid(): Grid {
  return Array.from({ length: TOTAL_ROWS }, () => Array<Cell>(COLS).fill(null));
}

// ---------------------------------------------------------------------------
describe("7-bag randomizer", () => {
  it("every consecutive 7 pieces contains all 7 types exactly once", () => {
    const bag = new Bag(seeded(1));
    for (let round = 0; round < 100; round++) {
      const seven = new Set<PieceType>();
      for (let i = 0; i < 7; i++) seven.add(bag.next());
      expect(seven.size).toBe(7);
    }
  });

  it("peek(n) does not consume and matches subsequent next()", () => {
    const bag = new Bag(seeded(2));
    const peeked = bag.peek(5);
    expect(peeked).toHaveLength(5);
    for (const p of peeked) expect(bag.next()).toBe(p);
  });

  it("peek is stable across repeated calls", () => {
    const bag = new Bag(seeded(3));
    expect(bag.peek(7)).toEqual(bag.peek(7));
  });
});

// ---------------------------------------------------------------------------
describe("piece geometry", () => {
  it("every piece has exactly 4 minos in every rotation", () => {
    for (const p of PIECES) {
      for (const rot of [0, 1, 2, 3] as const) {
        expect(shape(p, rot)).toHaveLength(4);
      }
    }
  });

  it("O piece is always a 2x2 square in every rotation", () => {
    // NOTE: this engine rotates O within a 4x4 box, so its cell coordinates
    // shift between rotations — but the shape is always a 2x2 square block.
    const isSquare = (cells: [number, number][]) => {
      const xs = cells.map((c) => c[0]);
      const ys = cells.map((c) => c[1]);
      const w = Math.max(...xs) - Math.min(...xs);
      const h = Math.max(...ys) - Math.min(...ys);
      return cells.length === 4 && w === 1 && h === 1;
    };
    for (const r of [0, 1, 2, 3] as const) {
      expect(isSquare(shape("O", r))).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
describe("rotation", () => {
  it("rotating CW four times returns to the original orientation", () => {
    const g = new Tetris(seeded(4));
    const rot0 = g.active.rot;
    g.rotate(1);
    g.rotate(1);
    g.rotate(1);
    g.rotate(1);
    expect(g.active.rot).toBe(rot0);
  });

  it("rotate returns a boolean and sets lastWasRotation on success", () => {
    const g = new Tetris(seeded(5));
    const ok = g.rotate(1);
    expect(typeof ok).toBe("boolean");
    if (ok) expect(g.active.lastWasRotation).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe("movement & collision", () => {
  it("cannot move left through the wall forever", () => {
    const g = new Tetris(seeded(6));
    for (let i = 0; i < 20; i++) g.move(-1);
    // All minos must remain within the field.
    const minX = Math.min(
      ...shape(g.active.piece, g.active.rot).map(([x]) => g.active.x + x),
    );
    expect(minX).toBeGreaterThanOrEqual(0);
  });

  it("cannot move right through the wall forever", () => {
    const g = new Tetris(seeded(7));
    for (let i = 0; i < 20; i++) g.move(1);
    const maxX = Math.max(
      ...shape(g.active.piece, g.active.rot).map(([x]) => g.active.x + x),
    );
    expect(maxX).toBeLessThan(COLS);
  });

  it("ghostY lands the piece on the floor", () => {
    const g = new Tetris(seeded(8));
    const gy = g.ghostY();
    // Dropping to ghostY must not collide, one past it must.
    expect(g.collides(g.active.x, gy, g.active.rot, g.active.piece)).toBe(
      false,
    );
    expect(g.collides(g.active.x, gy + 1, g.active.rot, g.active.piece)).toBe(
      true,
    );
  });
});

// ---------------------------------------------------------------------------
describe("hold", () => {
  it("first hold stashes the current piece and spawns a new one", () => {
    const g = new Tetris(seeded(9));
    const cur = g.active.piece;
    expect(g.hold).toBeNull();
    expect(g.holdPiece()).toBe(true);
    expect(g.hold).toBe(cur);
    expect(g.canHold).toBe(false);
  });

  it("cannot hold twice before locking", () => {
    const g = new Tetris(seeded(10));
    expect(g.holdPiece()).toBe(true);
    expect(g.holdPiece()).toBe(false);
  });

  it("hold swaps back the previously held piece", () => {
    const g = new Tetris(seeded(11));
    const first = g.active.piece;
    g.holdPiece(); // hold = first, active = second
    g.hardDrop(); // lock second, re-enable hold, spawn third
    const cur = g.active.piece; // third
    g.holdPiece(); // swap: hold = third, active = first (stashed)
    expect(g.active.piece).toBe(first);
    expect(g.hold).toBe(cur);
  });
});

// ---------------------------------------------------------------------------
describe("line clear & scoring", () => {
  function fillRow(g: Tetris, row: number) {
    for (let c = 0; c < COLS; c++) g.grid[row][c] = "I";
  }

  it("a full bottom row is detected and cleared, incrementing lines/score", () => {
    const g = new Tetris(seeded(12));
    const bottom = TOTAL_ROWS - 1;
    fillRow(g, bottom);
    const { rows, result } = g.lockDetect();
    expect(rows).toContain(bottom);
    expect(result.linesCleared).toBeGreaterThanOrEqual(1);
    g.resolveClear();
    expect(g.lines).toBeGreaterThanOrEqual(1);
    expect(g.score).toBeGreaterThan(0);
  });

  it("a Tetris (4 lines) sets the TETRIS toast and tetris clearType", () => {
    const g = new Tetris(seeded(13));
    for (let r = TOTAL_ROWS - 4; r < TOTAL_ROWS; r++) fillRow(g, r);
    const { result } = g.lockDetect();
    expect(result.linesCleared).toBe(4);
    expect(result.clearType).toBe("tetris");
    expect(result.toast).toContain("TETRIS");
  });

  it("resolveClear on a board that empties reports All Clear + bonus", () => {
    // Drive resolveClear directly: full bottom row is the ONLY content, so
    // collapsing it leaves an empty board. (lockDetect is skipped here because
    // it would also lock the active piece into the top rows.)
    const g = new Tetris(seeded(14));
    g.grid = emptyGrid();
    const bottom = TOTAL_ROWS - 1;
    for (let c = 0; c < COLS; c++) g.grid[bottom][c] = "O";
    g.pendingRows = [bottom];
    const scoreBefore = g.score;
    const { allClear } = g.resolveClear();
    expect(allClear).toBe(true);
    expect(g.score).toBeGreaterThan(scoreBefore);
    // Board is genuinely empty after the clear.
    expect(g.grid.every((row) => row.every((c) => !c))).toBe(true);
  });

  it("combo counter rises across consecutive clears", () => {
    const g = new Tetris(seeded(15));
    g.grid = emptyGrid();
    g.pendingRows = [];
    // First clear.
    for (let c = 0; c < COLS; c++) g.grid[TOTAL_ROWS - 1][c] = "L";
    g.lockDetect();
    const first = g.combo;
    g.resolveClear();
    // Second clear right after (combo must increase).
    for (let c = 0; c < COLS; c++) g.grid[TOTAL_ROWS - 1][c] = "L";
    const r2 = g.lockDetect().result;
    g.resolveClear();
    expect(r2.combo).toBeGreaterThan(first);
  });
});

// ---------------------------------------------------------------------------
// Back-to-Back (B2B) — the field the UI badge reads is result.backToBack.
// Rule: B2B applies to *consecutive difficult* clears (Tetris or line-clearing
// T-spin). result.backToBack is true ONLY from the 2nd consecutive difficult
// clear, so the FIRST Tetris must never show the badge. A non-difficult clear
// (single/double/triple) breaks the chain. An empty drop (no clear) does NOT
// break the difficult chain but DOES reset combo/REN.
describe("back-to-back", () => {
  function clearRows(g: Tetris, n: number) {
    // Fill the bottom n rows on a clean board and run one clear cycle.
    g.grid = emptyGrid();
    g.pendingRows = [];
    for (let r = TOTAL_ROWS - n; r < TOTAL_ROWS; r++)
      for (let c = 0; c < COLS; c++) g.grid[r][c] = "I";
    const { result } = g.lockDetect();
    g.resolveClear();
    return result;
  }

  it("the first Tetris does NOT report back-to-back", () => {
    const g = new Tetris(seeded(20));
    const r1 = clearRows(g, 4);
    expect(r1.clearType).toBe("tetris");
    expect(r1.backToBack).toBe(false); // first difficult clear — no badge
  });

  it("a second consecutive Tetris reports back-to-back", () => {
    const g = new Tetris(seeded(21));
    clearRows(g, 4);
    const r2 = clearRows(g, 4);
    expect(r2.backToBack).toBe(true);
  });

  it("a non-difficult clear (single) breaks the B2B chain", () => {
    const g = new Tetris(seeded(22));
    clearRows(g, 4); // build chain
    clearRows(g, 4); // b2b active
    const single = clearRows(g, 1);
    expect(single.backToBack).toBe(false);
    // The Tetris right after the break restarts the chain (no badge yet).
    const restart = clearRows(g, 4);
    expect(restart.backToBack).toBe(false);
  });

  it("an empty drop resets combo but preserves the B2B chain", () => {
    const g = new Tetris(seeded(23));
    clearRows(g, 4);
    clearRows(g, 4); // b2b active, combo climbing
    // Empty drop: no full rows.
    g.grid = emptyGrid();
    g.pendingRows = [];
    const empty = g.lockDetect().result;
    g.resolveClear();
    expect(empty.combo).toBe(-1); // REN chain ended
    expect(g.b2b).toBe(true); // difficult chain preserved
    // Next Tetris continues B2B (chain was never broken by the empty drop).
    const next = clearRows(g, 4);
    expect(next.backToBack).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe("gravity", () => {
  it("gravity interval decreases as level increases", () => {
    const g = new Tetris(seeded(16));
    g.level = 1;
    const slow = g.gravityMs();
    g.level = 10;
    const fast = g.gravityMs();
    expect(fast).toBeLessThan(slow);
  });

  it("gravity never drops below the 20ms floor", () => {
    const g = new Tetris(seeded(17));
    g.level = 50;
    expect(g.gravityMs()).toBeGreaterThanOrEqual(20);
  });
});

// ---------------------------------------------------------------------------
describe("fuzz: random play never throws or corrupts the grid", () => {
  it("runs 2000 random actions across fresh games without crashing", () => {
    for (let seed = 0; seed < 5; seed++) {
      const g = new Tetris(seeded(1000 + seed));
      for (let i = 0; i < 2000 && !g.over; i++) {
        const roll = Math.floor(seeded(i * 31 + seed)() * 6);
        if (roll === 0) g.move(-1);
        else if (roll === 1) g.move(1);
        else if (roll === 2) g.rotate(1);
        else if (roll === 3) g.rotate(-1);
        else if (roll === 4) g.softDrop();
        else g.hardDrop();
        // Grid must always keep its exact dimensions.
        expect(g.grid).toHaveLength(TOTAL_ROWS);
        expect(g.grid[0]).toHaveLength(COLS);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// T-Spin detection — including the case where NO lines are cleared, which must
// STILL produce a message (clearType "tspin"/"tspin-mini" + a toast string).
// A T-spin is recognized only when the last move was a rotation and >=3 of the
// T's bounding-box corners are filled (3-corner rule).
describe("T-spin", () => {
  // Place a T at rot 0 so its cells occupy (x+1,y),(x,y+1),(x+1,y+1),(x+2,y+1).
  // Corners (relative to pivot at x+1,y+1): TL=(x,y) TR=(x+2,y) BL=(x,y+2) BR=(x+2,y+2).
  it("a T-spin with NO line cleared still yields clearType 'tspin' + a toast", () => {
    const g = new Tetris(seeded(20));
    g.grid = emptyGrid();
    // Fill TL, TR (front = 2) and BL (back = 1) -> 3 corners, front === 2 -> full T-spin.
    g.grid[18][3] = "I";
    g.grid[18][5] = "I";
    g.grid[20][3] = "I";
    g.active = {
      piece: "T",
      x: 3,
      y: 18,
      rot: 0,
      lastWasRotation: true,
      lastKick: 0,
    };

    const { rows, result } = g.lockDetect();
    expect(rows).toHaveLength(0); // no lines cleared
    expect(result.clearType).toBe("tspin"); // but it IS a T-spin
    expect(result.toast).toBe("T-SPIN"); // ...so a message must be shown
  });

  it("a T-spin MINI with no line cleared yields clearType 'tspin-mini'", () => {
    const g = new Tetris(seeded(21));
    g.grid = emptyGrid();
    // Fill TL (front = 1) and BL, BR (back = 2) -> 3 corners, front < 2 -> mini.
    g.grid[18][3] = "I";
    g.grid[20][3] = "I";
    g.grid[20][5] = "I";
    g.active = {
      piece: "T",
      x: 3,
      y: 18,
      rot: 0,
      lastWasRotation: true,
      lastKick: 0,
    };

    const { rows, result } = g.lockDetect();
    expect(rows).toHaveLength(0);
    expect(result.clearType).toBe("tspin-mini");
    expect(result.toast).toBe("T-SPIN MINI");
  });

  it("the same corners without a rotation are NOT a T-spin (no message)", () => {
    const g = new Tetris(seeded(22));
    g.grid = emptyGrid();
    g.grid[18][3] = "I";
    g.grid[18][5] = "I";
    g.grid[20][3] = "I";
    g.active = {
      piece: "T",
      x: 3,
      y: 18,
      rot: 0,
      lastWasRotation: false,
      lastKick: 0,
    };

    const { result } = g.lockDetect();
    expect(result.clearType).toBe("none");
    expect(result.toast).toBeNull();
  });

  it("the 5th kick (lastKick === 4) upgrades a mini into a full T-spin", () => {
    const g = new Tetris(seeded(23));
    g.grid = emptyGrid();
    // Mini corner layout (front = 1) but lastKick 4 -> upgraded to full T-spin.
    g.grid[18][3] = "I";
    g.grid[20][3] = "I";
    g.grid[20][5] = "I";
    g.active = {
      piece: "T",
      x: 3,
      y: 18,
      rot: 0,
      lastWasRotation: true,
      lastKick: 4,
    };

    const { result } = g.lockDetect();
    expect(result.clearType).toBe("tspin");
    expect(result.toast).toBe("T-SPIN");
  });
});
