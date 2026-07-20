// The falling pair plus its landing-shadow (ghost) preview.
//
// Visual smoothing lives here (logic/collision stay integer-cell in engine.ts):
//   - Horizontal: the sprite eases toward its target column each frame, so DAS
//     auto-shift reads as a continuous slide instead of cell-by-cell teleports.
//   - Vertical: the caller passes a sub-cell fall fraction (gravAccum / interval)
//     so the pair descends at constant speed rather than snapping a whole row.
import { Container, Sprite } from "pixi.js";

import { COLOR_KEYS, HIDDEN_ROWS, SCALE_X, SCALE_Y } from "../lib/config";
import { hardDropPiece, pieceCells, resolveChains } from "../lib/engine";
import { frame, puyoFrame } from "./assets";
import { cellX, cellY } from "./coords";

import type { Color, Grid, Piece } from "../lib/types";

// Horizontal glide time-constant (ms). Smaller = snappier/more arcade-like.
// ~26ms reads as an almost-instant slide (close to console Puyo's snap) while
// still hiding sub-pixel jitter on high-refresh displays. Easing is
// framerate-independent: k = 1 - exp(-dt / TAU).
const MOVE_TAU = 26;

// Clear-preview blink: board puyos that this drop would pop pulse in
// BRIGHTNESS only (no scale / no motion / no particle). Period in ms.
const BLINK_MS = 260;

type Cell = { r: number; c: number };

export class ActiveLayer extends Container {
  private axis = new Sprite();
  private sat = new Sprite();
  private ghostA = new Sprite();
  private ghostB = new Sprite();
  private ghostEnabled = true;

  // Per-sprite target pixel positions; current .x eases toward target.x.
  private tgt = new Map<Sprite, { x: number; y: number }>();
  // On (re)spawn we snap instead of gliding across the board from the old spot.
  private needsSnap = true;
  // Remember the last fall fraction so non-tick callers (rotate / touch) that
  // omit it don't momentarily snap the pair back to the integer cell.
  private lastFall = 0;

  // Clear-preview overlay: white-tinted, additive sprites laid over the board
  // puyos that this drop would clear. Only their alpha oscillates.
  private markLayer = new Container();
  private markPool: Sprite[] = [];
  private clearKey = ""; // memo key so resolveChains only reruns on change
  private clearCells: Cell[] = [];

  constructor() {
    super();
    this.addChild(this.markLayer); // board-brightening sits under the pair/ghost
    for (const s of [this.ghostA, this.ghostB, this.axis, this.sat]) {
      s.anchor.set(0.5);
      s.scale.set(SCALE_X, SCALE_Y);
      s.visible = false;
      this.tgt.set(s, { x: 0, y: 0 });
      this.addChild(s);
    }
  }

  /** Practice mode disables the landing preview; play mode enables it. */
  setGhostEnabled(on: boolean): void {
    this.ghostEnabled = on;
    if (!on) {
      this.ghostA.visible = false;
      this.ghostB.visible = false;
      this.clearMarks();
    }
  }

  hide(): void {
    for (const s of [this.ghostA, this.ghostB, this.axis, this.sat])
      s.visible = false;
    this.clearMarks();
    this.needsSnap = true; // next show snaps into place instead of gliding
    this.lastFall = 0;
  }

  /**
   * Update the live pair and its ghost against the current grid.
   * @param dtMs     frame delta in ms (drives the horizontal glide)
   * @param fallFrac 0..1 sub-cell fall progress for continuous gravity; when
   *                 omitted (rotate/touch) the previous value is reused.
   */
  update(grid: Grid, p: Piece, dtMs = 16.67, fallFrac?: number): void {
    const ff = fallFrac ?? this.lastFall;
    this.lastFall = ff;

    if (this.ghostEnabled) {
      // Rigid hard-drop landing (what actually locks). The two puyos may then
      // settle to DIFFERENT rows if the ground under them is uneven (split
      // drop), so we resolve each column independently for the marker display.
      const landed = hardDropPiece(grid, p);
      const [la, lb] = pieceCells(landed);
      const [ga, gb] = this.settle(grid, la, lb);
      this.setTarget(
        this.ghostA,
        ga.r,
        ga.c,
        p.axis,
        ga.r >= HIDDEN_ROWS,
        true,
      );
      this.setTarget(this.ghostB, gb.r, gb.c, p.sat, gb.r >= HIDDEN_ROWS, true);
      // Clear preview uses the RIGID landing (resolveChains applies gravity
      // itself, exactly like beginResolve does at lock time).
      this.updateClearPreview(grid, la, lb, p);
    } else {
      this.ghostA.visible = false;
      this.ghostB.visible = false;
    }

    const [a, b] = pieceCells(p);
    this.setTarget(this.axis, a.r + ff, a.c, p.axis, true);
    this.setTarget(this.sat, b.r + ff, b.c, p.sat, true);

    // A gravity/tick call supplies fallFrac; a rotate/horizontal-move call does
    // not. Only the gravity path clamps Y monotonically downward (below), so a
    // rotation can still swing the satellite above the axis.
    const gravityPath = fallFrac !== undefined;

    if (this.needsSnap) {
      this.snap();
      this.needsSnap = false;
    } else {
      this.ease(dtMs, gravityPath);
    }
  }

  /**
   * Where each puyo of the pair actually comes to rest after the rigid drop:
   * each cell falls independently down its own column (bottom-most first, so a
   * vertical pair keeps its stacking order). Fixes the ghost showing a puyo
   * "stuck" at the blocked row instead of its true landing after a split drop.
   */
  private settle(grid: Grid, a: Cell, b: Cell): [Cell, Cell] {
    const rows = grid.length;
    const occ = grid.map((row) => row.map((v) => v !== 0));
    const order = [
      { r: a.r, c: a.c, i: 0 },
      { r: b.r, c: b.c, i: 1 },
    ].sort((x, y) => y.r - x.r); // settle the lower puyo first
    const out: Cell[] = [
      { r: a.r, c: a.c },
      { r: b.r, c: b.c },
    ];
    for (const it of order) {
      let r = it.r;
      while (r + 1 < rows && !occ[r + 1][it.c]) r++;
      if (r >= 0 && r < rows) occ[r][it.c] = true;
      out[it.i] = { r, c: it.c };
    }
    return [out[0], out[1]];
  }

  /** Recompute (memoized) which board puyos this drop would clear, then draw. */
  private updateClearPreview(grid: Grid, la: Cell, lb: Cell, p: Piece): void {
    const key = `${la.r},${la.c},${lb.r},${lb.c},${p.axis},${p.sat}`;
    if (key !== this.clearKey) {
      this.clearKey = key;
      this.clearCells = this.computeClear(grid, la, lb, p);
    }
    this.drawMarks(grid);
  }

  /** Board puyos (already placed) that would pop on this drop's first chain. */
  private computeClear(grid: Grid, la: Cell, lb: Cell, p: Piece): Cell[] {
    const rows = grid.length;
    const tmp = grid.map((row) => row.slice());
    if (la.r >= 0 && la.r < rows) tmp[la.r][la.c] = p.axis;
    if (lb.r >= 0 && lb.r < rows) tmp[lb.r][lb.c] = p.sat;

    let popped: unknown[] | undefined;
    try {
      const res = resolveChains(tmp) as { steps?: { popped?: unknown[] }[] };
      popped = res?.steps?.[0]?.popped;
    } catch {
      return [];
    }
    if (!popped) return [];

    const out: Cell[] = [];
    for (const raw of popped) {
      const rc = this.readCell(raw);
      // Blink only puyos ALREADY on the board (exclude the incoming pair, whose
      // cells are still empty in the real grid). The ghost blips never change.
      if (rc && grid[rc.r]?.[rc.c]) out.push(rc);
    }
    return out;
  }

  /** Accept popped cells as {r,c} or [r,c] without assuming the engine shape. */
  private readCell(cell: unknown): Cell | null {
    if (Array.isArray(cell) && cell.length >= 2)
      return { r: Number(cell[0]), c: Number(cell[1]) };
    const o = cell as { r?: unknown; c?: unknown };
    if (typeof o?.r === "number" && typeof o?.c === "number")
      return { r: o.r, c: o.c };
    return null;
  }

  /** Pulse the clear-preview overlay: alpha only, no scale/motion. */
  private drawMarks(grid: Grid): void {
    const cells = this.clearCells;
    while (this.markPool.length < cells.length) {
      const s = new Sprite();
      s.anchor.set(0.5);
      s.scale.set(SCALE_X, SCALE_Y);
      s.tint = 0xffffff;
      s.blendMode = "add"; // additive white = brightness pulse
      s.visible = false;
      this.markPool.push(s);
      this.markLayer.addChild(s);
    }
    // 0.5+0.5*sin -> 0..1; mapped to a visible brightness swing.
    const pulse =
      0.12 +
      0.4 *
        (0.5 + 0.5 * Math.sin((performance.now() / BLINK_MS) * Math.PI * 2));
    for (let i = 0; i < this.markPool.length; i++) {
      const s = this.markPool[i];
      const cell = cells[i];
      if (!cell || cell.r < HIDDEN_ROWS) {
        s.visible = false;
        continue;
      }
      s.texture = frame(puyoFrame(grid[cell.r][cell.c] as Color, 0));
      s.x = cellX(cell.c);
      s.y = cellY(cell.r);
      s.alpha = pulse;
      s.visible = true;
    }
  }

  /** Drop the clear preview (on hide / practice / no-clear). */
  private clearMarks(): void {
    this.clearKey = "";
    this.clearCells = [];
    for (const s of this.markPool) s.visible = false;
  }

  /** Set a sprite's texture, target pixel position and visibility. */
  private setTarget(
    s: Sprite,
    r: number,
    c: number,
    color: Color,
    visible: boolean,
    isGhost = false,
  ): void {
    // Live pair uses the full connected-puyo sprite; the ghost uses the small
    // "_blip" landing marker (a tiny solid ball, its own atlas frame).
    s.texture = isGhost
      ? frame(`${COLOR_KEYS[color]}_blip.png`)
      : frame(puyoFrame(color, 0));
    const t = this.tgt.get(s)!;
    t.x = cellX(c);
    t.y = cellY(r);
    s.visible = visible;
  }

  /**
   * Ease X toward target (glide). Y for the ghost is exact (its landing row is
   * fixed). Y for the live pair is smoothed via the caller's fall fraction, but
   * during gravity it is clamped to never move UP: when the fall fraction snaps
   * back to ~0 (soft-drop toggle, gravity interval switch, or a whole-row step)
   * while the integer row is unchanged, the sprite holds its position instead
   * of jerking up a cell -> fixes the "retract upward" glitch. Rotation calls
   * (gravityPath === false) set Y directly so the satellite can rise above the
   * axis.
   */
  private ease(dtMs: number, gravityPath: boolean): void {
    const k = 1 - Math.exp(-dtMs / MOVE_TAU);
    for (const s of [this.ghostA, this.ghostB, this.axis, this.sat]) {
      const t = this.tgt.get(s)!;
      s.x += (t.x - s.x) * k;
    }
    this.ghostA.y = this.tgt.get(this.ghostA)!.y;
    this.ghostB.y = this.tgt.get(this.ghostB)!.y;
    for (const s of [this.axis, this.sat]) {
      const ty = this.tgt.get(s)!.y;
      s.y = gravityPath ? Math.max(s.y, ty) : ty;
    }
  }

  /** Jump every sprite straight to its target (on spawn / first paint). */
  private snap(): void {
    for (const s of [this.ghostA, this.ghostB, this.axis, this.sat]) {
      const t = this.tgt.get(s)!;
      s.x = t.x;
      s.y = t.y;
    }
  }
}
