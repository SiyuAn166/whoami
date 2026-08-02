// Worker entry for the native ama beam search.
//
// WHY THIS EXISTS
// ---------------
// _ama_decide() is a synchronous call. Even with 6 pthreads doing the work,
// the *calling* thread blocks in pthread_join for the whole search. When that
// caller is the main thread the entire page freezes: no animation, no input,
// no rendering, for 150-900ms every single move.
//
// Running the search in a dedicated worker means the main thread only ever
// waits on a message event, so the game loop keeps painting at 60fps while
// ama thinks.
//
// The threaded wasm build spawns its pthreads from inside this worker, i.e.
// nested workers. That is supported in Chrome/Firefox/Safari when the document
// is cross-origin isolated, which the threaded build already requires.

/// <reference lib="webworker" />

type Ptr = number;

interface AmaModule {
  HEAPU8: Uint8Array;
  HEAP32: Int32Array;
  _ama_decide(queueLen: number, paletteLen: number): number;
  _ama_set_params(w: number, d: number, t: number, s: number): void;
  _ama_grid_ptr(): Ptr;
  _ama_queue_ptr(): Ptr;
  _ama_palette_ptr(): Ptr;
  _ama_result_ptr(): Ptr;
}

interface InitMsg {
  kind: "init";
}

interface ParamsMsg {
  kind: "params";
  width: number;
  depth: number;
  trigger: number;
  stretch: boolean;
}

interface DecideMsg {
  kind: "decide";
  token: number;
  board: Uint8Array;
  pairs: number[];
  palette: number[];
}

type InMsg = InitMsg | ParamsMsg | DecideMsg;

let mod: AmaModule | null = null;
let threaded = false;
let initError = "";

async function load(): Promise<void> {
  // Threaded build first. It needs SharedArrayBuffer; if the document is not
  // cross-origin isolated the import or the runtime init will throw and we
  // fall through to the single-thread build.
  if (typeof SharedArrayBuffer !== "undefined") {
    try {
      const factory = await import("../../../wasm/built/amawasm.mjs");
      mod = (await factory.default()) as AmaModule;
      threaded = true;
      return;
    } catch (err) {
      initError = "threaded: " + String(err);
    }
  } else {
    initError = "threaded: SharedArrayBuffer undefined";
  }

  try {
    const factory = await import("../../../wasm/built/amawasm.st.mjs");
    mod = (await factory.default()) as AmaModule;
    threaded = false;
  } catch (err) {
    initError = initError + " | single-thread: " + String(err);
    mod = null;
  }
}

self.onmessage = (ev: MessageEvent<InMsg>): void => {
  const msg = ev.data;

  if (msg.kind === "init") {
    void load().then(() => {
      self.postMessage({
        kind: "ready",
        ok: mod !== null,
        threaded,
        error: initError,
      });
    });
    return;
  }

  if (msg.kind === "params") {
    if (mod) {
      mod._ama_set_params(
        msg.width,
        msg.depth,
        msg.trigger,
        msg.stretch ? 1 : 0,
      );
    }
    return;
  }

  // decide
  if (!mod) {
    self.postMessage({ kind: "result", token: msg.token, ok: false });
    return;
  }

  const t0 = performance.now();
  const heap = mod.HEAPU8;

  const gp = mod._ama_grid_ptr();
  for (let i = 0; i < 84; i += 1) heap[gp + i] = msg.board[i] as number;

  const pp = mod._ama_palette_ptr();
  const pn = Math.min(msg.palette.length, 4);
  for (let i = 0; i < pn; i += 1) heap[pp + i] = msg.palette[i] as number;

  // pairs arrives flattened: [a0, b0, a1, b1, ...]
  const qp = mod._ama_queue_ptr();
  const qn = Math.min(msg.pairs.length >> 1, 4);
  for (let i = 0; i < qn * 2; i += 1) heap[qp + i] = msg.pairs[i] as number;

  const ok = mod._ama_decide(qn, pn);
  if (!ok) {
    self.postMessage({ kind: "result", token: msg.token, ok: false });
    return;
  }

  const rp = mod._ama_result_ptr() >> 2;
  const out = mod.HEAP32;
  self.postMessage({
    kind: "result",
    token: msg.token,
    ok: true,
    column: out[rp],
    rotation: out[rp + 1],
    eval: out[rp + 2],
    elapsedMs: performance.now() - t0,
  });
};
