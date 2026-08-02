// Liquid droplets sprayed out when puyos pop, using the atlas's
// <color>_particle.png frame. The chain-count popup is handled separately by
// ChainCounter, so this layer is purely cosmetic burst debris.
//
// SHAPE OF THE EFFECT (measured off reference frames of the real game):
//
//   A popping puyo throws a SMALL NUMBER OF FAT DROPLETS - about four - up and
//   out from its two flanks. Each one is born tiny, SWELLS as it is squeezed
//   out, arcs up over a gentle apex, falls, and then SHRINKS AWAY to nothing.
//   The grow-then-shrink is the whole character of the effect: it reads as
//   liquid being extruded and then draining, not as debris being launched. That
//   curve lives in particles.ts (peakScale/birthScale/endScale/peakAt).
//
//   Measured against the reference's cell pitch: droplets peak around 0.45-0.60
//   cell across, and the size spread top-to-bottom is about 4.7x once mist is
//   included. Droplet size correlates NEGATIVELY with how far it has fallen
//   (corr -0.28 between y and diameter) - confirming they are already shrinking
//   on the way down. Isolated, non-overlapping droplets in flight measure only
//   ~0.13 cell, so the fat readings are overlapping clusters near the rupture,
//   not single giant balls.
//
//   The throw is gentle. Droplets rise a little above the cell, then settle
//   down. This is NOT a high-pressure sideways jet and NOT a 360-degree ring.
//
// Revisions of this file got it wrong several times, worth keeping on record:
//   - an even radial ring (read as a symmetric cog, no left/right structure);
//   - near-zero gravity with heavy drag (droplets parked in mid air as a clump);
//   - droplets ~4x too small (read as dust rather than liquid);
//   - 20 droplets per puyo (read as a firehose - the reference throws ~4);
//   - one giant 1.5-cell blob per flank (mis-measured overlapping clusters as
//     a single droplet, so it dwarfed the puyo).
// If it looks wrong again, check DROP_CLASSES and the swell constants first.
import { Container, Sprite } from "pixi.js";

import { SCALE_X, SCALE_Y } from "../lib/config";
import { frame, particleFrame } from "./assets";
import { cellX, cellY } from "./coords";
import { updateParticles } from "./particles";

import type { Color } from "../lib/types";
import type { Particle } from "./particles";

/** One size class of droplet. `count` is per FLANK, and there are two flanks
 *  per puyo, so a puyo emits 2 * sum(count) droplets.
 *
 *  peak      PEAK diameter in CELLS - the fully-swollen size, not the birth
 *            size. Droplets are born at BIRTH_SCALE of this. Reference peak for
 *            the main droplets is ~0.45-0.60 cell.
 *  peakVar   added to peak as a uniform random roll.
 *  speed     initial launch speed, px/frame, before the outward/up split.
 *  life      frames alive before the +/- LIFE_JITTER roll.
 *  peakAt    fraction of life at which it reaches full size. Small = snaps out
 *            fast then drains slowly.
 *  delay     frames before it appears, so the burst_0/burst_1 sprite under it
 *            reads first.
 *
 *  Keep the counts LOW. Four main droplets per puyo is the target look; the
 *  mist class is a light garnish, not a second spray. */
interface DropClass {
  count: number;
  peak: number;
  peakVar: number;
  speed: number;
  speedVar: number;
  life: number;
  peakAt: number;
  delay: number;
}

const DROP_CLASSES: DropClass[] = [
  // The four main droplets: two per flank. These ARE the effect.
  {
    count: 2,
    peak: 0.66,
    peakVar: 0.16,
    speed: 4.0,
    speedVar: 0.8,
    life: 38,
    peakAt: 0.26,
    delay: 1,
  },
  // A couple of small satellites per flank, for a bit of scale variety.
  {
    count: 2,
    peak: 0.17,
    peakVar: 0.1,
    speed: 4.3,
    speedVar: 1.0,
    life: 29,
    peakAt: 0.2,
    delay: 0,
  },
];

/** Droplets emitted per popped puyo (both flanks). Exported for the perf note:
 *  a large chain multiplies this by the number of cleared puyos. */
export const DROPS_PER_PUYO = 2 * DROP_CLASSES.reduce((n, d) => n + d.count, 0);

/** Cell pitch in px, measured from the grid mapping rather than hardcoded, so
 *  offsets and droplet sizes stay proportional at any zoom or skin. Rows and
 *  columns are sampled separately because their pitch can differ. */
let cellPitch: { x: number; y: number } | null = null;
function pitch(): { x: number; y: number } {
  // Resolved on first burst, not at module load, so this does not depend on
  // whether coords/config finished initialising when this module was imported.
  cellPitch ??= {
    x: Math.abs(cellX(1) - cellX(0)),
    y: Math.abs(cellY(1) - cellY(0)),
  };
  return cellPitch;
}

/** Sprite scale that renders `diam` CELLS wide, derived from the texture's own
 *  pixel size. Doing this by texture avoids assuming particle.png is packed at
 *  the same native size as a puyo frame: SCALE_X only maps a *puyo-sized* frame
 *  onto one cell, so reusing it for a differently-sized particle frame
 *  silently mis-scales every droplet. Falls back to the SCALE_X convention if
 *  the texture has no size yet (e.g. Texture.EMPTY from a missing atlas). */
function dropScale(
  texW: number,
  texH: number,
  diam: number,
): { x: number; y: number } {
  const { x: cellW, y: cellH } = pitch();
  if (texW > 0 && texH > 0 && cellW > 0 && cellH > 0) {
    return { x: (diam * cellW) / texW, y: (diam * cellH) / texH };
  }
  return { x: SCALE_X * diam, y: SCALE_Y * diam };
}

/** Horizontal offset of each emission point from the cell centre, in cells. */
const FLANK_X = 0.26;
/** Vertical offset of the emission points, in cells. Negative = above centre:
 *  droplets are thrown from the puyo's upper flanks. */
const FLANK_Y = -0.16;
/** Random scatter of the emission point, in cells. Small, so each flank still
 *  reads as one rupture rather than a wide seam. */
const FLANK_JITTER = 0.07;
/** Launch angle above horizontal, in radians (~63deg). The throw is UP and out,
 *  not sideways: droplets rise over an apex and then fall. Solved together with
 *  GRAVITY and `speed` for a ~0.4 cell rise and ~0.9 cell lateral drift. */
const LAUNCH_ANGLE = 1.1;
/** Random deviation from LAUNCH_ANGLE, in radians (~17deg). */
const ANGLE_JITTER = 0.3;
/** Downward acceleration, px/frame^2. Tuned with `speed` so a main droplet
 *  rises about 0.4 cell before falling back roughly 1.4 cells. */
const GRAVITY = 0.3;
/** Per-frame velocity retention. Near 1: droplets are still moving when they
 *  shrink out, so nothing parks in mid-air. */
const DRAG = 0.985;
/** Random lifetime spread, as a fraction of the class's life, so the group
 *  breaks up instead of vanishing on a single frame. */
const LIFE_JITTER = 0.18;
/** Fraction of PEAK size at birth. Small: the droplet emerges as a bead and
 *  swells outward. */
const BIRTH_SCALE = 0.22;
/** Fraction of PEAK size at death. Near zero: it drains to nothing rather than
 *  popping out at full size. */
const END_SCALE = 0.1;
/** Fraction of life held at full alpha before the fade begins. High, because
 *  the shrink already carries the disappearance - fading too early makes the
 *  swell invisible. */
const HOLD_ALPHA = 0.55;
/** Random spread added to each class's delay, in frames, so a flank spits a
 *  short stream rather than one simultaneous puff. */
const DELAY_JITTER = 3;

export class FxLayer extends Container {
  private particles: Particle[] = [];

  spawnBurst(cells: { r: number; c: number; color: Color }[]): void {
    for (const { r, c, color } of cells) {
      const tex = frame(particleFrame(color));
      const ox = cellX(c);
      const oy = cellY(r);
      const { x: cellW, y: cellH } = pitch();

      // Two emission points: one on each upper flank.
      for (const dir of [-1, 1] as const) {
        for (const cls of DROP_CLASSES) {
          for (let k = 0; k < cls.count; k++) {
            const diam = cls.peak + Math.random() * cls.peakVar;
            const peak = dropScale(tex.width, tex.height, diam);

            const sp = new Sprite(tex);
            sp.anchor.set(0.5);
            // particles.ts owns scale from here on; this is only so frame one
            // is not mis-sized before the first update runs.
            sp.scale.set(peak.x * BIRTH_SCALE, peak.y * BIRTH_SCALE);
            sp.x =
              ox +
              dir * FLANK_X * cellW +
              (Math.random() - 0.5) * 2 * FLANK_JITTER * cellW;
            sp.y =
              oy +
              FLANK_Y * cellH +
              (Math.random() - 0.5) * 2 * FLANK_JITTER * cellH;
            sp.visible = false;
            this.addChild(sp);

            // Throw up and outward; gravity supplies the arc back down.
            const ang = LAUNCH_ANGLE + (Math.random() - 0.5) * 2 * ANGLE_JITTER;
            const spd = cls.speed + Math.random() * cls.speedVar;
            this.particles.push({
              sprite: sp,
              vx: dir * spd * Math.cos(ang),
              vy: -spd * Math.sin(ang),
              life: 0,
              max: cls.life * (1 + (Math.random() - 0.5) * 2 * LIFE_JITTER),
              delay: cls.delay + Math.random() * DELAY_JITTER,
              drag: DRAG,
              spin: 0,
              gravity: GRAVITY,
              peakScaleX: peak.x,
              peakScaleY: peak.y,
              birthScale: BIRTH_SCALE,
              endScale: END_SCALE,
              peakAt: cls.peakAt,
              holdAlpha: HOLD_ALPHA,
            });
          }
        }
      }
    }
  }

  /** Advance particle animation. dt is in frames (~1 at 60fps). */
  update(dt: number): void {
    updateParticles(this, this.particles, dt);
  }
}
