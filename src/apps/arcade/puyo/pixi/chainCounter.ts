// Chain-count popup using the chain_font.png atlas ("N 連鎖" style), mirroring
// puyosim-gg's chain-counter slide-in animation (velocity 10, accel -2). Falls
// back to a plain bold Text label when the chain font isn't present.
import { Container, Sprite, Text } from "pixi.js";
import { chainFrame, hasChainFont } from "./assets";

export class ChainCounter extends Container {
  private inner = new Container();
  private firstDigit = new Sprite();
  private secondDigit = new Sprite();
  private chainText = new Sprite();
  private fallback: Text;
  private velocity = 0;
  private readonly accel = -2;
  private holdMs = 0;

  constructor() {
    super();
    this.addChild(this.inner);

    for (const s of [this.firstDigit, this.secondDigit, this.chainText]) {
      s.scale.set(0.85);
      s.visible = false;
      this.inner.addChild(s);
    }
    this.secondDigit.x = 40;
    this.chainText.x = 84;
    this.chainText.y = 8;

    this.fallback = new Text({
      text: "",
      style: {
        fontFamily: "system-ui, sans-serif",
        fontSize: 34,
        fontWeight: "900",
        fill: 0xffe14d,
        stroke: { color: 0x2a1a00, width: 6 },
      },
    });
    this.fallback.visible = false;
    this.addChild(this.fallback);
  }

  /** Show an N-chain popup. */
  show(chain: number): void {
    if (chain < 1) return;
    this.holdMs = 900;
    this.inner.x = -30;
    this.velocity = 10;

    if (hasChainFont()) {
      this.fallback.visible = false;
      this.chainText.texture = chainFrame("chain_text.png");
      this.chainText.visible = true;
      if (chain < 10) {
        this.firstDigit.visible = false;
        this.secondDigit.visible = true;
        this.secondDigit.texture = chainFrame(`chain_${chain}.png`);
      } else {
        const str = chain.toString();
        this.firstDigit.visible = true;
        this.secondDigit.visible = true;
        this.firstDigit.texture = chainFrame(`chain_${str[0]}.png`);
        this.secondDigit.texture = chainFrame(`chain_${str[1]}.png`);
      }
    } else {
      this.firstDigit.visible = false;
      this.secondDigit.visible = false;
      this.chainText.visible = false;
      this.fallback.text = `${chain} chain`;
      this.fallback.visible = true;
      this.fallback.alpha = 1;
    }
  }

  hideNow(): void {
    this.holdMs = 0;
    this.firstDigit.visible = false;
    this.secondDigit.visible = false;
    this.chainText.visible = false;
    this.fallback.visible = false;
  }

  /** dt in frames (~1 @ 60fps), ms is the elapsed milliseconds. */
  update(dt: number, ms: number): void {
    // slide-in
    if (this.inner.x < 0) {
      this.inner.x += this.velocity * dt;
      this.velocity = Math.max(this.velocity + this.accel * dt, 0);
      if (this.inner.x > 0) this.inner.x = 0;
    }
    if (this.holdMs > 0) {
      this.holdMs -= ms;
      if (this.holdMs <= 0) this.hideNow();
    }
  }
}
