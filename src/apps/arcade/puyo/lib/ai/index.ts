/**
 * ProPuyoAI — native ama entry point.
 *
 * The AI itself is the ORIGINAL citrus610/ama C++ beam search (depth 16,
 * width 250, six fixed colour queues, 14-term evaluation with GTR/FRON/SGTR
 * form matching) compiled to WebAssembly SIMD128. Nothing here re-implements
 * it; this package only supplies the plumbing around it:
 *
 *   core/geometry — board dimensions and the engine's scoring tables
 *   core/sim      — the pure-functional simulator (cascade, gravity, moves)
 *   core/bridge   — React glue: normalise `Cell[][]`, infer the palette
 *   core/wasm     — optional wasm cascade accelerator for the simulator
 *   wasm/         — worker + pipeline + adapter around the native module
 *
 * `core/sim` is not vestigial: the prefetch pipeline replays moves locally to
 * predict the next board, so the simulator is a live runtime dependency of the
 * wasm path.
 *
 * Typical use is via the adapter, which owns the worker and the pipeline:
 *
 *     import * as nativeAma from "./ai/wasm/wasm-engine";
 *     await nativeAma.load();
 *     const mv = await nativeAma.decide(grid, cur, next);
 *
 * NOTE: `wasm/ama-worker` is intentionally NOT re-exported. It is a worker
 * entry point with top-level side effects and must only ever be reached
 * through `new Worker(...)` inside ama-client.
 */

export * from "./core/bridge";
export * from "./core/geometry";
export * from "./core/sim";
export * from "./core/wasm";
export {
  amaCancelAll,
  amaIsThreaded,
  amaLastError,
  type AmaMove,
  amaReady,
  amaSetParams,
  initAma,
} from "./wasm/ama-client";
export { AmaPipeline } from "./wasm/ama-pipeline";
export * as nativeAma from "./wasm/wasm-engine";
export { type WasmDecision, type WasmPreset } from "./wasm/wasm-engine";
