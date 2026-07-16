// Settled-puyo grid with connection-aware textures + pop / drop animations.
import { Container, Sprite } from "pixi.js";
import {
  COLOR_KEYS,
  COLS,
  HIDDEN_ROWS,
  ROWS,
  SCALE_X,
  SCALE_Y,
  TIMING,
} from "../lib/config";
import { connectionMask } from "../lib/engine";
import type { Color, Grid } from "../lib/types";
import { bounceFrame, burstFrame, frame, puyoFrame } from "./assets";
import { cellX, cellY } from "./coords";

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
        if (color === 0 || r < HIDDEN_ROWS) {
          s.visible = color !== 0 && r >= HIDDEN_ROWS;
          if (!s.visible) continue;
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
      if (t < 0.5) {
        // Flash white-ish by toggling alpha rapidly.
        s.alpha = Math.floor(t * 12) % 2 === 0 ? 1 : 0.35;
        s.scale.set(SCALE_X, SCALE_Y);
      } else {
        const k = (t - 0.5) / 0.5; // 0..1
        s.texture = frame(burstFrame(color, k < 0.5 ? 0 : 1));
        s.alpha = 1 - k;
        const sc = 1 + k * 0.4;
        s.scale.set(SCALE_X * sc * (1 - k), SCALE_Y * sc * (1 - k));
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
