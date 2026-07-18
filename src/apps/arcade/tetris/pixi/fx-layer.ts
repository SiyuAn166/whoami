import { Container, Graphics, Sprite, Text, Texture } from "pixi.js";

import { CELL, COLS, HIDDEN_ROWS } from "../lib/config";
import { cellY } from "./coords";

// Line-clear sweep + floating text toasts (tetris / t-spin / b2b / combo).
//
// Sweep mirrors the original canvas renderer: a left-to-right wipe over the
// cleared rows that erases the settled blocks to the well background, led by a
// bright white gradient "head" drawn additively.
const CLEAR_MS = 220;
const SWEEP_HEAD_WIDTH_PX = 34; // width of the bright gradient head
const WELL_BG = 0x0d1020; // well background the wipe erases blocks back to
const BOARD_W = COLS * CELL;

// Bake the sweep head once: horizontal gradient, transparent -> bright white.
function bakeHead(): Texture {
  const c = document.createElement("canvas");
  c.width = Math.max(1, SWEEP_HEAD_WIDTH_PX);
  c.height = 1;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, c.width, 0);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(1, "rgba(255,255,255,0.85)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, 1);
  const t = Texture.from(c);
  t.source.scaleMode = "linear";
  return t;
}

export class FxLayer {
  readonly root = new Container();
  private toasts = new Container();
  private headTex = bakeHead();
  private live: Text[] = [];

  constructor() {
    this.root.addChild(this.toasts);
  }

  // Left-to-right bright sweep over the rows being cleared.
  flashRows(rows: number[], onDone: () => void) {
    if (rows.length === 0) {
      onDone();
      return;
    }

    const erase = new Graphics(); // covers wiped blocks with the well bg
    const heads: Sprite[] = [];
    for (let i = 0; i < rows.length; i++) {
      const h = new Sprite(this.headTex);
      h.blendMode = "add";
      h.height = CELL;
      h.width = SWEEP_HEAD_WIDTH_PX;
      heads.push(h);
    }
    this.root.addChild(erase, ...heads);

    const start = performance.now();
    const step = () => {
      const prog = Math.min(1, (performance.now() - start) / CLEAR_MS);
      const wipeX = prog * BOARD_W;

      erase.clear();
      rows.forEach((r, i) => {
        const y = cellY(r);
        // erase the blocks the wipe has passed
        erase.rect(0, y, wipeX, CELL).fill({ color: WELL_BG });
        // bright head leading the wipe
        const ex = Math.max(0, wipeX - SWEEP_HEAD_WIDTH_PX);
        const h = heads[i];
        h.x = ex;
        h.y = y;
        h.width = Math.max(1, wipeX - ex);
        h.alpha = prog < 1 ? 1 : 0;
      });

      if (prog >= 1) {
        erase.destroy();
        heads.forEach((h) => h.destroy());
        onDone();
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  toast(msg: string, color = 0xffe36e) {
    if (!msg) return;
    const t = new Text({
      text: msg,
      style: {
        fill: color,
        fontSize: 22,
        fontFamily: "monospace",
        fontWeight: "bold",
        stroke: { color: 0x000000, width: 4 },
        align: "center",
      },
    });
    t.anchor.set(0.5, 0);
    t.x = (COLS * CELL) / 2;
    // Stack concurrent toasts downward from the top of the well instead of
    // piling them all at one central point.
    const ROW_H = 30;
    const TOP_Y = (2 - HIDDEN_ROWS) * CELL;
    this.live.push(t);
    this.toasts.addChild(t);
    this.relayout(ROW_H, TOP_Y);

    const start = performance.now();
    const dur = 1100;
    const step = () => {
      const p = (performance.now() - start) / dur;
      if (p >= 1) {
        this.live = this.live.filter((x) => x !== t);
        t.destroy();
        this.relayout(ROW_H, TOP_Y);
        return;
      }
      t.alpha = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  private relayout(rowH: number, topY: number) {
    this.live.forEach((t, i) => {
      t.y = topY + i * rowH;
    });
  }
}
