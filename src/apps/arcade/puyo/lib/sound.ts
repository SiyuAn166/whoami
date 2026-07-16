// ============================================================================
// Puyo 聲系 — 獨立模組，與遊戲邏輯解耦。
//   - 遊戲只呼語義法: sfx.chain(n) / sfx.placed() / sfx.move() / sfx.spin()
//   - 聲系自曉檔名、自管解碼、音量、靜音、首次手勢解鎖 AudioContext。
//   - 不 import 任何遊戲檔; 遊戲亦不需知任何 wav 名。
// 資產: assets/sound/{1..7,move,placed,spin}.wav  (Vite import.meta.glob)
// ============================================================================

type Name =
  "1" | "2" | "3" | "4" | "5" | "6" | "7" | "move" | "placed" | "spin";

// Vite: 打包時把每個 wav 轉成可取之 URL。鍵形如 "../assets/sound/3.wav"。
const urls = import.meta.glob("../assets/sound/*.wav", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

function urlOf(name: string): string | undefined {
  const hit = Object.entries(urls).find(([p]) => p.endsWith(`/${name}.wav`));
  return hit?.[1];
}

/** 連鎖聲上限: 7 以上皆用 7.wav。 */
const MAX_CHAIN = 7;

class SoundManager {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private buffers = new Map<Name, AudioBuffer>();
  private loading = new Map<Name, Promise<void>>();
  private _muted = false;
  private _volume = 0.7;
  private unlocked = false;

  /** 首次使用者手勢時呼 (WebAudio 需手勢方能出聲)。可多次呼,冪等。 */
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
    if (!url) return; // 缺檔則靜默略過,不擲錯
    const ctx = this.ensureCtx();
    const p = (async () => {
      try {
        const res = await fetch(url);
        const arr = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(arr);
        this.buffers.set(name, buf);
      } catch {
        /* 解碼失敗則靜默 */
      } finally {
        this.loading.delete(name);
      }
    })();
    this.loading.set(name, p);
    return p;
  }

  /** 預載全部,宜於開局呼 (非必須,play 會惰載)。 */
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
      void this.load(name); // 尚未載好: 觸發載入,此次略過
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.gain);
    src.start();
  }

  // ---- 語義介面 (遊戲只用此四法) --------------------------------------

  /** 連鎖第 n 段 (1 起)。n>7 皆用 7。 */
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

  // ---- 設定 -----------------------------------------------------------

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

/** 單例。全遊戲共用一聲系。 */
export const sfx = new SoundManager();
