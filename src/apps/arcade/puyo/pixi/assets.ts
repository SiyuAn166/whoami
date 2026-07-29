// Loads the spritesheets used by the Puyo app:
//   - puyo_aqua.png  + puyo.json        (the puyo pieces; shared Nexus atlas)
//   - layout.png     + layout.json      (the field frame / next window borders)
//   - chain_font.png + chain_font.json  (the chain-count popup digits)
//   - button.png     + button.json      (Practice/Play toggle + Restart icons)
//
// All files live in ../assets and are bundled by Vite via import.meta.url, so
// the folder drops in with no /public and no tsconfig flags. puyo.json's
// meta.image points at another skin, so we bind its frames to puyo_aqua.png.

import { Assets, Rectangle, Spritesheet, Texture } from "pixi.js";

import { COLOR_KEYS } from "../lib/config";

import type { Color } from "../lib/types";

const aquaUrl = new URL("../assets/puyo_aqua.png", import.meta.url).href;
const puyoAtlasUrl = new URL("../assets/puyo.json", import.meta.url).href;
const layoutUrl = new URL("../assets/layout.png", import.meta.url).href;
const layoutAtlasUrl = new URL("../assets/layout.json", import.meta.url).href;
const chainUrl = new URL("../assets/chain_font.png", import.meta.url).href;
const chainAtlasUrl = new URL("../assets/chain_font.json", import.meta.url)
  .href;
const fieldBgUrl = new URL("../assets/field_lgn.png", import.meta.url).href;
const buttonUrl = new URL("../assets/button.png", import.meta.url).href;
const buttonAtlasUrl = new URL("../assets/button.json", import.meta.url).href;

let puyoSheet: Spritesheet | null = null;
let layoutSheet: Spritesheet | null = null;
let chainSheet: Spritesheet | null = null;
let fieldBgTex: Texture | null = null;
let buttonBase: Texture | null = null;
let buttonData: ButtonJson | null = null;
let loading: Promise<void> | null = null;

// ---- Button spritesheet (Practice/Play toggle + Restart) ------------------
// button.png/.json: pause_play_00..08 (256x256) and restart_00..11 (256x256),
// real RGBA transparency. Loaded by hand (not via Spritesheet) so we can read
// the JSON's own per-frame `duration` and `animations` clips directly — both
// button animations must follow the authored timing/order, not a guess.
interface ButtonFrameEntry {
  frame: { x: number; y: number; w: number; h: number };
  duration: number;
}
interface ButtonJson {
  frames: Record<string, ButtonFrameEntry>;
  animations: Record<string, string[]>;
}

async function buildSheet(
  pngUrl: string,
  jsonUrl: string,
): Promise<Spritesheet> {
  const [base, data] = await Promise.all([
    Assets.load(pngUrl) as Promise<Texture>,
    fetch(jsonUrl).then((r) => r.json()),
  ]);
  const s = new Spritesheet(base, data);
  await s.parse();
  return s;
}

/** Load every atlas. Layout + chain-font are optional: if a file is missing
 *  the app still runs (frame falls back to a drawn placeholder). */
export async function loadAssets(): Promise<void> {
  if (puyoSheet) return;
  if (loading) return loading;
  loading = (async () => {
    puyoSheet = await buildSheet(aquaUrl, puyoAtlasUrl);
    try {
      layoutSheet = await buildSheet(layoutUrl, layoutAtlasUrl);
    } catch {
      layoutSheet = null;
    }
    try {
      chainSheet = await buildSheet(chainUrl, chainAtlasUrl);
    } catch {
      chainSheet = null;
    }
    try {
      fieldBgTex = (await Assets.load(fieldBgUrl)) as Texture;
    } catch {
      fieldBgTex = null;
    }
    try {
      const [base, data] = await Promise.all([
        Assets.load(buttonUrl) as Promise<Texture>,
        fetch(buttonAtlasUrl).then((r) => r.json()) as Promise<ButtonJson>,
      ]);
      buttonBase = base;
      buttonData = data;
    } catch {
      buttonBase = null;
      buttonData = null;
    }
  })();
  return loading;
}

export function hasLayout(): boolean {
  return !!layoutSheet;
}
export function hasChainFont(): boolean {
  return !!chainSheet;
}
export function hasFieldBg(): boolean {
  return !!fieldBgTex;
}
export function hasButtonSheet(): boolean {
  return !!buttonBase && !!buttonData;
}
export function fieldBgTexture(): Texture | null {
  return fieldBgTex;
}

/** Puyo-atlas texture by frame name, e.g. "blue_5.png". Degrades gracefully
 *  (spacer, then EMPTY) if the atlas or the requested frame is missing, matching
 *  layoutFrame/chainFrame. loadAssets() always awaits the puyo atlas before the
 *  stage draws, so a missing atlas here indicates a load ordering bug, not a
 *  normal state — it renders nothing rather than throwing mid-frame. */
export function frame(name: string): Texture {
  if (!puyoSheet) return Texture.EMPTY;
  return (
    puyoSheet.textures[name] ??
    puyoSheet.textures["spacer_0.png"] ??
    Texture.EMPTY
  );
}

/** Layout-atlas texture (field borders, next window). EMPTY if unavailable. */
export function layoutFrame(name: string): Texture {
  return layoutSheet?.textures[name] ?? Texture.EMPTY;
}

const insetCache = new Map<string, Texture>();

/**
 * Layout-atlas texture with one or more edges of its sampled frame shaved
 * inward by a pixel or two. Some layout.json frames are packed edge-to-edge
 * with no padding against a differently-coloured neighbour (e.g.
 * next_border_1p.png sits flush against the blue field_border_left_tophalf
 * strip) — under linear texture filtering that neighbour bleeds through as a
 * thin coloured fringe on the sampled sprite's edge. Moving the sampled UV
 * rect a pixel away from the seam removes the neighbour from the sample
 * entirely; this only trims a sliver of the sprite's own edge, not its
 * apparent on-screen size.
 */
export function layoutFrameNoBleed(
  name: string,
  edges: { left?: number; right?: number; top?: number; bottom?: number },
): Texture {
  const key = `${name}:${edges.left ?? 0},${edges.right ?? 0},${edges.top ?? 0},${edges.bottom ?? 0}`;
  const cached = insetCache.get(key);
  if (cached) return cached;
  const base = layoutFrame(name);
  if (base === Texture.EMPTY) return base;
  const f = base.frame;
  const left = edges.left ?? 0;
  const right = edges.right ?? 0;
  const top = edges.top ?? 0;
  const bottom = edges.bottom ?? 0;
  const tex = new Texture({
    source: base.source,
    frame: new Rectangle(
      f.x + left,
      f.y + top,
      f.width - left - right,
      f.height - top - bottom,
    ),
  });
  insetCache.set(key, tex);
  return tex;
}

/** Chain-font texture (chain_0.png .. chain_9.png, chain_text.png). */
export function chainFrame(name: string): Texture {
  return chainSheet?.textures[name] ?? Texture.EMPTY;
}

const buttonTexCache = new Map<string, Texture>();

/** Button spritesheet frame ("pause_play_00".."pause_play_08",
 *  "restart_00".."restart_11"). Its x/y/w/h come straight from button.json,
 *  not a hardcoded rect. */
export function buttonFrame(name: string): Texture {
  const cached = buttonTexCache.get(name);
  if (cached) return cached;
  if (!buttonBase || !buttonData) return Texture.EMPTY;
  const entry = buttonData.frames[name];
  if (!entry) return Texture.EMPTY;
  const { x, y, w, h } = entry.frame;
  const tex = new Texture({
    source: buttonBase.source,
    frame: new Rectangle(x, y, w, h),
  });
  buttonTexCache.set(name, tex);
  return tex;
}

/** An ordered button animation clip: frame names + their authored per-frame
 *  durations (ms), both read from button.json. */
export interface ButtonClip {
  frames: string[];
  durations: number[];
}

/** "pause_to_play", "play_to_pause" or "restart". null if the atlas failed to
 *  load or doesn't define that clip. */
export function buttonClip(name: string): ButtonClip | null {
  const data = buttonData;
  if (!data) return null;
  const frames = data.animations[name];
  if (!frames) return null;
  const durations = frames.map((f) => data.frames[f]?.duration ?? 83);
  return { frames, durations };
}

/** Frame name for a settled colour + connection mask (0..15). */
export function puyoFrame(color: Color, mask: number): string {
  return `${COLOR_KEYS[color]}_${mask}.png`;
}

/** Burst frame (0 or 1) used during the pop animation. */
export function burstFrame(color: Color, i: 0 | 1): string {
  return `${COLOR_KEYS[color]}_burst_${i}.png`;
}

/** Landing squash/stretch frame name (suffix "h" | "v" | "0"). Falls back to
 *  the plain _0 frame if the skin's atlas lacks the squash frames. */
export function bounceFrame(color: Color, suffix: string): string {
  const name = `${COLOR_KEYS[color]}_${suffix}.png`;
  if (puyoSheet && puyoSheet.textures[name]) return name;
  return `${COLOR_KEYS[color]}_0.png`;
}
