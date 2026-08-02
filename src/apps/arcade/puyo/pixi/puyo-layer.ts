// Settled-puyo grid with connection-aware textures + pop / drop animations.
import { Container, Sprite } from "pixi.js";

import {
  COLOR_KEYS,
  COLS,
  ROWS,
  SCALE_X,
  SCALE_Y,
  TIMING,
} from "../lib/config";
import { connectionMask } from "../lib/engine";
import {
  bounceFrame,
  burstFrame,
  frame,
  puyoFrame,
  shockedFrame,
} from "./assets";
import { cellX, cellY } from "./coords";

import type { Color, Grid } from "../lib/types";

// puyosim-gg landing "squeeze": drop at constant speed, then on impact play a
// short texture sequence — h = squished wide, v = stretched tall, 0 = normal.
// This is the gooey gravity-squash-then-bounce feel (frame swaps, not scaling).
const SHORT_BOUNCE = [
  "h",
  "0",
  "v",
  "v",
  "0",
  "0",
  "h",
  "h",
  "0",
  "v",
  "v",
  "0",
  "0",
  "0",
];
const BOUNCE_LEN = SHORT_BOUNCE.length;

// Pop timeline, as a fraction of the pop phase. Three beats, in order:
//   0    -> 0.60 : blink POP_BLINKS times on the normal texture  (~690ms)
//   0.42 -> 0.66 : wide-eyed "shocked" hold, full alpha, no scale  (~216ms)
//   0.78 -> 1    : burst frames, fade out + scale up             (~253ms)
// Durations assume TIMING.popMs = 900. Each blink half-step is then ~63ms
// (~4 frames @60fps) and the shocked hold ~13 frames, so the three beats read
// as separate events. Dropping popMs much below ~700 collapses them again.
// Blink count is exact and independent of the window length: raise POP_BLINKS
// for a faster stutter, move the two boundaries to re-balance the three beats.
const POP_BLINKS = 4;
const POP_SHOCK_AT = 0.43;
/** Exported so the game loop can fire debris + sound on the same frame the
 *  burst beat begins, keeping visuals and audio in lockstep. */
export const POP_BURST_AT = 0.69;
// Alpha the sprite dips to on the "off" half of each blink.
const POP_BLINK_DIM = 0.3;
/** Split of the burst beat between the two burst frames: burst_0 plays for the
 *  first BURST_SPLIT of the beat, burst_1 for the rest. Deliberately under 0.5
 *  because burst_1 is the wider, more broken-up frame and needs the longer
 *  hold to register as its own beat. */
const BURST_SPLIT = 0.38;
/** Fraction of the burst beat held at full opacity before the fade starts.
 *  Without this the fade runs across the whole beat, so burst_1 - which only
 *  starts at BURST_SPLIT - never appears above ~50% alpha and the
 *  burst_0 -> burst_1 progression is invisible. Both frames need opaque screen
 *  time; the fade belongs at the END of the beat, not spread over all of it. */
const BURST_HOLD = 0.55;
/** Peak extra scale of the expanding burst sprite at the end of the beat.
 *  Modest, because the outward motion is carried by FxLayer's droplets - the
 *  sprite only needs to swell enough to feel like it is rupturing. */
const BURST_GROW = 0.45;

export class PuyoLayer extends Container {
  private sprites: Sprite[] = [];

  constructor() {
    super();
    for (let i = 0; i < ROWS * COLS; i++) {
      const s = new Sprite(frame("spacer_0.png"));
      s.anchor.set(0.5);
      s.scale.set(SCALE_X, SCALE_Y);
      s.visible = false;
      this.sprites.push(s);
      this.addChild(s);
    }
  }

  private at(r: number, c: number): Sprite {
    return this.sprites[r * COLS + c];
  }

  /** Hard-set every cell from the grid, with connection masks. */
  syncStatic(g: Grid): void {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const s = this.at(r, c);
        const color = g[r][c] as Color | 0;
        s.x = cellX(c);
        s.y = cellY(r);
        s.alpha = 1;
        s.scale.set(SCALE_X, SCALE_Y);
        // Draw every non-empty cell, including the hidden overflow rows
        // (r < HIDDEN_ROWS), so off-screen placed puyos are visible. They still
        // never pop; connectionMask returns 0 for them (drawn unconnected).
        if (color === 0) {
          s.visible = false;
          continue;
        }
        s.visible = true;
        const mask = connectionMask(g, r, c);
        s.texture = frame(puyoFrame(color as Color, mask));
      }
    }
  }

  /** Animate popping cells. t in [0,1]. Non-popping cells stay as `before`. */
  renderPops(
    popped: { r: number; c: number; color: Color }[],
    t: number,
  ): void {
    for (const { r, c, color } of popped) {
      const s = this.at(r, c);
      s.visible = true;
      if (t < POP_SHOCK_AT) {
        // Beat 1: blink exactly POP_BLINKS times on the puyo's normal texture.
        // Split the window into 2*POP_BLINKS half-steps (bright, dim, bright...)
        // so the count holds even if POP_SHOCK_AT is retuned.
        const half = Math.floor((t / POP_SHOCK_AT) * POP_BLINKS * 2);
        s.alpha = half % 2 === 0 ? 1 : POP_BLINK_DIM;
        s.scale.set(SCALE_X, SCALE_Y);
      } else if (t < POP_BURST_AT) {
        // Beat 2: realisation. The puyo goes wide-eyed just before it bursts.
        // Held fully opaque at rest scale so the expression reads clearly.
        s.texture = frame(shockedFrame(color));
        s.alpha = 1;
        s.scale.set(SCALE_X, SCALE_Y);
      } else {
        // Beat 3: burst.
        const k = (t - POP_BURST_AT) / (1 - POP_BURST_AT); // 0..1
        // Two distinct frames, both of which must actually be seen: burst_0 is
        // the initial rupture, burst_1 the wider break-up.
        s.texture = frame(burstFrame(color, k < BURST_SPLIT ? 0 : 1));
        // Hold full opacity through the frame swap, then fade over the tail, so
        // the swap reads as an animation rather than as a change inside an
        // already-vanishing sprite.
        s.alpha = k < BURST_HOLD ? 1 : 1 - (k - BURST_HOLD) / (1 - BURST_HOLD);
        // Splash outward from the cell centre: scale grows as it fades, like an
        // expanding bubble/shockwave (not shrinking back into the centre).
        const sc = 1 + k * BURST_GROW;
        s.scale.set(SCALE_X * sc, SCALE_Y * sc);
      }
    }
  }

  /**
   * Animate gravity drop from `afterPop` to `after`, driven by elapsed ms.
   * Each puyo falls at a constant speed (dropPerRowMs per row); the instant it
   * lands it plays the SHORT_BOUNCE squash/stretch frame sequence in place.
   *
   * Connection textures are computed against a grid that treats any puyo still
   * falling OR still mid-bounce as empty — so a settled neighbour never sprouts
   * a connection nub toward a puyo that hasn't finished its landing animation.
   * Each puyo merges into its connections only once its own bounce completes.
   * Caller syncs `after` at the end (restoring full connection masks).
   */
  renderDrops(
    afterPop: Grid,
    after: Grid,
    elapsedMs: number,
    forceBounce?: Set<string>,
  ): void {
    for (const s of this.sprites) s.visible = false;
    const rowMs = TIMING.dropPerRowMs;
    const frameMs = TIMING.bounceFrameMs;
    const bounceDur = BOUNCE_LEN * frameMs;

    // First pass: map each destination cell to its source row, and flag cells
    // that are still animating (falling, or bouncing) at this instant.
    const cells: { dr: number; sr: number; c: number }[] = [];
    const animating = new Set<string>();
    for (let c = 0; c < COLS; c++) {
      const srcs: number[] = [];
      const dsts: number[] = [];
      for (let r = 0; r < ROWS; r++) {
        if (afterPop[r][c] !== 0) srcs.push(r);
        if (after[r][c] !== 0) dsts.push(r);
      }
      for (let i = 0; i < dsts.length; i++) {
        const dr = dsts[i];
        const sr = srcs[i];
        cells.push({ dr, sr, c });
        const dist = dr - sr;
        const key = `${dr},${c}`;
        if (dist > 0) {
          const fallMs = dist * rowMs;
          if (elapsedMs < fallMs + bounceDur) animating.add(key);
        } else if (forceBounce?.has(key)) {
          if (elapsedMs < bounceDur) animating.add(key);
        }
      }
    }

    // Connection grid: still-animating cells treated as empty.
    const connGrid: Grid = after.map((row) => row.slice()) as Grid;
    for (const key of animating) {
      const [r, c] = key.split(",").map(Number);
      connGrid[r][c] = 0;
    }

    // Second pass: render each cell.
    for (const { dr, sr, c } of cells) {
      const color = after[dr][c] as Color;
      const key = COLOR_KEYS[color];
      const cellKey = `${dr},${c}`;
      const s = this.at(dr, c);
      s.visible = true;
      s.alpha = 1;
      s.x = cellX(c);
      s.scale.set(SCALE_X, SCALE_Y);

      const dist = dr - sr;
      if (dist <= 0) {
        s.y = cellY(dr);
        if (forceBounce?.has(cellKey)) {
          const tick = Math.floor(elapsedMs / frameMs);
          if (tick < BOUNCE_LEN) {
            s.texture = frame(bounceFrame(color, SHORT_BOUNCE[tick]));
          } else {
            s.texture = frame(
              puyoFrame(color, connectionMask(connGrid, dr, c)),
            );
          }
        } else {
          s.texture = frame(puyoFrame(color, connectionMask(connGrid, dr, c)));
        }
        continue;
      }

      const fallMs = dist * rowMs;
      if (elapsedMs < fallMs) {
        // Constant-speed (linear) fall; disconnected while airborne.
        const p = elapsedMs / fallMs;
        s.y = cellY(sr) + (cellY(dr) - cellY(sr)) * p;
        s.texture = frame(`${key}_0.png`);
      } else {
        const tick = Math.floor((elapsedMs - fallMs) / frameMs);
        if (tick < BOUNCE_LEN) {
          // Landed — play the squash/stretch impact frames in place.
          s.y = cellY(dr);
          s.texture = frame(bounceFrame(color, SHORT_BOUNCE[tick]));
        } else {
          // Bounce finished — merge into settled connections.
          s.y = cellY(dr);
          s.texture = frame(puyoFrame(color, connectionMask(connGrid, dr, c)));
        }
      }
    }
  }

  /** Distance (in rows) of the biggest fall between two grids, for timing. */
  maxDrop(afterPop: Grid, after: Grid): number {
    let max = 0;
    for (let c = 0; c < COLS; c++) {
      const srcs: number[] = [];
      const dsts: number[] = [];
      for (let r = 0; r < ROWS; r++) {
        if (afterPop[r][c] !== 0) srcs.push(r);
        if (after[r][c] !== 0) dsts.push(r);
      }
      for (let i = 0; i < dsts.length; i++)
        max = Math.max(max, dsts[i] - srcs[i]);
    }
    return max;
  }
}
