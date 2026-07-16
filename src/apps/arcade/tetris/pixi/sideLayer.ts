import { Container, Graphics, Sprite, Text } from "pixi.js";
import { PREVIEW_CELL, type PieceType } from "../lib/config";
import { cellsOf, spawnPiece } from "../lib/engine";
import type { TileTextures } from "./tiles";

// A boxed preview (used for HOLD and each NEXT slot).
function makeBox(label: string, cols: number, rows: number) {
  const root = new Container();
  const pad = 8;
  const w = cols * PREVIEW_CELL + pad * 2;
  const h = rows * PREVIEW_CELL + pad * 2 + 18;
  const g = new Graphics();
  g.roundRect(0, 0, w, h, 8)
    .fill({ color: 0x11152a, alpha: 0.9 })
    .stroke({ color: 0x4a5488, width: 2 });
  const t = new Text({
    text: label,
    style: {
      fill: 0x9fb0e0,
      fontSize: 12,
      fontFamily: "monospace",
      fontWeight: "bold",
    },
  });
  t.x = pad;
  t.y = 4;
  const content = new Container();
  content.x = pad;
  content.y = 22;
  root.addChild(g, t, content);
  return { root, content, w, h };
}

function drawMini(
  content: Container,
  type: PieceType | null,
  tiles: TileTextures,
) {
  content.removeChildren().forEach((c) => c.destroy());
  if (!type) return;
  const p = spawnPiece(type);
  const cells = cellsOf(p);
  const rs = cells.map((x) => x[0]),
    cs = cells.map((x) => x[1]);
  const minR = Math.min(...rs),
    maxR = Math.max(...rs);
  const minC = Math.min(...cs),
    maxC = Math.max(...cs);
  const offR = -minR,
    offC = -minC;
  // center within 4-wide box
  const pw = maxC - minC + 1,
    ph = maxR - minR + 1;
  const cx = (4 - pw) / 2,
    cy = (2 - ph) / 2 < 0 ? 0 : (2 - ph) / 2;
  for (const [r, c] of cells) {
    const sp = new Sprite(tiles.solid[type]);
    sp.width = PREVIEW_CELL;
    sp.height = PREVIEW_CELL;
    sp.x = (c + offC + cx) * PREVIEW_CELL;
    sp.y = (r + offR + cy) * PREVIEW_CELL;
    content.addChild(sp);
  }
}

export class SideLayer {
  readonly holdRoot = new Container();
  readonly nextRoot = new Container();
  private holdContent: Container;
  private nextContents: Container[] = [];
  private tiles: TileTextures;
  nextCount: number;

  constructor(tiles: TileTextures, nextCount: number) {
    this.tiles = tiles;
    this.nextCount = nextCount;

    const hold = makeBox("HOLD", 4, 2);
    this.holdRoot.addChild(hold.root);
    this.holdContent = hold.content;

    let y = 0;
    for (let i = 0; i < nextCount; i++) {
      const box = makeBox(i === 0 ? "NEXT" : "", 4, 2);
      box.root.y = y;
      y += box.h + 6;
      this.nextRoot.addChild(box.root);
      this.nextContents.push(box.content);
    }
  }

  setHold(type: PieceType | null) {
    drawMini(this.holdContent, type, this.tiles);
  }

  setNext(types: PieceType[]) {
    for (let i = 0; i < this.nextContents.length; i++) {
      drawMini(this.nextContents[i], types[i] ?? null, this.tiles);
    }
  }
}
