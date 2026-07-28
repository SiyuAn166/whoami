// In-canvas control panel: the play/practice toggle, a colour-count slider, a
// restart button, and (practice-only) undo/redo buttons — all drawn in Pixi so
// they scale with the board. Sits just below the next window.
// The toggle thumb slides between states; the restart puyo eases on hover /
// press and plays the game's puyo-pop (bubble-clear) burst when clicked:
// a white flash, a burst-frame scale-up/fade, plus scatter debris particles —
// mirroring PuyoLayer.renderPops + FxLayer.spawnBurst. Driven by update().
import { Container, Graphics, Sprite, Text } from "pixi.js";

import { burstFrame, frame, puyoFrame } from "./assets";
import { updateParticles } from "./particles";

import type { Color, Mode } from "../lib/types";
import type { Particle } from "./particles";

const PANEL_W = 153;
// Shared content width: the colour-count slider and undo/redo row line up to
// this width. The play/practice toggle is deliberately smaller (TOGGLE_W) —
// see below.
const CONTENT_W = 116;
const TOGGLE_W = 90; // smaller than CONTENT_W: toggle is a compact pill, not a full-width control
const TOGGLE_H = 46;
const THUMB_SCALE = 0.63;
const R_SIZE = 44; // restart puyo display size (native puyo is 64px)
const R_COLOR = 3; // blue puyo used as the restart button face
const POP_DUR = 26; // pop duration in frames (~0.45s at 60fps)
const R_BASE = R_SIZE / 64; // sprite scale for the 64px atlas frame

// Colour-count slider: styled like the play/practice toggle — a capsule that
// recolours per selection, with a puyo thumb sliding to one of 3 fixed stops
// (3/4/5 colours), no in-between values.
const SLIDER_COUNTS = [3, 4, 5] as const;
type SliderCount = (typeof SLIDER_COUNTS)[number];
const SLIDER_COLOR: Record<SliderCount, Color> = { 3: 1, 4: 4, 5: 5 }; // red/yellow/purple
const SLIDER_CAPSULE_COLOR: Record<
  SliderCount,
  { fill: number; stroke: number }
> = {
  3: { fill: 0x2a1414, stroke: 0xe0605c }, // red
  4: { fill: 0x2a2410, stroke: 0xe0c85c }, // yellow
  5: { fill: 0x1a1533, stroke: 0x9a7ee0 }, // purple
};
const SLIDER_STOP_X: Record<SliderCount, number> = {
  3: TOGGLE_H / 2,
  4: CONTENT_W / 2,
  5: CONTENT_W - TOGGLE_H / 2,
};
const SLIDER_HIT_R = 20; // generous tap target around each stop

// Undo/redo row (practice only).
const HIST_BTN_W = 54;
const HIST_BTN_H = 40;
const HIST_GAP = CONTENT_W - HIST_BTN_W * 2;

const LABEL_STYLE = {
  fontFamily: "'Trebuchet MS', system-ui, sans-serif",
  fontSize: 16,
  fontWeight: "600" as const,
  fill: 0xdbe7ff,
} as const;

const SMALL_LABEL_STYLE = {
  fontFamily: "'Trebuchet MS', system-ui, sans-serif",
  fontSize: 13,
  fontWeight: "600" as const,
  fill: 0x9aa7d0,
  letterSpacing: 1,
} as const;

const HIST_ICON_STYLE = {
  fontFamily: "'Trebuchet MS', system-ui, sans-serif",
  fontSize: 22,
  fontWeight: "700" as const,
  fill: 0xdbe7ff,
} as const;

const BEST_LABEL_STYLE = {
  fontFamily: "'Trebuchet MS', system-ui, sans-serif",
  fontSize: 23,
  fontWeight: "700" as const,
  fill: 0x9aa7d0,
  letterSpacing: 2,
} as const;

const BEST_VALUE_STYLE = {
  fontFamily: "'Trebuchet MS', system-ui, sans-serif",
  fontSize: 30,
  fontWeight: "900" as const,
  fill: 0xffffff,
  stroke: { color: 0x0a1830, width: 4 },
  letterSpacing: 1,
} as const;

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export class ControlPanel extends Container {
  private onToggle?: () => void;
  private onRestart?: () => void;
  private onColorCount?: (n: 3 | 4 | 5) => void;
  private onUndo?: () => void;
  private onRedo?: () => void;

  private toggle = new Container();
  private capsule = new Graphics();
  private thumb = new Sprite();
  private restart = new Sprite();
  private fx = new Container(); // scatter debris for the restart pop
  private particles: Particle[] = [];
  private modeLabel: Text;
  private bestValue: Text;
  private mode: Mode = "practice";

  private colorSlider = new Container();
  private colorTrack = new Graphics();
  private colorThumb = new Sprite();
  private colorCountLabel: Text;
  private colorThumbX = 0;
  private colorThumbTargetX = 0;

  private undoRow = new Container();
  private undoBtn = new Container();
  private redoBtn = new Container();
  private undoBg = new Graphics();
  private redoBg = new Graphics();
  private undoEnabled = false;
  private redoEnabled = false;

  // animation state
  private thumbX = 0;
  private thumbTargetX = 0;
  private restartScale = 1;
  private restartTarget = 1;
  private restartPress = false;
  private restartPop = 0; // frames remaining in the pop; 0 = idle

  constructor() {
    super();

    // ---- Toggle: capsule + sliding puyo thumb (slide only, no scaling) -----
    this.toggle.x = (PANEL_W - TOGGLE_W) / 2;
    this.toggle.eventMode = "static";
    this.toggle.cursor = "pointer";
    this.toggle.on("pointertap", () => this.onToggle?.());
    this.toggle.addChild(this.capsule);
    this.thumb.anchor.set(0.5);
    this.thumb.scale.set(THUMB_SCALE);
    this.thumb.y = TOGGLE_H / 2;
    this.toggle.addChild(this.thumb);
    this.addChild(this.toggle);

    this.modeLabel = new Text({ text: "Practice", style: LABEL_STYLE });
    this.modeLabel.anchor.set(0.5, 0);
    this.modeLabel.x = PANEL_W / 2;
    this.modeLabel.y = TOGGLE_H + 8;
    this.addChild(this.modeLabel);

    // ---- Restart: the blue in-game puyo sprite as the button face ----------
    this.restart.texture = frame(puyoFrame(R_COLOR, 0)); // blue_0
    this.restart.anchor.set(0.5);
    this.restart.scale.set(R_BASE);
    this.restart.x = PANEL_W / 2;
    this.restart.y = TOGGLE_H + 8 + 24 + R_SIZE / 2;
    this.restart.eventMode = "static";
    this.restart.cursor = "pointer";
    this.restart.on("pointerover", () =>
      this.setRestart(true, this.restartPress),
    );
    this.restart.on("pointerout", () => this.setRestart(false, false));
    this.restart.on("pointerdown", () => this.setRestart(true, true));
    this.restart.on("pointerup", () => this.setRestart(true, false));
    this.restart.on("pointerupoutside", () => this.setRestart(false, false));
    this.restart.on("pointertap", () => {
      this.onRestart?.();
      this.popRestart(); // bubble-clear burst on click
    });
    this.addChild(this.restart);
    this.addChild(this.fx); // debris drawn above the button face

    const rLabel = new Text({ text: "Restart", style: LABEL_STYLE });
    rLabel.anchor.set(0.5, 0);
    rLabel.x = PANEL_W / 2;
    rLabel.y = this.restart.y + R_SIZE / 2 + 8;
    this.addChild(rLabel);

    // ---- Colour-count slider: 3 fixed stops (3/4/5), puyo-thumb handle -----
    const colorCountLabelTop = new Text({
      text: "COLOURS",
      style: SMALL_LABEL_STYLE,
    });
    colorCountLabelTop.anchor.set(0.5, 0);
    colorCountLabelTop.x = PANEL_W / 2;
    colorCountLabelTop.y = rLabel.y + 30;
    this.addChild(colorCountLabelTop);

    this.colorSlider.x = (PANEL_W - CONTENT_W) / 2;
    this.colorSlider.y = colorCountLabelTop.y + 22;
    this.colorSlider.addChild(this.colorTrack); // capsule bg, drawn per-selection below
    this.colorThumb.anchor.set(0.5);
    this.colorThumb.scale.set(THUMB_SCALE);
    this.colorThumb.y = TOGGLE_H / 2;
    this.colorSlider.addChild(this.colorThumb);
    this.addChild(this.colorSlider);

    for (const n of SLIDER_COUNTS) {
      const hit = new Container();
      hit.x = SLIDER_STOP_X[n];
      hit.y = TOGGLE_H / 2;
      hit.hitArea = {
        contains: (x: number, y: number) =>
          x * x + y * y <= SLIDER_HIT_R * SLIDER_HIT_R,
      };
      hit.eventMode = "static";
      hit.cursor = "pointer";
      hit.on("pointertap", () => this.selectColorCount(n));
      this.colorSlider.addChild(hit);
    }

    this.colorCountLabel = new Text({
      text: "4 colours",
      style: SMALL_LABEL_STYLE,
    });
    this.colorCountLabel.anchor.set(0.5, 0);
    this.colorCountLabel.x = PANEL_W / 2;
    this.colorCountLabel.y = this.colorSlider.y + TOGGLE_H + 8;
    this.addChild(this.colorCountLabel);
    this.selectColorCount(4, /* silent */ true);
    this.colorThumbX = this.colorThumbTargetX; // no slide on first paint
    this.colorThumb.x = this.colorThumbX;

    // ---- Undo / redo (practice only) ---------------------------------------
    this.undoRow.x = (PANEL_W - CONTENT_W) / 2;
    this.undoRow.y = this.colorCountLabel.y + 24;
    this.buildHistButton(this.undoBtn, this.undoBg, "↺", 0);
    this.buildHistButton(this.redoBtn, this.redoBg, "↻", HIST_BTN_W + HIST_GAP);
    this.undoBtn.on("pointertap", () => {
      if (this.undoEnabled) this.onUndo?.();
    });
    this.redoBtn.on("pointertap", () => {
      if (this.redoEnabled) this.onRedo?.();
    });
    this.undoRow.addChild(this.undoBtn, this.redoBtn);
    this.addChild(this.undoRow);
    this.applyHistEnabled();

    // ---- Best Chain readout, centred below the two buttons -----------------
    const bestLabel = new Text({ text: "BEST CHAIN", style: BEST_LABEL_STYLE });
    bestLabel.anchor.set(0.5, 0);
    bestLabel.x = PANEL_W / 2;
    bestLabel.y = this.undoRow.y + HIST_BTN_H + 14;
    this.addChild(bestLabel);

    this.bestValue = new Text({ text: "–", style: BEST_VALUE_STYLE });
    this.bestValue.anchor.set(0.5, 0);
    this.bestValue.x = PANEL_W / 2;
    this.bestValue.y = bestLabel.y + 38;
    this.addChild(this.bestValue);

    this.applyToggle();
    this.thumbX = this.thumbTargetX; // no slide on first paint
    this.thumb.x = this.thumbX;
    this.applyModeVisibility();
  }

  private buildHistButton(
    btn: Container,
    bg: Graphics,
    glyph: string,
    x: number,
  ): void {
    btn.x = x;
    bg.roundRect(0, 0, HIST_BTN_W, HIST_BTN_H, 10).fill({
      color: 0x181a34,
    });
    bg.stroke({ color: 0x4b4d78, width: 1.5, alpha: 0.7 });
    btn.addChild(bg);
    const icon = new Text({ text: glyph, style: HIST_ICON_STYLE });
    icon.anchor.set(0.5);
    icon.x = HIST_BTN_W / 2;
    icon.y = HIST_BTN_H / 2;
    btn.addChild(icon);
    btn.eventMode = "static";
    btn.cursor = "pointer";
  }

  private setRestart(hover: boolean, press: boolean): void {
    this.restartPress = press;
    this.restartTarget = press ? 0.9 : hover ? 1.08 : 1;
  }

  /** Kick off a pop: start the burst timer + throw scatter debris (FxLayer). */
  private popRestart(): void {
    this.restartPop = POP_DUR;
    const cx = this.restart.x;
    const cy = this.restart.y;
    const n = 6;
    for (let i = 0; i < n; i++) {
      const sp = new Sprite(frame(puyoFrame(R_COLOR, 0)));
      sp.anchor.set(0.5);
      sp.scale.set(R_BASE * 0.42);
      sp.x = cx;
      sp.y = cy;
      this.fx.addChild(sp);
      const ang = (Math.PI * 2 * i) / n + Math.random() * 0.6;
      const spd = 1.8 + Math.random() * 2.0;
      this.particles.push({
        sprite: sp,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 1.4,
        life: 0,
        max: 22 + Math.random() * 10,
      });
    }
  }

  /** Set capsule colour + thumb texture + target slide position for the mode. */
  private applyToggle(): void {
    const play = this.mode === "play";
    this.capsule
      .clear()
      .roundRect(0, 0, TOGGLE_W, TOGGLE_H, TOGGLE_H / 2)
      .fill({ color: play ? 0x14240c : 0x1a1533 })
      .stroke({ color: play ? 0x6ede4f : 0x786ebe, width: 2, alpha: 0.6 });
    this.thumb.texture = frame(puyoFrame(play ? 2 : 5, 0)); // green=play, purple=practice
    const pad = TOGGLE_H / 2;
    this.thumbTargetX = play ? TOGGLE_W - pad : pad;
    this.modeLabel.text = play ? "Play" : "Practice";
  }

  /** Undo/redo only makes sense in practice mode; hide the row otherwise. */
  private applyModeVisibility(): void {
    this.undoRow.visible = this.mode === "practice";
  }

  /** Set capsule colour for the selected stop — mirrors applyToggle(). */
  private applyColorCapsule(n: SliderCount): void {
    const c = SLIDER_CAPSULE_COLOR[n];
    this.colorTrack
      .clear()
      .roundRect(0, 0, CONTENT_W, TOGGLE_H, TOGGLE_H / 2)
      .fill({ color: c.fill })
      .stroke({ color: c.stroke, width: 2, alpha: 0.6 });
  }

  /** Move the slider thumb to a stop and (unless silent) notify the hook. */
  private selectColorCount(n: SliderCount, silent = false): void {
    this.colorThumbTargetX = SLIDER_STOP_X[n];
    this.colorThumb.texture = frame(puyoFrame(SLIDER_COLOR[n], 0));
    this.colorCountLabel.text = `${n} colours`;
    this.applyColorCapsule(n);
    if (!silent) this.onColorCount?.(n);
  }

  private applyHistEnabled(): void {
    this.undoBg.alpha = this.undoEnabled ? 1 : 0.35;
    this.redoBg.alpha = this.redoEnabled ? 1 : 0.35;
    this.undoBtn.alpha = this.undoEnabled ? 1 : 0.5;
    this.redoBtn.alpha = this.redoEnabled ? 1 : 0.5;
  }

  /** Update the Best Chain value (largest chain reached this run). */
  setBestChain(n: number): void {
    this.bestValue.text = n > 0 ? `×${n}` : "–";
  }

  /** Sync the slider to the current pending colour-count (e.g. on init). */
  setColorCount(n: 3 | 4 | 5): void {
    this.selectColorCount(n, /* silent */ true);
    this.colorThumbX = this.colorThumbTargetX;
    this.colorThumb.x = this.colorThumbX;
  }

  /** Enable/disable the undo and redo buttons (history-line bounds). */
  setUndoRedoAvailable(canUndo: boolean, canRedo: boolean): void {
    this.undoEnabled = canUndo;
    this.redoEnabled = canRedo;
    this.applyHistEnabled();
  }

  /** Per-frame animation. dt is ticker.deltaTime (~1 at 60fps). */
  update(dt: number): void {
    this.thumbX = lerp(this.thumbX, this.thumbTargetX, Math.min(1, dt * 0.28));
    this.thumb.x = this.thumbX;

    this.colorThumbX = lerp(
      this.colorThumbX,
      this.colorThumbTargetX,
      Math.min(1, dt * 0.35),
    );
    this.colorThumb.x = this.colorThumbX;

    updateParticles(this.fx, this.particles, dt);

    if (this.restartPop > 0) {
      // Bubble-pop: flash white, then swap to the burst frames while scaling
      // up + fading out (mirrors PuyoLayer.renderPops), then snap the face
      // back so it's ready for the next click.
      this.restartPop = Math.max(0, this.restartPop - dt);
      const t = 1 - this.restartPop / POP_DUR; // 0..1
      this.restart.rotation = 0;
      if (t < 0.5) {
        this.restart.texture = frame(puyoFrame(R_COLOR, 0));
        this.restart.alpha = Math.floor(t * 12) % 2 === 0 ? 1 : 0.35;
        this.restart.scale.set(R_BASE);
      } else {
        const k = (t - 0.5) / 0.5; // 0..1
        this.restart.texture = frame(burstFrame(R_COLOR, k < 0.5 ? 0 : 1));
        this.restart.alpha = 1 - k;
        // Splash outward as it fades, matching PuyoLayer.renderPops.
        const sc = 1 + k * 0.6;
        this.restart.scale.set(R_BASE * sc);
      }
      if (this.restartPop <= 0) {
        this.restart.texture = frame(puyoFrame(R_COLOR, 0));
        this.restart.alpha = 1;
        this.restartScale = 1;
        this.restartTarget = this.restartPress ? 0.9 : 1;
        this.restart.scale.set(R_BASE);
      }
      return;
    }

    this.restartScale = lerp(
      this.restartScale,
      this.restartTarget,
      Math.min(1, dt * 0.3),
    );
    this.restart.scale.set(R_BASE * this.restartScale);
  }

  bind(
    onToggle: () => void,
    onRestart: () => void,
    onColorCount: (n: 3 | 4 | 5) => void,
    onUndo: () => void,
    onRedo: () => void,
  ): void {
    this.onToggle = onToggle;
    this.onRestart = onRestart;
    this.onColorCount = onColorCount;
    this.onUndo = onUndo;
    this.onRedo = onRedo;
  }

  setMode(mode: Mode): void {
    this.mode = mode;
    this.applyToggle(); // thumb slides to the new target via update()
    this.applyModeVisibility();
  }
}
