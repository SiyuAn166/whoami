// The field frame: recessed well background + the six layout.png border sprites
// placed at puyosim's exact offsets. If layout.png is missing, a drawn frame is
// used so the app still renders.
import { Container, Graphics, Sprite } from "pixi.js";
import { FRAME } from "../lib/config";
import { layoutFrame, hasLayout, hasFieldBg, fieldBgTexture } from "./assets";

export class FieldFrame extends Container {
  constructor() {
    super();

    // Recessed playfield well behind the puyos (aqua-tinted, glossy top edge).
    const { clip } = FRAME;
    const well = new Graphics();
    well
      .roundRect(clip.x - 1, clip.y - 1, clip.w + 2, clip.h + 2, 4)
      .fill({ color: 0x0b1f38 });
    well.rect(clip.x, clip.y, clip.w, 4).fill({ color: 0x6fe6ff, alpha: 0.14 });
    this.addChild(well);

    // Character-art background image, fitted to the playfield well and masked
    // to the clip rect so it never spills past the frame. Drawn behind puyos.
    if (hasFieldBg()) {
      const tex = fieldBgTexture()!;
      const bg = new Sprite(tex);
      // cover-fit: scale so the image fills the clip, cropping overflow
      const scale = Math.max(clip.w / tex.width, clip.h / tex.height);
      bg.scale.set(scale);
      bg.x = clip.x + (clip.w - tex.width * scale) / 2;
      bg.y = clip.y + (clip.h - tex.height * scale) / 2;
      bg.alpha = 0.9;

      const mask = new Graphics();
      mask.rect(clip.x, clip.y, clip.w, clip.h).fill({ color: 0xffffff });
      bg.mask = mask;
      this.addChild(mask, bg);

      // subtle dark scrim so puyos stay readable over the art
      const scrim = new Graphics();
      scrim
        .rect(clip.x, clip.y, clip.w, clip.h)
        .fill({ color: 0x0b1f38, alpha: 0.28 });
      this.addChild(scrim);
    }

    if (hasLayout()) {
      this.addBorderSprites();
    } else {
      this.addDrawnFrame();
    }
  }

  private addBorderSprites(): void {
    const b = FRAME.border;
    const add = (name: string, x: number, y: number) => {
      const s = new Sprite(layoutFrame(name));
      s.x = x;
      s.y = y;
      this.addChild(s);
    };
    add("field_border_top.png", b.top.x, b.top.y);
    add("field_border_left_tophalf.png", b.leftTop.x, b.leftTop.y);
    add("field_border_left_bottomhalf.png", b.leftBot.x, b.leftBot.y);
    add("field_border_right_tophalf.png", b.rightTop.x, b.rightTop.y);
    add("field_border_right_bottomhalf.png", b.rightBot.x, b.rightBot.y);
    add("field_border_bottom.png", b.bottom.x, b.bottom.y);
  }

  private addDrawnFrame(): void {
    const { totalW, totalH } = FRAME;
    const g = new Graphics();
    g.roundRect(0, 0, totalW, totalH, 14).stroke({
      color: 0x6de0ff,
      width: 6,
      alpha: 0.7,
    });
    g.roundRect(3, 3, totalW - 6, totalH - 6, 12).stroke({
      color: 0x214a86,
      width: 10,
      alpha: 0.9,
    });
    this.addChild(g);
  }
}
