import { type SoundName, SOUNDS } from "./config";

// Vite-native asset resolution: eagerly resolve every wav in ../assets/sound
// to a build-safe URL. This works in `vite dev` AND `vite build` (the files
// are emitted + fingerprinted). Keyed by bare filename ("move.wav" -> url).
const WAV_URLS = import.meta.glob("../assets/sound/*.wav", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

function urlFor(file: string): string | undefined {
  const hit = Object.entries(WAV_URLS).find(([p]) => p.endsWith("/" + file));
  return hit?.[1];
}

// Lightweight WebAudio sound bank. Keeps the original .wav assets.
export class SoundBank {
  private ctx: AudioContext | null = null;
  private buffers = new Map<SoundName, AudioBuffer>();
  private muted = false;
  private ready = false;

  async load(): Promise<void> {
    try {
      this.ctx = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      )();
    } catch {
      return;
    }
    const entries = Object.entries(SOUNDS) as [SoundName, string][];
    await Promise.all(
      entries.map(async ([name, file]) => {
        const url = urlFor(file);
        if (!url) return;
        try {
          const res = await fetch(url);
          const arr = await res.arrayBuffer();
          const buf = await this.ctx!.decodeAudioData(arr);
          this.buffers.set(name, buf);
        } catch {
          /* ignore missing sound */
        }
      }),
    );
    this.ready = true;
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
  }
  isMuted() {
    return this.muted;
  }

  play(name: SoundName, volume = 1) {
    if (!this.ready || this.muted || !this.ctx) return;
    const buf = this.buffers.get(name);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(this.ctx.destination);
    src.start();
  }
}
