// The falling pair plus its landing-shadow (ghost) preview.
import { Container, Sprite } from "pixi.js";
import { HIDDEN_ROWS, SCALE_X, SCALE_Y } from "../lib/config";
import { hardDropPiece, pieceCells } from "../lib/engine";
import type { Color, Grid, Piece } from "../lib/types";
import { frame, puyoFrame } from "./assets";
import { cellX, cellY } from "./coords";

export class ActiveLayer extends Container {
  private axis = new Sprite();
  private sat = new Sprite();
  private ghostA = new Sprite();
  private ghostB = new Sprite();
  private ghostEnabled = true;

  constructor() {
    super();
    for (const s of [this.ghostA, this.ghostB, this.axis, this.sat]) {
      s.anchor.set(0.5);
      s.scale.set(SCALE_X, SCALE_Y);
      s.visible = false;
      this.addChild(s);
    }
    this.ghostA.alpha = 0.35;
    this.ghostB.alpha = 0.35;
  }

  /** Practice mode disables the landing preview; play mode enables it. */
  setGhostEnabled(on: boolean): void {
    this.ghostEnabled = on;
    if (!on) {
      this.ghostA.visible = false;
      this.ghostB.visible = false;
    }
  }

  hide(): void {
    for (const s of [this.ghostA, this.ghostB, this.axis, this.sat])
      s.visible = false;
  }

  /** Update the live pair and its ghost against the current grid. */
  update(grid: Grid, p: Piece): void {
    if (this.ghostEnabled) {
      // Ghost: where the pair would land on hard-drop, drawn as the real puyo
      // sprite at reduced opacity so it always uses the aqua texture.
      const landed = hardDropPiece(grid, p);
      const [ga, gb] = pieceCells(landed);
      this.placeGhost(this.ghostA, ga.r, ga.c, p.axis);
      this.placeGhost(this.ghostB, gb.r, gb.c, p.sat);
    } else {
      this.ghostA.visible = false;
      this.ghostB.visible = false;
    }

    const [a, b] = pieceCells(p);
    this.place(this.axis, a.r, a.c, p.axis);
    this.place(this.sat, b.r, b.c, p.sat);
  }

  private place(s: Sprite, r: number, c: number, color: Color): void {
    s.texture = frame(puyoFrame(color, 0));
    s.x = cellX(c);
    s.y = cellY(r);
    s.visible = true; // visible even above the frame (spawn area)
  }

  private placeGhost(s: Sprite, r: number, c: number, color: Color): void {
    s.texture = frame(puyoFrame(color, 0));
    s.x = cellX(c);
    s.y = cellY(r);
    s.visible = r >= HIDDEN_ROWS;
  }
}
