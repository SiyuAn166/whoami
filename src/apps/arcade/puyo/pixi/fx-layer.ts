// Scatter particles thrown out when puyos pop. The chain-count popup is handled
// separately by ChainCounter, so this layer is purely cosmetic burst debris.
import { Container, Sprite } from "pixi.js";

import { SCALE_X, SCALE_Y } from "../lib/config";
import { frame, particleFrame } from "./assets";
import { cellX, cellY } from "./coords";
import { updateParticles } from "./particles";

import type { Color } from "../lib/types";
import type { Particle } from "./particles";

/** Shards thrown per popped puyo. Higher reads as a real shatter; the old
 *  value of 4 looked like a spinning cross. */
const SHARDS_PER_PUYO = 9;
/** Shard sprite scale, as a fraction of a full cell.
 *  Range is deliberately wide (0.16 -> 0.62, ~3.9x) so the cloud reads as a
 *  few big chunks plus a spray of fine specks rather than uniform dots. */
const SHARD_SCALE_MIN = 0.16;
const SHARD_SCALE_VAR = 0.46;
/** Size distribution bias. Random is raised to this power before scaling, so
 *  values >1 push most shards small and leave a few large ones.
 *  1 = uniform sizes, 3 = mostly specks with rare big chunks. */
const SHARD_SCALE_BIAS = 2.1;
/** How much small shards outrun big ones. 0 = size does not affect speed,
 *  1 = the smallest shards fly at double the base speed. */
const SHARD_SIZE_SPEED = 0.75;
/** Random spawn offset in px so shards do not all start on one pixel. */
const SHARD_SPAWN_JITTER = 8;
/** Random angular wobble (rad) added to the even radial spread. */
const SHARD_ANGLE_JITTER = 0.7;
/** Outward speed in px/frame. */
const SHARD_SPEED_MIN = 2.2;
const SHARD_SPEED_VAR = 2.6;
/** Extra upward kick so debris arcs before gravity pulls it down. */
const SHARD_LIFT = 1.9;
/** Shard lifetime in frames (~1 per frame at 60fps). */
const SHARD_LIFE_MIN = 24;
const SHARD_LIFE_VAR = 14;

export class FxLayer extends Container {
  private particles: Particle[] = [];

  spawnBurst(cells: { r: number; c: number; color: Color }[]): void {
    for (const { r, c, color } of cells) {
      const tex = frame(particleFrame(color));
      for (let i = 0; i < SHARDS_PER_PUYO; i++) {
        const sp = new Sprite(tex);
        sp.anchor.set(0.5);
        // Biased size roll: most shards come out small, a few come out large.
        // t01 is kept so speed and lifetime can be tied to size below.
        const t01 = Math.pow(Math.random(), SHARD_SCALE_BIAS);
        const s = SHARD_SCALE_MIN + t01 * SHARD_SCALE_VAR;
        sp.scale.set(SCALE_X * s, SCALE_Y * s);
        // Start slightly off-centre so all shards are not stacked on one pixel
        // for the first frame.
        sp.x = cellX(c) + (Math.random() - 0.5) * SHARD_SPAWN_JITTER;
        sp.y = cellY(r) + (Math.random() - 0.5) * SHARD_SPAWN_JITTER;
        sp.rotation = Math.random() * Math.PI * 2;
        this.addChild(sp);
        // Even angular spread with jitter: a full radial burst rather than the
        // 4-spoke pattern the old n=4 loop produced.
        const ang =
          (Math.PI * 2 * i) / SHARDS_PER_PUYO +
          (Math.random() - 0.5) * SHARD_ANGLE_JITTER;
        // Small shards fly faster and fade sooner, big chunks travel slower and
        // linger - that size/speed correlation is what makes debris read as
        // real fragments instead of a uniform particle ring.
        const sizeBoost = 1 + (1 - t01) * SHARD_SIZE_SPEED;
        const spd =
          (SHARD_SPEED_MIN + Math.random() * SHARD_SPEED_VAR) * sizeBoost;
        this.particles.push({
          sprite: sp,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - SHARD_LIFT,
          life: 0,
          max:
            (SHARD_LIFE_MIN + Math.random() * SHARD_LIFE_VAR) *
            (0.7 + t01 * 0.5),
        });
      }
    }
  }

  /** Advance particle animation. dt is in frames (~1 at 60fps). */
  update(dt: number): void {
    updateParticles(this, this.particles, dt);
  }
}
