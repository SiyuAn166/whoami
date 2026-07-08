// Sound engine for Tetris — backed by the .wav assets in ./assets/sound.
// Uses the Web Audio API for low-latency, overlapping playback (polyphony),
// so rapid rotates / clears never cut each other off.
import type { ClearType } from "./engine";

import allclearUrl from "./assets/sound/allclear.wav";
import dropUrl from "./assets/sound/drop.wav";
import dropdownUrl from "./assets/sound/dropdown.wav";
import hardDropUrl from "./assets/sound/harddrop.wav";
import holdUrl from "./assets/sound/hold.wav";
import moveUrl from "./assets/sound/move.wav";
import rotateUrl from "./assets/sound/rotate.wav";
import singleUrl from "./assets/sound/singleline.wav";
import tetrisUrl from "./assets/sound/tetris.wav";
import tspin2Url from "./assets/sound/tspin2.wav";
import tspin3Url from "./assets/sound/tspin3.wav";

type SfxName =
  | "move"
  | "hold"
  | "rotate"
  | "harddrop"
  | "drop"
  | "dropdown"
  | "single"
  | "tetris"
  | "tspin2"
  | "tspin3"
  | "allclear";

const SRC: Record<SfxName, string> = {
  move: moveUrl,
  hold: holdUrl,
  rotate: rotateUrl,
  harddrop: hardDropUrl,
  drop: dropUrl,
  dropdown: dropdownUrl,
  single: singleUrl,
  tetris: tetrisUrl,
  tspin2: tspin2Url,
  tspin3: tspin3Url,
  allclear: allclearUrl,
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let volume = 0.7;

const buffers = new Map<SfxName, AudioBuffer>();
const pending = new Map<SfxName, Promise<AudioBuffer | null>>();

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

function load(name: SfxName): Promise<AudioBuffer | null> {
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
  (Object.keys(SRC) as SfxName[]).forEach((n) => void load(n));
}

function play(name: SfxName, gain = 1): void {
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
const MOVE_MIN_GAP = 40;
let lastMoveAt = 0;
export function sfxMove(): void {
  const now = performance.now();
  if (now - lastMoveAt < MOVE_MIN_GAP) return;
  lastMoveAt = now;
  play("move", 0.15);
}
const DROP_MIN_GAP = 40;
let lastDropAt = 0;
export function sfxDrop(): void {
  const now = performance.now();
  if (now - lastDropAt < DROP_MIN_GAP) return;
  lastDropAt = now;
  play("drop", 0.5);
}
export function sfxDropdown(): void {
  play("dropdown", 0.6);
}
export function sfxRotate(): void {
  play("rotate", 0.7);
}
export function sfxHardDrop(): void {
  play("harddrop", 0.7);
}
export function sfxHold(): void {
  play("hold", 0.45);
}
export function sfxAllClear(): void {
  play("allclear", 0.7);
}

/** Pick the right clip from the engine's ClearType. */
export function sfxClear(clearType: ClearType): void {
  switch (clearType) {
    case "tetris":
      play("tetris");
      return;
    case "tspin-triple":
      play("tspin3");
      return;
    case "tspin":
    case "tspin-mini":
    case "tspin-single":
    case "tspin-double":
    case "tspin-mini-single":
    case "tspin-mini-double":
      play("tspin2");
      return;
    case "allclear":
      play("allclear");
      return;
    default:
      // single / double / triple (no T-spin) and any fallback
      play("single");
      return;
  }
}
