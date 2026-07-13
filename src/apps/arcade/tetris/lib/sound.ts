// Sound engine for Tetris — backed by the .wav assets in ./assets/sound.
// Uses the Web Audio API for low-latency, overlapping playback (polyphony),
// so rapid rotates / clears never cut each other off.
import {
  CLEAR_ALLCLEAR,
  CLEAR_TETRIS,
  CLEAR_TSPIN,
  CLEAR_TSPIN_DOUBLE,
  CLEAR_TSPIN_MINI,
  CLEAR_TSPIN_MINI_DOUBLE,
  CLEAR_TSPIN_MINI_SINGLE,
  CLEAR_TSPIN_SINGLE,
  CLEAR_TSPIN_TRIPLE,
  GAIN_ALLCLEAR,
  GAIN_DROP,
  GAIN_DROPDOWN,
  GAIN_HARDDROP,
  GAIN_HOLD,
  GAIN_MOVE,
  GAIN_ROTATE,
  SOUND_RETRIGGER_MIN_GAP_MS,
  type ClearType,
} from "./config";

import allclearUrl from "../assets/sound/allclear.wav";
import dropUrl from "../assets/sound/drop.wav";
import dropdownUrl from "../assets/sound/dropdown.wav";
import hardDropUrl from "../assets/sound/harddrop.wav";
import holdUrl from "../assets/sound/hold.wav";
import moveUrl from "../assets/sound/move.wav";
import rotateUrl from "../assets/sound/rotate.wav";
import singleUrl from "../assets/sound/singleline.wav";
import tetrisUrl from "../assets/sound/tetris.wav";
import tspin2Url from "../assets/sound/tspin2.wav";
import tspin3Url from "../assets/sound/tspin3.wav";

const SOUND = {
  move: "move",
  hold: "hold",
  rotate: "rotate",
  harddrop: "harddrop",
  drop: "drop",
  dropdown: "dropdown",
  single: "single",
  tetris: "tetris",
  tspin2: "tspin2",
  tspin3: "tspin3",
  allclear: "allclear",
} as const;

type SoundName = (typeof SOUND)[keyof typeof SOUND];

const SRC: Record<SoundName, string> = {
  [SOUND.move]: moveUrl,
  [SOUND.hold]: holdUrl,
  [SOUND.rotate]: rotateUrl,
  [SOUND.harddrop]: hardDropUrl,
  [SOUND.drop]: dropUrl,
  [SOUND.dropdown]: dropdownUrl,
  [SOUND.single]: singleUrl,
  [SOUND.tetris]: tetrisUrl,
  [SOUND.tspin2]: tspin2Url,
  [SOUND.tspin3]: tspin3Url,
  [SOUND.allclear]: allclearUrl,
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let volume = 0.7;

const buffers = new Map<SoundName, AudioBuffer>();
const pending = new Map<SoundName, Promise<AudioBuffer | null>>();

function ac(): AudioContext {
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
  }
  // Browsers start the context suspended until a user gesture.
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function load(name: SoundName): Promise<AudioBuffer | null> {
  const cached = buffers.get(name);
  if (cached) return Promise.resolve(cached);
  const inflight = pending.get(name);
  if (inflight) return inflight;
  const p = (async () => {
    try {
      const a = ac();
      const res = await fetch(SRC[name]);
      const arr = await res.arrayBuffer();
      const buf = await a.decodeAudioData(arr);
      buffers.set(name, buf);
      return buf;
    } catch {
      return null; // fail silently — audio is non-essential
    }
  })();
  pending.set(name, p);
  return p;
}

/** Warm up the audio context + decode every clip. Call once on game start
 *  (inside a user-gesture handler such as the START button). */
export function preloadSfx(): void {
  ac();
  (Object.keys(SRC) as SoundName[]).forEach((n) => void load(n));
}

function play(name: SoundName, gain = 1): void {
  if (muted) return;
  const a = ac();
  const fire = (buf: AudioBuffer) => {
    if (muted) return;
    const src = a.createBufferSource();
    src.buffer = buf;
    const g = a.createGain();
    g.gain.value = gain;
    src.connect(g).connect(master!);
    src.start();
  };
  const buf = buffers.get(name);
  if (buf) fire(buf);
  else void load(name).then((b) => b && fire(b)); // lazy on first hit
}

export function setMuted(m: boolean): void {
  muted = m;
}
export function isMuted(): boolean {
  return muted;
}
export function setVolume(v: number): void {
  volume = Math.max(0, Math.min(1, v));
  if (master) master.gain.value = volume;
}

// ---- semantic triggers ----------------------------------------------------
let lastMoveAt = 0;
export function sfxMove(): void {
  const now = performance.now();
  if (now - lastMoveAt < SOUND_RETRIGGER_MIN_GAP_MS) return;
  lastMoveAt = now;
  play(SOUND.move, GAIN_MOVE);
}
let lastDropAt = 0;
export function sfxDrop(): void {
  const now = performance.now();
  if (now - lastDropAt < SOUND_RETRIGGER_MIN_GAP_MS) return;
  lastDropAt = now;
  play(SOUND.drop, GAIN_DROP);
}
export function sfxDropdown(): void {
  play(SOUND.dropdown, GAIN_DROPDOWN);
}
export function sfxRotate(): void {
  play(SOUND.rotate, GAIN_ROTATE);
}
export function sfxHardDrop(): void {
  play(SOUND.harddrop, GAIN_HARDDROP);
}
export function sfxHold(): void {
  play(SOUND.hold, GAIN_HOLD);
}
export function sfxAllClear(): void {
  play(SOUND.allclear, GAIN_ALLCLEAR);
}

/** Pick the right clip from the engine's ClearType. */
export function sfxClear(clearType: ClearType): void {
  switch (clearType) {
    case CLEAR_TETRIS:
      play(SOUND.tetris);
      return;
    case CLEAR_TSPIN_TRIPLE:
      play(SOUND.tspin3);
      return;
    case CLEAR_TSPIN:
    case CLEAR_TSPIN_MINI:
    case CLEAR_TSPIN_SINGLE:
    case CLEAR_TSPIN_DOUBLE:
    case CLEAR_TSPIN_MINI_SINGLE:
    case CLEAR_TSPIN_MINI_DOUBLE:
      play(SOUND.tspin2);
      return;
    case CLEAR_ALLCLEAR:
      play(SOUND.allclear);
      return;
    default:
      // single / double / triple (no T-spin) and any fallback
      play(SOUND.single);
      return;
  }
}
