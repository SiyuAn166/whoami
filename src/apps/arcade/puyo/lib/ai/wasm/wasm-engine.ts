// Adapter that makes the native ama wasm module look like the TypeScript
// engines, so the driver can switch to it without special-casing.
//
// This is the ORIGINAL ama C++ beam search (depth 16, width 250, 6 parallel
// queues, GTR/Fron/SGTR forms) compiled to WebAssembly SIMD128.

import { paletteOf, readGrid } from "../core/bridge";
import {
  amaCancelAll,
  amaDeadReason,
  amaIsDead,
  amaIsThreaded,
  amaLastError,
  amaOnDead,
  amaReady,
  amaSetParams,
  initAma,
} from "./ama-client";
import { AmaPipeline } from "./ama-pipeline";

export interface WasmDecision {
  column: number;
  rotation: number;
  eval: number;
  elapsedMs: number;
  threaded: boolean;
  /** True when the answer came from a prediction made during the previous drop. */
  prefetched: boolean;
}

export type WasmPreset = "fast" | "bench" | "spec";

const PRESETS: Record<WasmPreset, { width: number; depth: number }> = {
  // The native build is fast enough that "spec" is the sensible default; the
  // smaller presets exist only for deliberate A/B against the TS engines.
  fast: { width: 60, depth: 12 },
  bench: { width: 120, depth: 14 },
  spec: { width: 250, depth: 16 },
};

let preset: WasmPreset = "spec";
const pipeline = new AmaPipeline();

/** Drop any prefetched plan. Call on reset / seed change / game over. */
export function invalidate(): void {
  pipeline.invalidate();
  amaCancelAll();
}

/** Prefetch hit/miss counters, for diagnostics. */
export function pipelineStats(): { hits: number; misses: number } {
  return pipeline.stats;
}

export async function load(): Promise<boolean> {
  const ok = await initAma();
  if (ok) applyPreset(preset);
  return ok;
}

export function ready(): boolean {
  return amaReady();
}

export function threaded(): boolean {
  return amaIsThreaded();
}

/** Why the native module failed to load, or "" on success. */
export function lastError(): string {
  return amaLastError();
}

/**
 * True once the worker has died (typically a wasm trap on an unplayable
 * board). The search cannot recover; the driver should disengage.
 */
export function dead(): boolean {
  return amaIsDead();
}

export function deadReason(): string {
  return amaDeadReason();
}

/** Registers a callback fired once, when the search dies unrecoverably. */
export function onDead(fn: (reason: string) => void): void {
  amaOnDead(fn);
}

export function applyPreset(p: WasmPreset): void {
  preset = p;
  const cfg = PRESETS[p];
  amaSetParams(cfg.width, cfg.depth, 95000, true);
}

export function currentPreset(): WasmPreset {
  return preset;
}

/**
 * Warm the search for the position as it stands right now, without predicting
 * anything. Call once the module is loaded (page load, seed reset) so the very
 * first move's latency is spent while the board is still stationary, instead of
 * after the player presses start.
 *
 * Safe to call repeatedly: a no-op when a plan is already outstanding.
 */
export function prime(
  grid: unknown,
  cur: readonly [number, number],
  nxt: readonly [number, number],
): void {
  if (!amaReady()) return;

  const board = readGrid(grid);
  const pairs: [number, number][] = [
    [cur[0], cur[1]],
    [nxt[0], nxt[1]],
  ];
  pipeline.prime(board, pairs, paletteOf(board, pairs));
}

/**
 * `grid` is taken as `unknown` on purpose: the live game exposes its board as
 * either a flat array or Cell[][], and readGrid() already normalises both plus
 * validates every cell to 0..5. Demanding the branded Grid type here would
 * only push a cast onto the driver.
 */
export async function decide(
  grid: unknown,
  cur: readonly [number, number],
  nxt: readonly [number, number],
): Promise<WasmDecision | null> {
  if (!amaReady()) return null;

  const t0 = performance.now();
  const board = readGrid(grid);
  const pairs: [number, number][] = [
    [cur[0], cur[1]],
    [nxt[0], nxt[1]],
  ];
  const palette = paletteOf(board, pairs);

  const out = await pipeline.decide(board, pairs, palette);
  if (out === null) return null;

  return {
    column: out.column,
    rotation: out.rotation,
    eval: out.eval,
    elapsedMs: performance.now() - t0,
    threaded: amaIsThreaded(),
    prefetched: pipeline.lastPrefetched,
  };
}
