// In-canvas control panel: the play/practice toggle + a restart button, drawn
// in Pixi so they scale with the board. Sits just below the next window.
// The toggle thumb slides between states; the restart puyo eases on hover /
// press and plays the game's puyo-pop (bubble-clear) burst when clicked:
// a white flash, a burst-frame scale-up/fade, plus scatter debris particles —
// mirroring PuyoLayer.renderPops + FxLayer.spawnBurst. Driven by update().
import { Container, Graphics, Sprite, Text } from "pixi.js";

import { burstFrame, frame, puyoFrame } from "./assets";
import { updateParticles } from "./particles";

import type { Mode } from "../lib/types";
import type { Particle } from "./particles";

const PANEL_W = 153;
const CAP_W = 116;
const CAP_H = 60;
const THUMB_SCALE = 0.82;
const R_SIZE = 56; // restart puyo display size (native puyo is 64px)
const R_COLOR = 3; // blue puyo used as the restart button face
const POP_DUR = 26; // pop duration in frames (~0.45s at 60fps)
const R_BASE = R_SIZE / 64; // sprite scale for the 64px atlas frame

const LABEL_STYLE = {
  fontFamily: "'Trebuchet MS', system-ui, sans-serif",
  fontSize: 16,
  fontWeight: "600" as const,
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

  private toggle = new Container();
  private capsule = new Graphics();
  private thumb = new Sprite();
  private restart = new Sprite();
  private fx = new Container(); // scatter debris for the restart pop
  private particles: Particle[] = [];
  private modeLabel: Text;
  private bestValue: Text;
  private mode: Mode = "practice";

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
    this.restart.texture = frame(puyoFrame(R_COLOR, 0)); // blue_0
    this.restart.anchor.set(0.5);
    this.restart.scale.set(R_BASE);
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
      this.popRestart(); // bubble-clear burst on click
    });
    this.addChild(this.restart);
    this.addChild(this.fx); // debris drawn above the button face

    const rLabel = new Text({ text: "Restart", style: LABEL_STYLE });
    rLabel.anchor.set(0.5, 0);
    rLabel.x = PANEL_W / 2;
    rLabel.y = this.restart.y + R_SIZE / 2 + 8;
    this.addChild(rLabel);

    // ---- Best Chain readout, centred below the two buttons -----------------
    const bestLabel = new Text({ text: "BEST CHAIN", style: BEST_LABEL_STYLE });
    bestLabel.anchor.set(0.5, 0);
    bestLabel.x = PANEL_W / 2;
    bestLabel.y = rLabel.y + 50;
    this.addChild(bestLabel);

    this.bestValue = new Text({ text: "\u2013", style: BEST_VALUE_STYLE });
    this.bestValue.anchor.set(0.5, 0);
    this.bestValue.x = PANEL_W / 2;
    this.bestValue.y = bestLabel.y + 38;
    this.addChild(this.bestValue);

    this.applyToggle();
    this.thumbX = this.thumbTargetX; // no slide on first paint
    this.thumb.x = this.thumbX;
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
      .roundRect(0, 0, CAP_W, CAP_H, CAP_H / 2)
      .fill({ color: play ? 0x14240c : 0x1a1533 })
      .stroke({ color: play ? 0x6ede4f : 0x786ebe, width: 2, alpha: 0.6 });
    this.thumb.texture = frame(puyoFrame(play ? 2 : 5, 0)); // green=play, purple=practice
    const pad = CAP_H / 2;
    this.thumbTargetX = play ? CAP_W - pad : pad;
    this.modeLabel.text = play ? "Play" : "Practice";
  }

  /** Update the Best Chain value (largest chain reached this run). */
  setBestChain(n: number): void {
    this.bestValue.text = n > 0 ? `\u00d7${n}` : "\u2013";
  }

  /** Per-frame animation. dt is ticker.deltaTime (~1 at 60fps). */
  update(dt: number): void {
    this.thumbX = lerp(this.thumbX, this.thumbTargetX, Math.min(1, dt * 0.28));
    this.thumb.x = this.thumbX;

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
        const sc = 1 + k * 0.4;
        this.restart.scale.set(R_BASE * sc * (1 - k));
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

  bind(onToggle: () => void, onRestart: () => void): void {
    this.onToggle = onToggle;
    this.onRestart = onRestart;
  }

  setMode(mode: Mode): void {
    this.mode = mode;
    this.applyToggle(); // thumb slides to the new target via update()
  }
}
