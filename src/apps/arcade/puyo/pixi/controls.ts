// In-canvas control panel: the play/practice toggle, a restart button, a
// difficulty (colour-count) selector, and (practice-only) undo/redo buttons —
// all drawn in Pixi so they scale with the board. Sits just below the next
// window.
// Both the toggle and the restart button are sprite-sheet animations from
// button.png/.json: the toggle clacks between Pause/Play frames on mode
// change, and restart plays its own pop-and-reform clip on tap. Both read
// their frame rects, per-frame durations and clip order straight from the
// JSON (see assets.ts) and are driven every tick by update().
import { Container, Graphics, Sprite, Text } from "pixi.js";

import { buttonClip, buttonFrame, frame } from "./assets";

import type { Mode } from "../lib/types";
import type { ButtonClip } from "./assets";

const PANEL_W = 153;
// Shared content width/height: the difficulty dots and undo/redo row line up
// to this width; the toggle icon below is sized off TOGGLE_H too.
const CONTENT_W = 116;
const TOGGLE_H = 46;

// button.json clip playback speed multiplier: the authored per-frame
// durations read as sluggish at real-world speed, so the clips play this many
// times faster (relative per-frame proportions stay intact — nothing here is
// a made-up timing, just a per-button speed scale).
const TOGGLE_CLIP_SPEED = 6;
const RESTART_CLIP_SPEED = 2;

// Play/practice toggle: button.png/.json's pause_play_00..08 frames (256x256,
// real alpha). Rests on the icon inviting the next action — pause_play_08
// (Play) in practice, pause_play_00 (Pause) in play — and clacks through the
// atlas's own clip on every real mode change: "play_to_pause" (08->00) when
// switching to play, "pause_to_play" (00->08) switching back.
const TOGGLE_ICON_BASE = TOGGLE_H / 256; // sprite scale for the native 256px frame
const TOGGLE_REST: Record<Mode, string> = {
  practice: "pause_play_08",
  play: "pause_play_00",
};

// Restart: button.png/.json's restart_00..11 frames — a puyo that pops into
// scattered bubbles and reforms. Rests on restart_00 and plays the "restart"
// clip once on every tap (frame rects/durations/order read from the JSON).
const R_SIZE = 78; // restart icon display size
const R_BASE = R_SIZE / 256; // sprite scale for the native 256px frame
const RESTART_REST = "restart_00";

// Toggle + restart share one row: toggle on the left, restart on the right,
// the pair centred on CONTENT_W so it lines up with the difficulty/undo rows
// below.
const ROW_GAP = CONTENT_W - TOGGLE_H - R_SIZE; // gap between the two buttons
const ROW_H = Math.max(TOGGLE_H, R_SIZE); // shared row height
const ROW_X = (PANEL_W - CONTENT_W) / 2; // row's left edge

// Difficulty selector: 5 puyo "_blip" dots (green/yellow/red = easy/normal/
// hard). Level n fills the first n dots with that level's colour; the rest
// show the neutral garbage_blip. Only dots 3-5 are clickable and pick the
// difficulty directly (3, 4 or 5 colours) — dots 1-2 are always filled and
// not independently selectable, since 3 is the minimum colour count. No
// animation: textures just swap on selection.
type Difficulty = 3 | 4 | 5;
const DIFF_COLOR_NAME: Record<Difficulty, string> = {
  3: "green",
  4: "yellow",
  5: "red",
};
const DIFF_DOTS = 5;
const DIFF_DOT_SIZE = 40;
const DIFF_DOT_GAP = -14; // negative: bounding boxes overlap, but each blip frame
// has transparent padding around the drawn circle, so the dots themselves just
// sit close together. 5*40 + 4*-14 = 144, fits inside PANEL_W (153).
const DIFF_ROW_W = DIFF_DOTS * DIFF_DOT_SIZE + (DIFF_DOTS - 1) * DIFF_DOT_GAP;
const DIFF_ROW_X = (PANEL_W - DIFF_ROW_W) / 2; // centred on the panel, not CONTENT_W: bigger dots need the extra width
const DIFF_BASE = DIFF_DOT_SIZE / 64; // sprite scale for the native 64x60 blip frame
const DIFF_Y = ROW_H + 24;
const DIFF_HOVER_SCALE = 1.2; // clickable dots (3/4/5) grow on hover, snap on press
const DIFF_PRESS_SCALE = 0.92;

// Undo/redo row (practice only).
const HIST_BTN_W = 54;
const HIST_BTN_H = 40;
const HIST_GAP = CONTENT_W - HIST_BTN_W * 2;

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

/** Plays one button.json clip: advances by real elapsed ms against each
 *  frame's authored duration, stopping (no loop) on the clip's last frame. */
class ClipPlayer {
  clip: ButtonClip | null = null;
  index = 0;
  elapsedMs = 0;
  playing = false;

  start(clip: ButtonClip): void {
    this.clip = clip;
    this.index = 0;
    this.elapsedMs = 0;
    this.playing = true;
  }

  /** Advance by `dtMs`; returns the current frame name, or null if idle. */
  step(dtMs: number): string | null {
    if (!this.playing || !this.clip) return null;
    const { frames, durations } = this.clip;
    this.elapsedMs += dtMs;
    while (
      this.index < frames.length - 1 &&
      this.elapsedMs >= durations[this.index]
    ) {
      this.elapsedMs -= durations[this.index];
      this.index++;
    }
    if (this.index >= frames.length - 1) this.playing = false;
    return frames[this.index];
  }
}

export class ControlPanel extends Container {
  private onToggle?: () => void;
  private onRestart?: () => void;
  private onColorCount?: (n: 3 | 4 | 5) => void;
  private onUndo?: () => void;
  private onRedo?: () => void;

  private toggleIcon = new Sprite();
  private restart = new Sprite();
  private bestValue: Text;
  private mode: Mode = "practice";

  private diffDots: Sprite[] = [];
  private diffScale: number[] = [1, 1, 1, 1, 1]; // current eased hover scale, per dot
  private diffTarget: number[] = [1, 1, 1, 1, 1]; // target hover scale, per dot

  private undoRow = new Container();
  private undoBtn = new Container();
  private redoBtn = new Container();
  private undoBg = new Graphics();
  private redoBg = new Graphics();
  private undoEnabled = false;
  private redoEnabled = false;

  // animation state
  private toggleClip = new ClipPlayer();
  private restartClip = new ClipPlayer();

  constructor() {
    super();

    // ---- Toggle: Pause/Play icon, clacks on tap (see setMode) -------------
    this.toggleIcon.texture = buttonFrame(TOGGLE_REST[this.mode]);
    this.toggleIcon.anchor.set(0.5);
    this.toggleIcon.scale.set(TOGGLE_ICON_BASE);
    this.toggleIcon.x = ROW_X + TOGGLE_H / 2;
    this.toggleIcon.y = ROW_H / 2;
    this.toggleIcon.eventMode = "static";
    this.toggleIcon.cursor = "pointer";
    this.toggleIcon.on("pointertap", () => {
      if (this.toggleClip.playing) return; // ignore repeat taps mid-animation
      this.onToggle?.();
    });
    this.addChild(this.toggleIcon);

    // ---- Restart: pop-and-reform icon, plays its clip on every tap --------
    this.restart.texture = buttonFrame(RESTART_REST);
    this.restart.anchor.set(0.5);
    this.restart.scale.set(R_BASE);
    this.restart.x = ROW_X + TOGGLE_H + ROW_GAP + R_SIZE / 2;
    this.restart.y = ROW_H / 2;
    this.restart.eventMode = "static";
    this.restart.cursor = "pointer";
    this.restart.on("pointertap", () => {
      this.onRestart?.();
      const clip = buttonClip("restart");
      if (clip) {
        this.restartClip.start(clip);
        this.restart.texture = buttonFrame(clip.frames[0]);
      }
    });
    this.addChild(this.restart);

    // ---- Difficulty selector: 5 blip dots, right below toggle/restart -----
    for (let i = 0; i < DIFF_DOTS; i++) {
      const dot = new Sprite();
      dot.anchor.set(0.5);
      dot.scale.set(DIFF_BASE);
      dot.x =
        DIFF_ROW_X + i * (DIFF_DOT_SIZE + DIFF_DOT_GAP) + DIFF_DOT_SIZE / 2;
      dot.y = DIFF_Y;
      this.diffDots.push(dot);
      this.addChild(dot);

      const level = i + 1;
      if (level >= 3) {
        dot.eventMode = "static";
        dot.cursor = "pointer";
        dot.on("pointerover", () => {
          this.diffTarget[i] = DIFF_HOVER_SCALE;
        });
        dot.on("pointerout", () => {
          this.diffTarget[i] = 1;
        });
        dot.on("pointerdown", () => {
          this.diffTarget[i] = DIFF_PRESS_SCALE;
        });
        dot.on("pointerup", () => {
          this.diffTarget[i] = DIFF_HOVER_SCALE;
        });
        dot.on("pointerupoutside", () => {
          this.diffTarget[i] = 1;
        });
        dot.on("pointertap", () => this.selectDifficulty(level as Difficulty));
      }
    }
    this.selectDifficulty(4, /* silent */ true);

    // ---- Undo / redo (practice only) ---------------------------------------
    this.undoRow.x = (PANEL_W - CONTENT_W) / 2;
    this.undoRow.y = DIFF_Y + 24;
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

  /** Undo/redo only makes sense in practice mode; hide the row otherwise. */
  private applyModeVisibility(): void {
    this.undoRow.visible = this.mode === "practice";
  }

  /** Fill dots 1..n with the level's colour, the rest as neutral garbage. */
  private selectDifficulty(n: Difficulty, silent = false): void {
    const colorName = DIFF_COLOR_NAME[n];
    for (let i = 0; i < DIFF_DOTS; i++) {
      const filled = i < n;
      this.diffDots[i].texture = frame(
        filled ? `${colorName}_blip.png` : "garbage_blip.png",
      );
    }
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

  /** Sync the difficulty dots to the current colour-count (e.g. on init). */
  setColorCount(n: 3 | 4 | 5): void {
    this.selectDifficulty(n, /* silent */ true);
  }

  /** Enable/disable the undo and redo buttons (history-line bounds). */
  setUndoRedoAvailable(canUndo: boolean, canRedo: boolean): void {
    this.undoEnabled = canUndo;
    this.redoEnabled = canRedo;
    this.applyHistEnabled();
  }

  /** Per-frame animation. dtMs is the real elapsed ms (ticker.deltaMS), used
   *  to advance the toggle/restart clips on their own authored per-frame
   *  durations rather than a guess. */
  update(dtMs: number): void {
    const toggleFrame = this.toggleClip.step(dtMs * TOGGLE_CLIP_SPEED);
    if (toggleFrame) this.toggleIcon.texture = buttonFrame(toggleFrame);

    const restartFrame = this.restartClip.step(dtMs * RESTART_CLIP_SPEED);
    if (restartFrame) this.restart.texture = buttonFrame(restartFrame);

    const k = Math.min(1, dtMs / 60);
    for (let i = 0; i < DIFF_DOTS; i++) {
      this.diffScale[i] = lerp(this.diffScale[i], this.diffTarget[i], k);
      this.diffDots[i].scale.set(DIFF_BASE * this.diffScale[i]);
    }
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
    const changed = mode !== this.mode;
    this.mode = mode;
    if (changed) {
      // Clack through to the new rest icon (see update()): "play_to_pause"
      // (pause_play_08->00) into play, "pause_to_play" reversed back.
      const clip = buttonClip(
        mode === "play" ? "play_to_pause" : "pause_to_play",
      );
      if (clip) {
        this.toggleClip.start(clip);
        this.toggleIcon.texture = buttonFrame(clip.frames[0]);
      } else {
        this.toggleIcon.texture = buttonFrame(TOGGLE_REST[mode]);
      }
    } else {
      this.toggleClip.playing = false;
      this.toggleIcon.texture = buttonFrame(TOGGLE_REST[mode]);
    }
    this.applyModeVisibility();
  }
}
