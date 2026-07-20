import { Container, Graphics, Sprite, Text } from "pixi.js";

import type { TileTextures } from "./tiles";

// In-canvas HUD: the SCORE / LEVEL / LINES readout panel plus a restart
// button, drawn in Pixi so they scale with the board (mirrors the puyo
// project). Sits in the left column beneath the HOLD box. The restart button
// is a small S-tetromino (built from the same baked tiles as the board); on
// click it does a single clockwise quarter-turn and eases back to rest. Drive
// the easing with update() from the stage ticker.

const COL_W = 124; // left column width (== holdW in TetrisStage)
const PAD = 12;
const ROW_H = 46;
const STATS = ["SCORE", "LEVEL", "LINES"] as const;

// S-mino button geometry
const MINI = 14; // px per mini-cell
const S_CELLS: [number, number][] = [
  // . ■ ■
  // ■ ■ .
  [0, 1],
  [0, 2],
  [1, 0],
  [1, 1],
];
const S_COLS = 3;
const S_ROWS = 2;

const LABEL_STYLE = {
  fill: 0x9fb0e0,
  fontSize: 10,
  fontFamily: "monospace",
  fontWeight: "bold" as const,
  letterSpacing: 1.5,
};
const VALUE_STYLE = {
  fill: 0xe6ecff,
  fontSize: 20,
  fontFamily: "monospace",
  fontWeight: "bold" as const,
};

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export class HudLayer {
  readonly root = new Container();
  private values: Record<(typeof STATS)[number], Text> = {} as never;

  private restart = new Container();
  private onRestart?: () => void;

  // restart button hit-box in hud-local coords (top-left origin)
  private btnCX = 0;
  private btnCY = 0;
  private readonly btnW = S_COLS * MINI;
  private readonly btnH = S_ROWS * MINI;

  // restart animation state: rotate CW to a quarter-turn peak, then ease to 0
  private rRot = 0; // current rotation (radians, +CW)
  private rTarget = 0; // rotation we're easing toward
  private spinning = false;

  constructor(tiles: TileTextures) {
    // ---- Stats panel ----
    const panelH = PAD + STATS.length * ROW_H;
    const bg = new Graphics();
    bg.roundRect(0, 0, COL_W, panelH, 10)
      .fill({ color: 0x11152a, alpha: 0.6 })
      .stroke({ color: 0x4a5488, width: 1 });
    this.root.addChild(bg);

    STATS.forEach((name, i) => {
      const rowY = PAD + i * ROW_H;
      if (i > 0) {
        const line = new Graphics();
        line
          .moveTo(PAD, rowY)
          .lineTo(COL_W - PAD, rowY)
          .stroke({ color: 0x4a5488, width: 1, alpha: 0.35 });
        this.root.addChild(line);
      }
      const label = new Text({ text: name, style: LABEL_STYLE });
      label.x = PAD;
      label.y = rowY + 8;
      const value = new Text({ text: "0", style: VALUE_STYLE });
      value.x = PAD;
      value.y = rowY + 20;
      this.root.addChild(label, value);
      this.values[name] = value;
    });

    // ---- Restart button (S-mino built from the board's baked tiles) ----
    // Cells are placed relative to the piece centre so the container rotates
    // about its own middle.
    const cx = (S_COLS * MINI) / 2;
    const cy = (S_ROWS * MINI) / 2;
    for (const [r, c] of S_CELLS) {
      const sp = new Sprite(tiles.solid.S);
      sp.width = MINI;
      sp.height = MINI;
      sp.x = c * MINI - cx;
      sp.y = r * MINI - cy;
      this.restart.addChild(sp);
    }

    // centre the button below the stats panel
    this.restart.x = COL_W / 2;
    this.restart.y = panelH + 20 + cy;
    this.btnCX = this.restart.x;
    this.btnCY = this.restart.y;

    this.restart.eventMode = "static";
    this.restart.cursor = "pointer";
    this.restart.on("pointertap", () => {
      this.onRestart?.();
      this.kickSpin();
    });

    this.root.addChild(this.restart);
  }

  // begin one clockwise quarter-turn from rest
  private kickSpin() {
    this.rRot = 0;
    this.rTarget = Math.PI / 2; // +90° = clockwise in Pixi's y-down space
    this.spinning = true;
  }

  setStats(score: number, level: number, lines: number) {
    this.values.SCORE.text = score.toLocaleString();
    this.values.LEVEL.text = String(level);
    this.values.LINES.text = String(lines);
  }

  bindRestart(cb: () => void) {
    this.onRestart = cb;
  }

  // Restart button bounds in hud-local coords {x,y,w,h} (top-left origin).
  restartBounds() {
    return {
      x: this.btnCX - this.btnW / 2,
      y: this.btnCY - this.btnH / 2,
      w: this.btnW,
      h: this.btnH,
    };
  }

  // Called every frame from the stage ticker.
  update() {
    if (!this.spinning) return;
    this.rRot = lerp(this.rRot, this.rTarget, 0.25);
    // reached the quarter-turn peak -> ease back toward rest
    if (this.rTarget > 0 && this.rTarget - this.rRot < 0.05) this.rTarget = 0;
    // settled back at rest -> stop animating
    if (this.rTarget === 0 && this.rRot < 0.01) {
      this.rRot = 0;
      this.spinning = false;
    }
    this.restart.rotation = this.rRot;
  }
}
