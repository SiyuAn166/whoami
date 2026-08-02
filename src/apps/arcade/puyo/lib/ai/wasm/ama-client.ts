// Main-thread client for the ama worker.
//
// Replaces the synchronous amaDecide() with a promise-based API so the main
// thread never blocks. Every request carries a token; results whose token is
// stale (because the board moved on, or a reset happened) are discarded.

export interface AmaMove {
  column: number;
  rotation: number;
  eval: number;
  elapsedMs: number;
}

interface ReadyMsg {
  kind: "ready";
  ok: boolean;
  threaded: boolean;
  error: string;
}

interface ResultMsg {
  kind: "result";
  token: number;
  ok: boolean;
  column?: number;
  rotation?: number;
  eval?: number;
  elapsedMs?: number;
}

type OutMsg = ReadyMsg | ResultMsg;

let worker: Worker | null = null;
let ready = false;
let threaded = false;
let lastError = "";
let loading: Promise<boolean> | null = null;

/**
 * Upper bound on one search. spec preset (250x16) peaks near 900ms on an empty
 * board, so this is generous; it only ever fires when the worker is gone.
 */
const DECIDE_TIMEOUT_MS = 15000;

let nextToken = 1;
const pending = new Map<number, (m: AmaMove | null) => void>();

/**
 * Set once the worker dies. A wasm trap kills the whole worker: every
 * in-flight promise would otherwise never settle and the caller would hang
 * forever. Once dead we fail fast instead of pretending to still work.
 */
let dead = false;
let deadReason = "";
const deadListeners = new Set<(reason: string) => void>();

/** Registers a callback fired once, when the worker dies unrecoverably. */
export function amaOnDead(fn: (reason: string) => void): void {
  deadListeners.add(fn);
}

export function amaIsDead(): boolean {
  return dead;
}

/**
 * Marks the worker unusable, settles every waiting caller with null, and
 * notifies listeners so the driver can disengage.
 */
function markDead(reason: string): void {
  if (dead) return;
  dead = true;
  deadReason = reason;
  lastError = reason;
  ready = false;
  for (const fn of pending.values()) fn(null);
  pending.clear();
  try {
    worker?.terminate();
  } catch {
    // already gone
  }
  worker = null;
  for (const fn of deadListeners) {
    try {
      fn(reason);
    } catch {
      // listener errors must not mask the shutdown
    }
  }
}

export function amaDeadReason(): string {
  return deadReason;
}

export function amaReady(): boolean {
  return ready;
}

export function amaIsThreaded(): boolean {
  return threaded;
}

export function amaLastError(): string {
  return lastError;
}

/**
 * Spawns the worker and waits for the wasm module to initialise inside it.
 * Resolves false if neither wasm build could load, in which case callers keep
 * using the TypeScript engines.
 */
export function initAma(): Promise<boolean> {
  if (loading) return loading;

  loading = new Promise<boolean>((resolve) => {
    let w: Worker;
    try {
      // Literal URL so Vite can statically analyse and bundle the worker.
      w = new Worker(new URL("./ama-worker.ts", import.meta.url), {
        type: "module",
      });
    } catch (err) {
      lastError = "worker spawn failed: " + String(err);
      resolve(false);
      return;
    }

    worker = w;

    w.onerror = (ev: ErrorEvent): void => {
      const reason = "worker crashed: " + (ev.message || "unknown");
      if (!ready) {
        lastError = reason;
        resolve(false);
        return;
      }
      // Crashed mid-game (typically a wasm trap on a dead board). The worker
      // cannot be trusted after this, so tear it down and let callers know.
      markDead(reason);
    };

    w.onmessageerror = (): void => {
      markDead("worker message channel failed");
    };

    w.onmessage = (ev: MessageEvent<OutMsg>): void => {
      const msg = ev.data;

      if (msg.kind === "ready") {
        ready = msg.ok;
        threaded = msg.threaded;
        lastError = msg.error;
        resolve(msg.ok);
        return;
      }

      const fn = pending.get(msg.token);
      if (!fn) return; // stale
      pending.delete(msg.token);

      if (!msg.ok) {
        fn(null);
        return;
      }
      fn({
        column: msg.column as number,
        rotation: msg.rotation as number,
        eval: msg.eval as number,
        elapsedMs: msg.elapsedMs as number,
      });
    };

    w.postMessage({ kind: "init" });
  });

  return loading;
}

export function amaSetParams(
  width: number,
  depth: number,
  trigger = 95000,
  stretch = true,
): void {
  worker?.postMessage({ kind: "params", width, depth, trigger, stretch });
}

/**
 * Requests a move. The board is copied (not transferred) so the caller can
 * keep reusing its own buffer.
 */
export function amaDecide(
  board: Uint8Array,
  pairs: ReadonlyArray<readonly [number, number]>,
  palette: ReadonlyArray<number>,
): Promise<AmaMove | null> {
  if (dead || !worker || !ready) return Promise.resolve(null);

  const token = nextToken;
  nextToken += 1;

  const flat: number[] = [];
  const qn = Math.min(pairs.length, 4);
  for (let i = 0; i < qn; i += 1) {
    flat.push(pairs[i][0] as number, pairs[i][1] as number);
  }

  return new Promise<AmaMove | null>((resolve) => {
    // Watchdog: a wasm trap can kill the worker without onerror firing in
    // every browser. Without this the await never settles and the autoplay
    // loop wedges silently.
    const timer = setTimeout(() => {
      if (pending.delete(token)) {
        markDead("search timed out after " + String(DECIDE_TIMEOUT_MS) + "ms");
        resolve(null);
      }
    }, DECIDE_TIMEOUT_MS);

    pending.set(token, (m) => {
      clearTimeout(timer);
      resolve(m);
    });

    worker?.postMessage({
      kind: "decide",
      token,
      board: new Uint8Array(board),
      pairs: flat,
      palette: Array.from(palette).slice(0, 4),
    });
  });
}

/** Drops every in-flight request. Used on reset so stale plans never land. */
export function amaCancelAll(): void {
  for (const fn of pending.values()) fn(null);
  pending.clear();
}
