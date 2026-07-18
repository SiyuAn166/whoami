// The falling pair plus its landing-shadow (ghost) preview.
//
// Visual smoothing lives here (logic/collision stay integer-cell in engine.ts):
//   - Horizontal: the sprite eases toward its target column each frame, so DAS
//     auto-shift reads as a continuous slide instead of cell-by-cell teleports.
//   - Vertical: the caller passes a sub-cell fall fraction (gravAccum / interval)
//     so the pair descends at constant speed rather than snapping a whole row.
import { Container, Sprite } from "pixi.js";

import { HIDDEN_ROWS, SCALE_X, SCALE_Y } from "../lib/config";
import { hardDropPiece, pieceCells } from "../lib/engine";
import { frame, puyoFrame } from "./assets";
import { cellX, cellY } from "./coords";

import type { Color, Grid, Piece } from "../lib/types";

// Horizontal glide time-constant (ms). Smaller = snappier/more arcade-like.
// ~26ms reads as an almost-instant slide (close to console Puyo's snap) while
// still hiding sub-pixel jitter on high-refresh displays. Easing is
// framerate-independent: k = 1 - exp(-dt / TAU).
const MOVE_TAU = 26;

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

  constructor() {
    super();
    for (const s of [this.ghostA, this.ghostB, this.axis, this.sat]) {
      s.anchor.set(0.5);
      s.scale.set(SCALE_X, SCALE_Y);
      s.visible = false;
      this.tgt.set(s, { x: 0, y: 0 });
      this.addChild(s);
    }
    this.ghostA.alpha = 0.35;
    this.ghostB.alpha = 0.35;
  }

  /** Practice mode disables the landing preview; play mode enables it. */
  setGhostEnabled(on: boolean): void {
    this.ghostEnabled = on;
    if (!on) {
      this.ghostA.visible = false;
      this.ghostB.visible = false;
    }
  }

  hide(): void {
    for (const s of [this.ghostA, this.ghostB, this.axis, this.sat])
      s.visible = false;
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
      // Ghost: where the pair would land on hard-drop, drawn as the real puyo
      // sprite at reduced opacity. Landing row is fixed, so no fall fraction.
      const landed = hardDropPiece(grid, p);
      const [ga, gb] = pieceCells(landed);
      this.setTarget(this.ghostA, ga.r, ga.c, p.axis, ga.r >= HIDDEN_ROWS);
      this.setTarget(this.ghostB, gb.r, gb.c, p.sat, gb.r >= HIDDEN_ROWS);
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

  /** Set a sprite's texture, target pixel position and visibility. */
  private setTarget(
    s: Sprite,
    r: number,
    c: number,
    color: Color,
    visible: boolean,
  ): void {
    s.texture = frame(puyoFrame(color, 0));
    const t = this.tgt.get(s)!;
    t.x = cellX(c);
    t.y = cellY(r);
    s.visible = visible;
  }

  /**
   * Ease X toward target (glide). Y for the ghost is exact (its landing row is
   * fixed). Y for the live pair is smoothed via the caller\'s fall fraction, but
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
