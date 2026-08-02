// Shared scatter-debris particle helper. Used by both FxLayer (puyo pops) and
// ControlPanel (the restart-button burst), which previously carried identical
// copies of this struct + update loop.
//
// Everything past `max` is OPTIONAL. Omit it all and a particle behaves exactly
// like the original ballistic model (constant velocity, 0.24 gravity, 0.15
// spin, linear fade), which is what ControlPanel still wants. FxLayer fills the
// optional fields in to get the liquid-droplet motion instead.
import { Container, Sprite } from "pixi.js";

export interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  life: number;
  max: number;

  /** Frames to wait before the sprite becomes visible and starts moving. Lets
   *  one emitter spit a stream instead of one simultaneous puff. */
  delay?: number;
  /** Per-frame velocity retention (1 = none). */
  drag?: number;
  /** Per-frame rotation, rad. Pass 0 for liquid: visible spin makes a droplet
   *  read as a hard shard. */
  spin?: number;
  /** Per-frame downward acceleration override, px/frame^2. */
  gravity?: number;

  /** Scale at the droplet's PEAK, i.e. its fully-swollen size. The sprite is
   *  born much smaller than this and grows into it - see swell/peakAt. */
  peakScaleX?: number;
  peakScaleY?: number;
  /** Fraction of peak scale at birth. */
  birthScale?: number;
  /** Fraction of peak scale at death. */
  endScale?: number;
  /** Fraction of life at which peak scale is reached. */
  peakAt?: number;
  /** Fraction of life held at full alpha before the fade starts. */
  holdAlpha?: number;
}

/** Fallback downward acceleration when `gravity` is unset (px/frame^2). */
const PARTICLE_GRAVITY = 0.24;
/** Fallback sprite spin when `spin` is unset (rad/frame). */
const PARTICLE_SPIN = 0.15;

/**
 * Advance a particle array in place, animating each sprite and removing dead
 * ones from `parent`. `dt` is in frames (~1 at 60fps).
 */
export function updateParticles(
  parent: Container,
  particles: Particle[],
  dt: number,
): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    // Hold the sprite hidden and frozen until its stagger delay elapses.
    if (p.delay !== undefined && p.delay > 0) {
      p.delay -= dt;
      p.sprite.visible = false;
      continue;
    }
    p.sprite.visible = true;

    p.life += dt;
    p.sprite.x += p.vx * dt;
    p.sprite.y += p.vy * dt;
    p.vy += (p.gravity ?? PARTICLE_GRAVITY) * dt;

    if (p.drag !== undefined) {
      const k = Math.pow(p.drag, dt);
      p.vx *= k;
      p.vy *= k;
    }

    const t = Math.min(1, p.life / p.max);

    // SIZE: grow from birthScale up to the peak, then shrink away. This is the
    // whole character of the effect - a droplet swelling as it is squeezed out,
    // then thinning as it drains. Both legs are eased so the peak reads as a
    // brief hold rather than a corner.
    if (p.peakScaleX !== undefined && p.peakScaleY !== undefined) {
      const peakAt = p.peakAt ?? 0.3;
      const b = p.birthScale ?? 0.25;
      const e = p.endScale ?? 0.0;
      let f: number;
      if (t <= peakAt) {
        // Ease-out on the way up: fast initial swell, easing into the peak.
        const u = peakAt > 0 ? t / peakAt : 1;
        f = b + (1 - b) * (1 - (1 - u) * (1 - u));
      } else {
        // Ease-in on the way down: lingers at full size, then drains.
        const u = (t - peakAt) / (1 - peakAt);
        f = 1 + (e - 1) * u * u;
      }
      p.sprite.scale.set(p.peakScaleX * f, p.peakScaleY * f);
    }

    // ALPHA: solid for holdAlpha of life, then fade. Without a hold the droplet
    // is already half-gone by the time it reaches full size.
    const hold = p.holdAlpha ?? 0;
    p.sprite.alpha =
      t < hold ? 1 : Math.max(0, 1 - (t - hold) / Math.max(1e-6, 1 - hold));

    p.sprite.rotation += (p.spin ?? PARTICLE_SPIN) * dt;

    if (p.life >= p.max) {
      parent.removeChild(p.sprite);
      p.sprite.destroy();
      particles.splice(i, 1);
    }
  }
}
