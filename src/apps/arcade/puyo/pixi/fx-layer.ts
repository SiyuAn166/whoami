// Scatter particles thrown out when puyos pop. The chain-count popup is handled
// separately by ChainCounter, so this layer is purely cosmetic burst debris.
import { Container, Sprite } from "pixi.js";

import { SCALE_X, SCALE_Y } from "../lib/config";
import { frame, puyoFrame } from "./assets";
import { cellX, cellY } from "./coords";
import { updateParticles } from "./particles";

import type { Color } from "../lib/types";
import type { Particle } from "./particles";

export class FxLayer extends Container {
  private particles: Particle[] = [];

  spawnBurst(cells: { r: number; c: number; color: Color }[]): void {
    for (const { r, c, color } of cells) {
      const n = 4;
      for (let i = 0; i < n; i++) {
        const sp = new Sprite(frame(puyoFrame(color, 0)));
        sp.anchor.set(0.5);
        sp.scale.set(SCALE_X * 0.42, SCALE_Y * 0.42);
        sp.x = cellX(c);
        sp.y = cellY(r);
        this.addChild(sp);
        const ang = (Math.PI * 2 * i) / n + Math.random() * 0.6;
        const spd = 1.8 + Math.random() * 2.0;
        this.particles.push({
          sprite: sp,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 1.4,
          life: 0,
          max: 26 + Math.random() * 10,
        });
      }
    }
  }

  /** Advance particle animation. dt is in frames (~1 at 60fps). */
  update(dt: number): void {
    updateParticles(this, this.particles, dt);
  }
}
