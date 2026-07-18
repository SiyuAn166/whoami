import { Container, Graphics, Text } from "pixi.js";

// In-canvas HUD: the SCORE / LEVEL / LINES readout panel plus a restart
// button, drawn in Pixi so they scale with the board (mirrors the puyo
// project). Sits in the left column beneath the HOLD box. The restart glyph
// eases on hover / press and spins once when clicked; drive it with update()
// from the stage ticker.

const COL_W = 124; // left column width (== holdW in TetrisStage)
const PAD = 12;
const ROW_H = 46;
const STATS = ["SCORE", "LEVEL", "LINES"] as const;

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
  private restartBg = new Graphics();
  private restartGlyph: Text;

  private onRestart?: () => void;

  // restart button geometry in hud-local coords (for touch hit-testing)
  readonly btnSize = 44;
  private btnCX = 0;
  private btnCY = 0;

  // restart animation state
  private rScale = 1;
  private rTarget = 1;
  private rSpin = 0;
  private press = false;

  constructor() {
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

    // ---- Restart button (rounded square + ↺ glyph) ----
    const BTN = this.btnSize;
    this.restart.x = COL_W / 2;
    this.restart.y = panelH + 16 + BTN / 2;
    this.btnCX = this.restart.x;
    this.btnCY = this.restart.y;
    this.restart.eventMode = "static";
    this.restart.cursor = "pointer";

    this.restartBg
      .roundRect(-BTN / 2, -BTN / 2, BTN, BTN, 12)
      .fill({ color: 0x11152a, alpha: 0.6 })
      .stroke({ color: 0x4a5488, width: 1 });
    this.restart.addChild(this.restartBg);

    this.restartGlyph = new Text({
      text: "\u21ba", // ↺
      style: { fill: 0xffffff, fontSize: 24, fontFamily: "monospace" },
    });
    this.restartGlyph.anchor.set(0.5);
    this.restart.addChild(this.restartGlyph);

    this.restart.on("pointerover", () => this.setState(true, this.press));
    this.restart.on("pointerout", () => this.setState(false, false));
    this.restart.on("pointerdown", () => this.setState(true, true));
    this.restart.on("pointerup", () => this.setState(true, false));
    this.restart.on("pointerupoutside", () => this.setState(false, false));
    this.restart.on("pointertap", () => {
      this.onRestart?.();
      this.rSpin = Math.PI * 2; // one full turn on click
    });

    this.root.addChild(this.restart);
  }

  private setState(hover: boolean, press: boolean) {
    this.press = press;
    this.rTarget = press ? 0.9 : hover ? 1.08 : 1;
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
    const s = this.btnSize;
    return { x: this.btnCX - s / 2, y: this.btnCY - s / 2, w: s, h: s };
  }

  // Called every frame from the stage ticker.
  update() {
    this.rScale = lerp(this.rScale, this.rTarget, 0.25);
    this.restart.scale.set(this.rScale);
    if (this.rSpin > 0.001) {
      this.rSpin = lerp(this.rSpin, 0, 0.18);
      this.restartGlyph.rotation = -this.rSpin;
    } else {
      this.rSpin = 0;
      this.restartGlyph.rotation = 0;
    }
  }
}
