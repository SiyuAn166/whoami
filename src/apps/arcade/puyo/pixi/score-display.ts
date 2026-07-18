// Score readout that sits on the bottom tray of the field frame. Rendered with
// a bold Pixi Text (no extra bitmap-font asset required).
import { Container, Text } from "pixi.js";

export class ScoreDisplay extends Container {
  private scoreLabel: Text;

  constructor() {
    super();
    this.scoreLabel = new Text({
      text: "0",
      style: {
        fontFamily: "'Trebuchet MS', system-ui, sans-serif",
        fontSize: 34,
        fontWeight: "900",
        fill: 0xffffff,
        stroke: { color: 0x0a1830, width: 5 },
        letterSpacing: 2,
      },
    });
    this.scoreLabel.anchor.set(0, 0.5);
    this.addChild(this.scoreLabel);
  }

  setScore(n: number): void {
    // Classic Puyo score readout: zero-padded to 8 digits, no separators.
    this.scoreLabel.text = Math.max(0, Math.floor(n))
      .toString()
      .padStart(8, "0");
  }
}
