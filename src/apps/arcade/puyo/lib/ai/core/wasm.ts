/**
 * WASM SIMD bridge for the cascade engine.
 *
 * Loads puyosim.wasm (built from wasm/puyosim.c) and exposes the same contract
 * as the JS resolve()/quietSearch(). Verified bit-for-bit against the JS
 * implementations: 12000 random boards and 34288 quiet records match exactly.
 *
 * The module is optional. If it is never initialised, or initialisation fails,
 * every caller silently keeps using the pure-JS path — so the AI works with or
 * without the .wasm file present.
 */

import { CELL_COUNT } from "./geometry";
import { type Board, setWasmResolve, type SimOut } from "./sim";

interface WasmExports {
  memory: WebAssembly.Memory;
  abi_version(): number;
  boards_ptr(): number;
  results_ptr(): number;
  quiet_ptr(): number;
  quiet_remain_ptr(): number;
  palette_ptr(): number;
  batch_cap(): number;
  quiet_cap(): number;
  resolve(): void;
  resolve_batch(n: number): void;
  gravity(): void;
  quiet_search(drop: number, paletteLen: number): number;
}

const ABI = 1;

let ex: WasmExports | null = null;
let bytes: Uint8Array | null = null;
let i32: Int32Array | null = null;
let boardsOff = 0;
let resultsOff = 0;
let quietOff = 0;
let remainOff = 0;
let paletteOff = 0;

/** True once a compatible module is loaded and ready. */
export function wasmReady(): boolean {
  return ex !== null;
}

/**
 * Initialise from a URL, ArrayBuffer, or an already-instantiated module.
 * Returns false (without throwing) when the module is missing or incompatible,
 * so callers can just fall through to the JS path.
 */
export async function initWasm(
  src: string | ArrayBuffer | Uint8Array | WebAssembly.Module,
): Promise<boolean> {
  try {
    let mod: WebAssembly.Module;
    if (src instanceof WebAssembly.Module) {
      mod = src;
    } else if (typeof src === "string") {
      const res = await fetch(src);
      if (!res.ok) return false;
      mod = await WebAssembly.compile(await res.arrayBuffer());
    } else {
      mod = await WebAssembly.compile(src as ArrayBuffer);
    }

    const inst = await WebAssembly.instantiate(mod, {});
    const e = inst.exports as unknown as WasmExports;
    if (typeof e.abi_version !== "function" || e.abi_version() !== ABI)
      return false;

    ex = e;
    const buf = e.memory.buffer;
    bytes = new Uint8Array(buf);
    i32 = new Int32Array(buf);
    boardsOff = e.boards_ptr();
    resultsOff = e.results_ptr();
    quietOff = e.quiet_ptr();
    remainOff = e.quiet_remain_ptr();
    paletteOff = e.palette_ptr();
    setWasmResolve(wasmResolve);
    return true;
  } catch {
    ex = null;
    return false;
  }
}

/** Drop the module and fall back to JS. */
export function disableWasm(): void {
  ex = null;
  bytes = null;
  i32 = null;
  setWasmResolve(null);
}

/**
 * Resolve `b` in place via WASM. Returns false if WASM is unavailable, in
 * which case the caller must use the JS resolve().
 */
export function wasmResolve(b: Board, out: SimOut): boolean {
  if (ex === null || bytes === null || i32 === null) return false;
  bytes.set(b, boardsOff);
  ex.resolve();
  const r = resultsOff >> 2;
  out.chain = i32[r];
  out.cleared = i32[r + 1];
  out.score = i32[r + 2];
  out.firstGroups = i32[r + 3];
  b.set(bytes.subarray(boardsOff, boardsOff + CELL_COUNT));
  return true;
}

export interface WasmQuietRecord {
  chain: number;
  score: number;
  x: number;
  key: number;
  /** Field left standing after the pop. Valid until the next wasm call. */
  remain: Uint8Array;
}

/**
 * Run the probe sweep entirely inside WASM. This is the hot path: it collapses
 * roughly 70 JS/WASM boundary crossings per evaluated node into one call.
 * Returns null when WASM is unavailable.
 */
export function wasmQuietSearch(
  b: Board,
  drop: number,
  palette: readonly number[],
  cb: (r: WasmQuietRecord) => void,
): boolean {
  if (ex === null || bytes === null || i32 === null) return false;

  bytes.set(b, boardsOff);
  const n = palette.length < 8 ? palette.length : 8;
  for (let i = 0; i < n; i++) bytes[paletteOff + i] = palette[i];

  const got = ex.quiet_search(drop, n);
  const base = quietOff >> 2;
  for (let i = 0; i < got; i++) {
    const o = base + i * 5;
    const off = remainOff + i32[o + 4];
    cb({
      chain: i32[o],
      score: i32[o + 1],
      x: i32[o + 2],
      key: i32[o + 3],
      remain: bytes.subarray(off, off + CELL_COUNT),
    });
  }
  return true;
}
