// In-canvas control panel: the play/practice toggle + a restart button, drawn
// in Pixi so they scale with the board. Sits just below the next window.
// The toggle thumb slides between states; the restart puyo eases on hover /
// press and spins once when clicked. Driven by update() from the stage ticker.
import { Container, Graphics, Sprite, Text } from "pixi.js";
import type { Mode } from "../lib/types";
import { frame, puyoFrame } from "./assets";

const PANEL_W = 153;
const CAP_W = 116;
const CAP_H = 60;
const THUMB_SCALE = 0.82;
const R_SIZE = 56; // restart puyo display size (native puyo is 64px)

const LABEL_STYLE = {
  fontFamily: "'Trebuchet MS', system-ui, sans-serif",
  fontSize: 16,
  fontWeight: "600" as const,
  fill: 0xdbe7ff,
} as const;

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export class ControlPanel extends Container {
  private onToggle?: () => void;
  private onRestart?: () => void;

  private toggle = new Container();
  private capsule = new Graphics();
  private thumb = new Sprite();
  private restart = new Sprite();
  private modeLabel: Text;
  private mode: Mode = "practice";

  // animation state
  private thumbX = 0;
  private thumbTargetX = 0;
  private restartScale = 1;
  private restartTarget = 1;
  private restartPress = false;
  private restartSpin = 0;

  constructor() {
    super();

    // ---- Toggle: capsule + sliding puyo thumb (slide only, no scaling) -----
    this.toggle.x = (PANEL_W - CAP_W) / 2;
    this.toggle.eventMode = "static";
    this.toggle.cursor = "pointer";
    this.toggle.on("pointertap", () => this.onToggle?.());
    this.toggle.addChild(this.capsule);
    this.thumb.anchor.set(0.5);
    this.thumb.scale.set(THUMB_SCALE);
    this.thumb.y = CAP_H / 2;
    this.toggle.addChild(this.thumb);
    this.addChild(this.toggle);

    this.modeLabel = new Text({ text: "Practice", style: LABEL_STYLE });
    this.modeLabel.anchor.set(0.5, 0);
    this.modeLabel.x = PANEL_W / 2;
    this.modeLabel.y = CAP_H + 8;
    this.addChild(this.modeLabel);

    // ---- Restart: the blue in-game puyo sprite as the button face ----------
    this.restart.texture = frame(puyoFrame(3, 0)); // blue_0
    this.restart.anchor.set(0.5);
    this.restart.scale.set(R_SIZE / 64);
    this.restart.x = PANEL_W / 2;
    this.restart.y = CAP_H + 8 + 24 + R_SIZE / 2;
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
      this.restartSpin = Math.PI * 2; // spin once on click
    });
    this.addChild(this.restart);

    const rLabel = new Text({ text: "Restart", style: LABEL_STYLE });
    rLabel.anchor.set(0.5, 0);
    rLabel.x = PANEL_W / 2;
    rLabel.y = this.restart.y + R_SIZE / 2 + 8;
    this.addChild(rLabel);

    this.applyToggle();
    this.thumbX = this.thumbTargetX; // no slide on first paint
    this.thumb.x = this.thumbX;
  }

  private setRestart(hover: boolean, press: boolean): void {
    this.restartPress = press;
    this.restartTarget = press ? 0.9 : hover ? 1.08 : 1;
  }

  /** Set capsule colour + thumb texture + target slide position for the mode. */
  private applyToggle(): void {
    const play = this.mode === "play";
    this.capsule
      .clear()
      .roundRect(0, 0, CAP_W, CAP_H, CAP_H / 2)
      .fill({ color: play ? 0x14240c : 0x1a1533 })
      .stroke({ color: play ? 0x6ede4f : 0x786ebe, width: 2, alpha: 0.6 });
    this.thumb.texture = frame(puyoFrame(play ? 2 : 5, 0)); // green=play, purple=practice
    const pad = CAP_H / 2;
    this.thumbTargetX = play ? CAP_W - pad : pad;
    this.modeLabel.text = play ? "Play" : "Practice";
  }

  /** Per-frame animation. dt is ticker.deltaTime (~1 at 60fps). */
  update(dt: number): void {
    this.thumbX = lerp(this.thumbX, this.thumbTargetX, Math.min(1, dt * 0.28));
    this.thumb.x = this.thumbX;
    this.restartScale = lerp(
      this.restartScale,
      this.restartTarget,
      Math.min(1, dt * 0.3),
    );
    this.restart.scale.set((R_SIZE / 64) * this.restartScale);
    if (this.restartSpin > 0) {
      const step = Math.min(this.restartSpin, dt * 0.6);
      this.restart.rotation += step;
      this.restartSpin -= step;
      if (this.restartSpin <= 0) this.restart.rotation = 0;
    }
  }

  bind(onToggle: () => void, onRestart: () => void): void {
    this.onToggle = onToggle;
    this.onRestart = onRestart;
  }

  setMode(mode: Mode): void {
    this.mode = mode;
    this.applyToggle(); // thumb slides to the new target via update()
  }
}
