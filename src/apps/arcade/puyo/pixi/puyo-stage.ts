// Owns the Pixi v8 Application and lays out the puyo.gg-style scene: the
// layout.png field frame, the playfield content (clipped), a next window, the
// chain-font counter, the score readout and a decorative garbage tray.
// Framework-free: the React hook drives it via the public methods below.
import { Application, Container, Graphics, Sprite } from "pixi.js";

import {
  CELL_H,
  FRAME,
  garbageToIcons,
  HIDDEN_ROWS,
  SPAWN_COL,
  STAGE,
} from "../lib/config";
import { ActiveLayer } from "./active-layer";
import { frame, hasLayout, layoutFrame, loadAssets } from "./assets";
import { ChainCounter } from "./chain-counter";
import { ControlPanel } from "./controls";
import { cellX, cellY } from "./coords";
import { FieldFrame } from "./field-frame";
import { FxLayer } from "./fx-layer";
import { NextWindow } from "./next-window";
import { PuyoLayer } from "./puyo-layer";
import { ScoreDisplay } from "./score-display";

import type { Color, Grid, Mode, Piece } from "../lib/types";

export const STAGE_W = STAGE.width;
export const STAGE_H = STAGE.height;

export class PuyoStage {
  app: Application;
  puyo!: PuyoLayer;
  active!: ActiveLayer;
  fx!: FxLayer;
  private nextWindow!: NextWindow;
  private chainCounter!: ChainCounter;
  private scoreDisplay!: ScoreDisplay;
  private controls!: ControlPanel;
  private tickCb: ((dt: number) => void) | null = null;
  private destroyed = false;
  private ghostEnabled = true;
  private garbageTray!: Container;

  constructor() {
    this.app = new Application();
  }

  async init(host: HTMLElement): Promise<void> {
    await this.app.init({
      width: STAGE_W,
      height: STAGE_H,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });
    if (this.destroyed) {
      this.app.destroy(true);
      return;
    }
    await loadAssets();
    if (this.destroyed) {
      this.app.destroy(true);
      return;
    }

    // Responsive: letterbox the fixed-resolution scene into its host.
    const cv = this.app.canvas;
    cv.style.display = "block";
    cv.style.width = "100%";
    cv.style.height = "100%";
    cv.style.objectFit = "contain";
    host.appendChild(cv);

    // ---- Field frame container ------------------------------------------
    const frameC = new Container();
    frameC.x = STAGE.frameX;
    frameC.y = STAGE.frameY;
    this.app.stage.addChild(frameC);

    frameC.addChild(new FieldFrame());

    // Playfield content, clipped to the inner well.
    const fieldContent = new Container();
    fieldContent.x = FRAME.fieldX;
    fieldContent.y = FRAME.fieldY;
    // Extend the clip upward by the hidden overflow rows so locked puyos that
    // rest off-screen (rows < HIDDEN_ROWS) are drawn instead of masked away.
    const overflowH = HIDDEN_ROWS * CELL_H;
    const mask = new Graphics()
      .rect(
        FRAME.clip.x - FRAME.fieldX,
        FRAME.clip.y - FRAME.fieldY - overflowH,
        FRAME.clip.w,
        FRAME.clip.h + overflowH,
      )
      .fill(0xffffff);
    fieldContent.addChild(mask);
    fieldContent.mask = mask;

    // Spawn-point death marker: the atlas' own death_X.png on the 3rd column.
    const marker = new Sprite(frame("death_X.png"));
    marker.anchor.set(0.5);
    marker.x = cellX(SPAWN_COL);
    marker.y = cellY(HIDDEN_ROWS);
    fieldContent.addChild(marker);

    this.puyo = new PuyoLayer();
    this.fx = new FxLayer();
    fieldContent.addChild(this.puyo, this.fx);
    frameC.addChild(fieldContent);

    // Active pair lives in its own UNCLIPPED container at the same offset so
    // the freshly-spawned pair can show above the frame (the spawn area).
    const activeContent = new Container();
    activeContent.x = FRAME.fieldX;
    activeContent.y = FRAME.fieldY;
    this.active = new ActiveLayer();
    this.active.setGhostEnabled(this.ghostEnabled);
    activeContent.addChild(this.active);
    frameC.addChild(activeContent);

    // ---- Garbage tray + nuisance icons ----------------------------------
    if (hasLayout()) {
      const tray = new Sprite(layoutFrame("garbage_tray.png"));
      tray.x = STAGE.garbage.x;
      tray.y = STAGE.garbage.y;
      tray.scale.set(STAGE.garbage.scale);
      frameC.addChild(tray);
    }
    // Row of nuisance icons that the current board *would* send (single-player
    // has no opponent, so this is a running tally rather than a live queue).
    this.garbageTray = new Container();
    this.garbageTray.x = STAGE.garbage.x;
    this.garbageTray.y = STAGE.garbage.y;
    frameC.addChild(this.garbageTray);

    // ---- Score readout ---------------------------------------------------
    this.scoreDisplay = new ScoreDisplay();
    this.scoreDisplay.x = STAGE.score.x;
    this.scoreDisplay.y = STAGE.score.y;
    frameC.addChild(this.scoreDisplay);

    // ---- Chain counter ---------------------------------------------------
    this.chainCounter = new ChainCounter();
    this.chainCounter.x = STAGE.chain.x;
    this.chainCounter.y = STAGE.chain.y;
    frameC.addChild(this.chainCounter);

    // ---- Next window (outside the frame, to its right) ------------------
    this.nextWindow = new NextWindow();
    this.nextWindow.x = STAGE.next.x;
    this.nextWindow.y = STAGE.next.y;
    frameC.addChild(this.nextWindow);

    // ---- Controls (play/practice toggle + restart), below the next window ---
    this.controls = new ControlPanel();
    this.controls.x = STAGE.next.x;
    this.controls.y = STAGE.next.y + 304 + 24; // next window is 304 tall
    frameC.addChild(this.controls);

    this.app.ticker.add((ticker) => {
      this.fx.update(ticker.deltaTime);
      this.controls.update(ticker.deltaTime);
      this.chainCounter.update(ticker.deltaTime, ticker.deltaMS);
      if (this.tickCb) this.tickCb(ticker.deltaMS);
    });
    // this.setGarbage(1287); // uncomment this for dev
  }

  onTick(cb: (dt: number) => void): void {
    this.tickCb = cb;
  }

  syncStatic(g: Grid): void {
    this.puyo.syncStatic(g);
  }

  showActive(g: Grid, p: Piece, dtMs?: number, fallFrac?: number): void {
    this.active.update(g, p, dtMs, fallFrac);
  }

  hideActive(): void {
    this.active.hide();
  }

  setGhostEnabled(on: boolean): void {
    this.ghostEnabled = on;
    this.active?.setGhostEnabled(on);
  }

  setNext(pairs: [Color, Color][]): void {
    this.nextWindow?.setNext(pairs);
  }

  setScore(n: number): void {
    this.scoreDisplay?.setScore(n);
  }

  /** Render the garbage tally as a row of nuisance icons (largest first). */
  setGarbage(n: number): void {
    const tray = this.garbageTray;
    if (!tray) return;
    tray.removeChildren();
    const icons = garbageToIcons(n, 6);
    const scale = 0.5;
    const step = 66 * scale;
    const padX = 40 * scale;
    const padY = 40 * scale;
    icons.forEach((name, i) => {
      const spr = new Sprite(frame(name));
      spr.anchor.set(0, 0.5);
      spr.scale.set(scale);
      spr.x = padX + i * step;
      spr.y = padY;
      tray.addChild(spr);
    });
  }

  showChain(n: number): void {
    this.chainCounter?.show(n);
  }

  hideChain(): void {
    this.chainCounter?.hideNow();
  }

  /** Wire the in-canvas control buttons to the game hook. */
  bindControls(onToggle: () => void, onRestart: () => void): void {
    this.controls?.bind(onToggle, onRestart);
  }

  /** Reflect the current play/practice mode on the toggle. */
  setMode(mode: Mode): void {
    this.controls?.setMode(mode);
  }

  /** Update the Best Chain readout under the control buttons. */
  setBestChain(n: number): void {
    this.controls?.setBestChain(n);
  }

  /**
   * Hit-test a client (screen) point against the control panel, accounting for
   * the canvas' object-fit: contain letterboxing. Used so touch taps on the
   * buttons don't also fire a board gesture.
   */
  hitControls(clientX: number, clientY: number): boolean {
    if (!this.controls) return false;
    const rect = this.app.canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / STAGE_W, rect.height / STAGE_H);
    const offX = rect.left + (rect.width - STAGE_W * scale) / 2;
    const offY = rect.top + (rect.height - STAGE_H * scale) / 2;
    const sx = (clientX - offX) / scale;
    const sy = (clientY - offY) / scale;
    const b = this.controls.getBounds();
    return sx >= b.minX && sx <= b.maxX && sy >= b.minY && sy <= b.maxY;
  }

  destroy(): void {
    this.destroyed = true;
    this.tickCb = null;
    try {
      this.app.destroy(true, { children: true, texture: false });
    } catch {
      /* already gone */
    }
  }
}

export type { Color, Grid, Piece };
