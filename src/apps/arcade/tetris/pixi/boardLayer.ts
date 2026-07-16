import { Container, Sprite, Graphics } from "pixi.js";
import { COLS, VISIBLE_ROWS, ROWS, CELL, type PieceType } from "../lib/config";
import type { Grid } from "../lib/types";
import type { TileTextures } from "./tiles";
import { cellX, cellY } from "./coords";

// Renders the settled board plus the well background & grid lines.
export class BoardLayer {
  readonly root = new Container();
  private bg = new Graphics();
  private cells = new Container();
  private sprites: (Sprite | null)[][] = [];
  private tiles: TileTextures;

  constructor(tiles: TileTextures) {
    this.tiles = tiles;
    this.root.addChild(this.bg, this.cells);
    this.drawWell();
    for (let r = 0; r < ROWS; r++) {
      this.sprites.push(Array<Sprite | null>(COLS).fill(null));
    }
  }

  private drawWell() {
    const w = COLS * CELL,
      h = VISIBLE_ROWS * CELL;
    this.bg.clear();
    this.bg.rect(0, 0, w, h).fill({ color: 0x0d1020, alpha: 0.92 });
    // grid lines
    for (let c = 0; c <= COLS; c++) {
      this.bg.moveTo(c * CELL, 0).lineTo(c * CELL, h);
    }
    for (let r = 0; r <= VISIBLE_ROWS; r++) {
      this.bg.moveTo(0, r * CELL).lineTo(w, r * CELL);
    }
    this.bg.stroke({ color: 0x2a3050, width: 1, alpha: 0.5 });
    // outer frame
    this.bg.rect(0, 0, w, h).stroke({ color: 0x4a5488, width: 2, alpha: 0.9 });
  }

  private placeSprite(r: number, c: number, type: PieceType) {
    const sp = new Sprite(this.tiles.solid[type]);
    sp.width = CELL;
    sp.height = CELL;
    sp.x = cellX(c);
    sp.y = cellY(r);
    this.cells.addChild(sp);
    this.sprites[r][c] = sp;
  }

  // full re-sync from grid state
  sync(g: Grid) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const val = g[r][c];
        const cur = this.sprites[r][c];
        if (val === 0) {
          if (cur) {
            cur.destroy();
            this.sprites[r][c] = null;
          }
        } else {
          if (cur) {
            cur.texture = this.tiles.solid[val as PieceType];
            cur.y = cellY(r);
          } else {
            this.placeSprite(r, c, val as PieceType);
          }
        }
      }
    }
  }

  get width() {
    return COLS * CELL;
  }
  get height() {
    return VISIBLE_ROWS * CELL;
  }
}
