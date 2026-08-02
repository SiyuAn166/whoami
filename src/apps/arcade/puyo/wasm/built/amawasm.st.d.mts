// Type declaration for the emscripten glue produced by build.sh.
//
// The .mjs itself is generated JavaScript with no types, so TypeScript reports
// TS7016 ("implicitly has an 'any' type") when the loader imports it. This file
// sits next to the artefact so TS resolves `./amawasm.st.mjs` -> `./amawasm.st.d.mts`.
//
// Keep this file in git. build.sh only does `mkdir -p built` and never wipes the
// directory, so it survives every rebuild.

export interface AmaWasmModule {
  HEAPU8: Uint8Array;
  HEAP32: Int32Array;
  _ama_decide(queueLen: number, paletteLen: number): number;
  _ama_set_params(w: number, d: number, t: number, s: number): void;
  _ama_grid_ptr(): number;
  _ama_queue_ptr(): number;
  _ama_palette_ptr(): number;
  _ama_result_ptr(): number;
}

declare const factory: (opts?: Record<string, unknown>) => Promise<AmaWasmModule>;
export default factory;
