// Shared scatter-debris particle helper. Used by both FxLayer (puyo pops) and
// ControlPanel (the restart-button burst), which previously carried identical
// copies of this struct + update loop.
import { Container, Sprite } from "pixi.js";

export interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  life: number;
  max: number;
}

/** Downward acceleration applied to vy each frame (px/frame^2). */
const PARTICLE_GRAVITY = 0.24;
/** Sprite spin applied each frame (rad/frame). */
const PARTICLE_SPIN = 0.15;

/**
 * Advance a particle array in place, fading + spinning each sprite and
 * removing dead ones from `parent`. `dt` is in frames (~1 at 60fps).
 */
export function updateParticles(
  parent: Container,
  particles: Particle[],
  dt: number,
): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life += dt;
    p.sprite.x += p.vx * dt;
    p.sprite.y += p.vy * dt;
    p.vy += PARTICLE_GRAVITY * dt;
    p.sprite.alpha = Math.max(0, 1 - p.life / p.max);
    p.sprite.rotation += PARTICLE_SPIN * dt;
    if (p.life >= p.max) {
      parent.removeChild(p.sprite);
      p.sprite.destroy();
      particles.splice(i, 1);
    }
  }
}
