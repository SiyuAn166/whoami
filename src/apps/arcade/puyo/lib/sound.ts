// ============================================================================
// Puyo sound system — standalone module, decoupled from game logic.
//   - The game only calls semantic methods: sfx.chain(n) / sfx.placed() /
//     sfx.move() / sfx.spin()
//   - This module owns the filenames, decoding, volume, mute, and unlocking the
//     AudioContext on the first user gesture.
//   - It imports no game files, and the game needs no knowledge of wav names.
// Assets: assets/sound/{1..7,move,placed,spin}.wav  (Vite import.meta.glob)
// ============================================================================

type Name =
  "1" | "2" | "3" | "4" | "5" | "6" | "7" | "move" | "placed" | "spin";

// Vite bundles each wav into a fetchable URL. Keys look like "../assets/sound/3.wav".
const urls = import.meta.glob("../assets/sound/*.wav", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

function urlOf(name: string): string | undefined {
  const hit = Object.entries(urls).find(([p]) => p.endsWith(`/${name}.wav`));
  return hit?.[1];
}

/** Max distinct chain sound: chains >= 7 all use 7.wav. */
const MAX_CHAIN = 7;

class SoundManager {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private buffers = new Map<Name, AudioBuffer>();
  private loading = new Map<Name, Promise<void>>();
  private _muted = false;
  private _volume = 0.7;
  private unlocked = false;

  /** Call on the first user gesture (WebAudio needs a gesture to play). Idempotent. */
  unlock(): void {
    if (this.unlocked) return;
    this.ensureCtx();
    if (this.ctx?.state === "suspended") void this.ctx.resume();
    this.unlocked = true;
  }

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AC();
      this.gain = this.ctx.createGain();
      this.gain.gain.value = this._muted ? 0 : this._volume;
      this.gain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  private async load(name: Name): Promise<void> {
    if (this.buffers.has(name)) return;
    if (this.loading.has(name)) return this.loading.get(name);
    const url = urlOf(name);
    if (!url) return; // missing file: skip silently, do not throw
    const ctx = this.ensureCtx();
    const p = (async () => {
      try {
        const res = await fetch(url);
        const arr = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(arr);
        this.buffers.set(name, buf);
      } catch {
        /* decode failure: stay silent */
      } finally {
        this.loading.delete(name);
      }
    })();
    this.loading.set(name, p);
    return p;
  }

  /** Preload everything; nice to call at boot (optional — play lazy-loads). */
  preload(): void {
    (
      ["1", "2", "3", "4", "5", "6", "7", "move", "placed", "spin"] as Name[]
    ).forEach((n) => void this.load(n));
  }

  private playName(name: Name): void {
    if (this._muted) return;
    const ctx = this.ctx;
    const buf = this.buffers.get(name);
    if (!ctx || !buf || !this.gain) {
      void this.load(name); // not loaded yet: kick off loading, skip this play
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.gain);
    src.start();
  }

  // ---- Semantic interface (the game only uses these four) -------------

  /** Chain step n (1-based). n > 7 all use 7. */
  chain(n: number): void {
    const clamped = Math.max(1, Math.min(MAX_CHAIN, Math.floor(n)));
    this.playName(String(clamped) as Name);
  }

  placed(): void {
    this.playName("placed");
  }
  move(): void {
    this.playName("move");
  }
  spin(): void {
    this.playName("spin");
  }

  // ---- Settings -------------------------------------------------------

  get muted(): boolean {
    return this._muted;
  }
  setMuted(m: boolean): void {
    this._muted = m;
    if (this.gain) this.gain.gain.value = m ? 0 : this._volume;
  }
  toggleMuted(): boolean {
    this.setMuted(!this._muted);
    return this._muted;
  }
  setVolume(v: number): void {
    this._volume = Math.max(0, Math.min(1, v));
    if (this.gain && !this._muted) this.gain.gain.value = this._volume;
  }
}

/** Singleton: the whole game shares one sound system. */
export const sfx = new SoundManager();
