import { Application, Container } from "pixi.js";
import {
  CELL,
  COLS,
  NEXT_COUNT,
  VISIBLE_ROWS,
  type PieceType,
} from "../lib/config";
import type { Grid, Piece } from "../lib/types";
import { ActiveLayer } from "./activeLayer";
import { BoardLayer } from "./boardLayer";
import { FxLayer } from "./fxLayer";
import { SideLayer } from "./sideLayer";
import { bakeTiles, type TileTextures } from "./tiles";

// Owns the Pixi Application and the whole scene graph. Framework-free:
// the React hook drives it purely through these methods.
export class TetrisStage {
  app: Application;
  private tiles!: TileTextures;
  private world = new Container();
  private board!: BoardLayer;
  private active!: ActiveLayer;
  private side!: SideLayer;
  private fx!: FxLayer;
  private ready = false;

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

    // layout
    this.side.holdRoot.x = 0;
    this.side.holdRoot.y = 0;

    const boardX = holdW + pad;
    const boardContainer = new Container();
    boardContainer.x = boardX;
    boardContainer.addChild(this.board.root, this.active.root, this.fx.root);

    this.side.nextRoot.x = boardX + boardW + pad;
    this.side.nextRoot.y = 0;

    this.world.addChild(this.side.holdRoot, boardContainer, this.side.nextRoot);
    this.app.stage.addChild(this.world);
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
