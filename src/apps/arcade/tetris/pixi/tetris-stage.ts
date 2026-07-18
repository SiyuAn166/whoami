import { Application, Container } from "pixi.js";

import {
  CELL,
  COLS,
  NEXT_COUNT,
  type PieceType,
  VISIBLE_ROWS,
} from "../lib/config";
import { ActiveLayer } from "./active-layer";
import { BoardLayer } from "./board-layer";
import { FxLayer } from "./fx-layer";
import { HudLayer } from "./hud-layer";
import { SideLayer } from "./side-layer";
import { bakeTiles, type TileTextures } from "./tiles";

import type { Grid, Piece } from "../lib/types";

// Owns the Pixi Application and the whole scene graph. Framework-free:
// the React hook drives it purely through these methods.
export class TetrisStage {
  app: Application;
  private tiles!: TileTextures;
  private world = new Container();
  private board!: BoardLayer;
  private active!: ActiveLayer;
  private side!: SideLayer;
  private hud!: HudLayer;
  private fx!: FxLayer;
  private ready = false;
  private sceneW = 0;
  private sceneH = 0;

  constructor() {
    this.app = new Application();
  }

  async init(host: HTMLElement): Promise<void> {
    const holdW = 4 * 22 + 16 + 20;
    const boardW = COLS * CELL;
    const nextW = 4 * 22 + 16 + 20;
    const pad = 16;
    const width = holdW + pad + boardW + pad + nextW;
    const height = VISIBLE_ROWS * CELL;
    this.sceneW = width;
    this.sceneH = height;

    await this.app.init({
      width,
      height,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    // Responsive: letterbox the fixed-resolution scene into its host so the
    // canvas scales with the window (mirrors PuyoStage).
    const cv = this.app.canvas;
    cv.style.display = "block";
    cv.style.width = "100%";
    cv.style.height = "100%";
    cv.style.objectFit = "contain";
    host.appendChild(cv);

    this.tiles = bakeTiles(CELL, Math.min(window.devicePixelRatio || 1, 2) + 1);

    this.board = new BoardLayer(this.tiles);
    this.active = new ActiveLayer(this.tiles);
    this.side = new SideLayer(this.tiles, NEXT_COUNT);
    this.fx = new FxLayer();
    this.hud = new HudLayer();

    // layout
    this.side.holdRoot.x = 0;
    this.side.holdRoot.y = 0;

    // HUD (score/level/lines + restart) sits in the left column below HOLD.
    this.hud.root.x = 0;
    this.hud.root.y = 90;

    const boardX = holdW + pad;
    const boardContainer = new Container();
    boardContainer.x = boardX;
    boardContainer.addChild(this.board.root, this.active.root, this.fx.root);

    this.side.nextRoot.x = boardX + boardW + pad;
    this.side.nextRoot.y = 0;

    this.world.addChild(
      this.side.holdRoot,
      this.hud.root,
      boardContainer,
      this.side.nextRoot,
    );
    this.app.stage.addChild(this.world);
    // Drive HUD button hover/press/spin easing on its own ticker callback,
    // independent of the game tick the hook installs via onTick().
    this.app.ticker.add(() => this.hud.update());
    this.ready = true;
  }

  isReady() {
    return this.ready;
  }

  syncBoard(g: Grid) {
    if (this.ready) this.board.sync(g);
  }
  setActive(piece: Piece | null, ghost: Piece | null) {
    if (this.ready) this.active.update(piece, ghost);
  }
  clearActive() {
    if (this.ready) this.active.clear();
  }
  setHold(type: PieceType | null) {
    if (this.ready) this.side.setHold(type);
  }
  setNext(types: PieceType[]) {
    if (this.ready) this.side.setNext(types);
  }
  setStats(score: number, level: number, lines: number) {
    if (this.ready) this.hud.setStats(score, level, lines);
  }
  bindRestart(cb: () => void) {
    this.hud.bindRestart(cb);
  }

  // scene→screen scale (accounts for object-fit: contain letterboxing)
  private screenScale(): number {
    const r = this.app.canvas.getBoundingClientRect();
    if (!this.sceneW || !this.sceneH) return 1;
    return Math.min(r.width / this.sceneW, r.height / this.sceneH) || 1;
  }

  // one board cell in on-screen px — drag this far to shift one column
  cellPx(): number {
    return CELL * this.screenScale();
  }

  // is a client-space point inside the in-canvas restart button?
  hitRestart(clientX: number, clientY: number): boolean {
    if (!this.ready) return false;
    const r = this.app.canvas.getBoundingClientRect();
    const scale = this.screenScale();
    const contentW = this.sceneW * scale;
    const contentH = this.sceneH * scale;
    const offX = r.left + (r.width - contentW) / 2;
    const offY = r.top + (r.height - contentH) / 2;
    const sx = (clientX - offX) / scale;
    const sy = (clientY - offY) / scale;
    const b = this.hud.restartBounds();
    const bx = b.x + this.hud.root.x;
    const by = b.y + this.hud.root.y;
    return sx >= bx && sx <= bx + b.w && sy >= by && sy <= by + b.h;
  }

  flashRows(rows: number[], done: () => void) {
    if (this.ready) this.fx.flashRows(rows, done);
    else done();
  }
  toast(msg: string, color?: number) {
    if (this.ready) this.fx.toast(msg, color);
  }

  private tickFn?: (ticker: { deltaMS: number }) => void;
  onTick(fn: (dtMs: number) => void) {
    this.offTick();
    this.tickFn = (ticker) => fn(ticker.deltaMS);
    this.app.ticker.add(this.tickFn);
  }
  offTick() {
    if (this.tickFn) {
      this.app.ticker.remove(this.tickFn);
      this.tickFn = undefined;
    }
  }

  destroy() {
    try {
      this.app.destroy(true, { children: true, texture: true });
    } catch {
      /* noop */
    }
    this.ready = false;
  }
}
