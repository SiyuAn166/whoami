// Next-pieces preview. Uses the layout.png "next_border_1p" sprite as the
// window chrome, and draws the upcoming two pairs as puyo sprites inside it.
import { Container, Graphics, Sprite } from "pixi.js";
import type { Color } from "../lib/types";
import { frame, hasLayout, layoutFrame, puyoFrame } from "./assets";

const WIN_W = 153;
const WIN_H = 304;

export class NextWindow extends Container {
  private slots: { axis: Sprite; sat: Sprite }[] = [];

  constructor() {
    super();

    if (hasLayout()) {
      const border = new Sprite(layoutFrame("next_border_1p.png"));
      this.addChild(border);
    } else {
      const g = new Graphics();
      g.roundRect(0, 0, WIN_W, WIN_H, 16)
        .fill({ color: 0x0c1530 })
        .stroke({ color: 0x6de0ff, width: 3, alpha: 0.6 });
      this.addChild(g);
    }

    // Two preview slots: first pair large near the top, second smaller below.
    const layouts = [
      { cx: WIN_W / 2 - 20, cy: 98, scale: 0.92 },
      { cx: WIN_W / 2 + 20, cy: 210, scale: 0.82 },
    ];
    for (const L of layouts) {
      const sat = new Sprite();
      const axis = new Sprite();
      for (const s of [sat, axis]) {
        s.anchor.set(0.5);
        s.scale.set(L.scale);
        s.visible = false;
        this.addChild(s);
      }
      // satellite sits on top of the axis
      sat.x = L.cx;
      sat.y = L.cy - 30 * L.scale;
      axis.x = L.cx;
      axis.y = L.cy + 30 * L.scale;
      this.slots.push({ axis, sat });
    }
  }

  setNext(pairs: [Color, Color][]): void {
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      const pair = pairs[i];
      if (!pair) {
        slot.axis.visible = false;
        slot.sat.visible = false;
        continue;
      }
      const [axis, sat] = pair;
      slot.axis.texture = frame(puyoFrame(axis, 0));
      slot.sat.texture = frame(puyoFrame(sat, 0));
      slot.axis.visible = true;
      slot.sat.visible = true;
    }
  }
}
