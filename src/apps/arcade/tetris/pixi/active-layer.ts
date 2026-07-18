import { Container, Sprite } from "pixi.js";
import { CELL, type PieceType } from "../lib/config";
import type { Piece } from "../lib/types";
import { cellsOf } from "../lib/engine";
import type { TileTextures } from "./tiles";
import { cellX, cellY } from "./coords";

// Renders the falling piece and its ghost. Rebuilt each time the piece changes.
export class ActiveLayer {
  readonly root = new Container();
  private ghost = new Container();
  private solid = new Container();
  private tiles: TileTextures;

  constructor(tiles: TileTextures) {
    this.tiles = tiles;
    this.root.addChild(this.ghost, this.solid);
  }

  private fill(
    cont: Container,
    cells: [number, number][],
    tex: Sprite["texture"],
    alpha: number,
  ) {
    cont.removeChildren().forEach((c) => c.destroy());
    for (const [r, c] of cells) {
      const sp = new Sprite(tex);
      sp.width = CELL;
      sp.height = CELL;
      sp.x = cellX(c);
      sp.y = cellY(r);
      sp.alpha = alpha;
      cont.addChild(sp);
    }
  }

  update(piece: Piece | null, ghost: Piece | null) {
    if (!piece) {
      this.ghost.removeChildren().forEach((c) => c.destroy());
      this.solid.removeChildren().forEach((c) => c.destroy());
      return;
    }
    const type = piece.type as PieceType;
    if (ghost) this.fill(this.ghost, cellsOf(ghost), this.tiles.ghost[type], 1);
    else this.ghost.removeChildren().forEach((c) => c.destroy());
    this.fill(this.solid, cellsOf(piece), this.tiles.solid[type], 1);
  }

  clear() {
    this.ghost.removeChildren().forEach((c) => c.destroy());
    this.solid.removeChildren().forEach((c) => c.destroy());
  }
}
