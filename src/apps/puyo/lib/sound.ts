// ============================================================================
// Puyo sound — self-contained Web Audio synth (no asset files). Low-latency
// oscillator one-shots for move / rotate / drop / land / chain pops. Chain pops
// rise in pitch with the chain index for that classic escalating feel.
// ============================================================================
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

function ac(): AudioContext {
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Warm up the audio context. Call from a user gesture (START). */
export function preloadSfx(): void {
  ac();
}

export function setMuted(m: boolean): void {
  muted = m;
}
export function isMuted(): boolean {
  return muted;
}

function blip(
  freq: number,
  dur: number,
  type: OscillatorType,
  gain: number,
): void {
  if (muted) return;
  const a = ac();
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = a.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master!);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export function sfxMove(): void {
  blip(280, 0.06, "square", 0.12);
}
export function sfxRotate(): void {
  blip(440, 0.07, "square", 0.18);
}
export function sfxDrop(): void {
  blip(180, 0.05, "triangle", 0.14);
}
export function sfxLand(): void {
  blip(120, 0.12, "sine", 0.35);
}
export function sfxHardDrop(): void {
  blip(90, 0.14, "sawtooth", 0.3);
}
/** Rising pop for each chain link. */
export function sfxPop(chain: number): void {
  const base = 420 + Math.min(chain, 12) * 70;
  blip(base, 0.12, "triangle", 0.4);
  blip(base * 1.5, 0.1, "sine", 0.2);
}
export function sfxAllClear(): void {
  [523, 659, 784, 1046].forEach((f, i) =>
    setTimeout(() => blip(f, 0.18, "triangle", 0.4), i * 90),
  );
}
