// Loads the three self-contained spritesheets used by the Puyo app:
//   - puyo_aqua.png  + puyo.json        (the puyo pieces; shared Nexus atlas)
//   - layout.png     + layout.json      (the field frame / next window borders)
//   - chain_font.png + chain_font.json  (the chain-count popup digits)
//
// All six files live in ../assets and are bundled by Vite via import.meta.url,
// so the folder drops in with no /public and no tsconfig flags. puyo.json's
// meta.image points at another skin, so we bind its frames to puyo_aqua.png.

import { Assets, Spritesheet, Texture } from "pixi.js";

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

let puyoSheet: Spritesheet | null = null;
let layoutSheet: Spritesheet | null = null;
let chainSheet: Spritesheet | null = null;
let fieldBgTex: Texture | null = null;
let loading: Promise<void> | null = null;

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
export function fieldBgTexture(): Texture | null {
  return fieldBgTex;
}

/** Puyo-atlas texture by frame name, e.g. "blue_5.png". Falls back to spacer. */
export function frame(name: string): Texture {
  if (!puyoSheet)
    throw new Error("Atlas not loaded — call loadAssets() first.");
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

/** Chain-font texture (chain_0.png .. chain_9.png, chain_text.png). */
export function chainFrame(name: string): Texture {
  return chainSheet?.textures[name] ?? Texture.EMPTY;
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
