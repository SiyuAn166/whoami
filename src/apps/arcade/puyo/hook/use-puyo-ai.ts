/**
 * usePuyoAi — AI driver layer (dev-tool shaped)
 *
 * The search is the ORIGINAL ama C++ (citrus610/ama) compiled to wasm SIMD128
 * and run inside a Worker, so decisions never block the main thread and no
 * behaviour is lost to a re-implementation. The TypeScript ports this file used
 * to fall back to have been removed.
 *
 * Design principle: don't intrude on the existing game logic.
 *   - doesn't modify use-puyo-game.ts's internal state
 *   - only reads hud.status / grid / queue / piece, only calls
 *     touchMove / touchRotate, and locks via the engine's own Space handler
 *   - off by default, and only enable-able from the console:
 *
 *       __puyoAi.start()
 *       __puyoAi.stop()
 *       __puyoAi.step()                       // single move, for debugging
 *       __puyoAi.preset("fast" | "bench" | "spec")
 *       __puyoAi.status()
 *       __puyoAi.verbose = true
 *       __puyoAi.keyDelayMs = 40              // >0 makes the shift visible
 *       __puyoAi.naturalDrop = false          // snap to the floor instead
 *       __puyoAi.freezeGravity = false        // let the pair fall while thinking
 *       __puyoAi.thinkDelayMs = 0
 *
 * Nothing here participates in the render cycle: only the diagnostic of the
 * last decision is mirrored into React state, once per placement.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import * as nativeAma from "../lib/ai/wasm/wasm-engine";

/**
 * Diagnostics for one decision. Defined locally: the TypeScript engine that
 * used to own this type has been removed, the native ama wasm module is the
 * only search path now.
 */
export interface Diagnostics {
  column: number;
  rotation: number;
  /** ama's evaluation of the chosen move (score / BRANCH) */
  eval: number;
  elapsedMs: number;
  /** true when the 6-thread build is driving; false for the fallback */
  threaded: boolean;
  /** true when this move came out of the prefetch cache */
  prefetched: boolean;
}

/** The subset of usePuyoGame's return value the AI needs. */
export interface PuyoGameLike {
  hud: { status: string };
  /** numeric seed of the current game; changes on reseed, used to re-warm */
  currentSeed?: number;
  /** the engine's grid (flat or 2D, the adapter handles either) */
  grid: unknown[] | unknown[][];
  /** the next queue; note spawnNext() has already shifted the active pair off */
  queue: unknown[];
  piece?: {
    c?: number;
    /** the axis puyo's row; row 0 is the vanish row, larger = lower */
    r?: number;
    orient?: number;
    /** the active pair's colours — queue[] no longer contains them */
    axis?: unknown;
    sat?: unknown;
  } | null;
  touchMove: (dir: -1 | 1) => void;
  touchRotate: (dir: -1 | 1) => void;
  touchStepDown: () => void;
  /** "play" = auto gravity + lock delay, "practice" = neither. */
  mode?: string;
  /** Flips play <-> practice. */
  toggleMode?: () => void;
}

export interface UsePuyoAiOptions {
  /** delay between key presses, ms. Too fast collides with the hook's ARR. */
  keyDelayMs?: number;
  /** thinking delay between moves, ms */
  thinkDelayMs?: number;
  verbose?: boolean;
  /** search strength; "spec" is ama's published width 250 / depth 16 */
  preset?: nativeAma.WasmPreset;
  /**
   * Switch the game into practice mode (zero gravity, no lock delay) while the
   * AI runs. Search evaluates a STATIC board, so any fall during the think +
   * keypress window lands the pair somewhere the plan never considered. This
   * is the single biggest source of live-vs-bench divergence. Default true.
   */
  freezeGravity?: boolean;
  /** let the piece visibly descend instead of snapping to the floor (default true) */
  naturalDrop?: boolean;
}

export interface PuyoAiHandle {
  running: boolean;
  start: () => void;
  stop: () => void;
  step: () => Promise<void>;
  /** change search strength at runtime */
  setPreset: (p: nativeAma.WasmPreset) => void;
  lastDecision: Diagnostics | null;
  preset: nativeAma.WasmPreset;
  /** true once the native ama wasm module has loaded */
  nativeReady: boolean;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function toColor(v: unknown): number {
  const n = typeof v === "number" ? v | 0 : 0;
  return n >= 1 && n <= 5 ? n : 0;
}

/**
 * Read a pair out of whatever shape the queue holds. The engine stores queue
 * entries as [Color, Color]; objects with axis/sat are accepted too.
 */
function readQueuePair(v: unknown): [number, number] | null {
  if (Array.isArray(v)) {
    const a = toColor(v[0]);
    const b = toColor(v[1]);
    if (a && b) return [a, b];
    return null;
  }
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const a = toColor(o.axis);
    const b = toColor(o.sat ?? o.child);
    if (a && b) return [a, b];
  }
  return null;
}

/**
 * The pair actually under control lives on g.piece as { axis, sat }, NOT in
 * g.queue — spawnNext() shifts the queue when a piece spawns, so g.queue[0] is
 * already the *next* pair. Reading the current pair from the queue means
 * planning a placement for one pair and applying it to another, which makes
 * every single move use the wrong colours.
 */
function currentPair(g: PuyoGameLike): [number, number] | null {
  const p = g.piece;
  if (!p) return null;
  const a = toColor(p.axis);
  const b = toColor(p.sat);
  if (!a || !b) return null;
  return [a, b];
}

function nextPair(g: PuyoGameLike): [number, number] | null {
  const q = g.queue;
  if (!Array.isArray(q) || q.length === 0) return null;
  return readQueuePair(q[0]);
}

/**
 * Lock the piece via the engine's own Space handler, which calls
 * hardDropPiece() + beginResolve() atomically.
 *
 * Stepping down repeatedly and relying on the lock-delay timer can deadlock:
 * touchRotate() calls resetLock(), so the loop can re-enter while the piece is
 * still in `control`, rotate again, clear the lock timer, and never lock — the
 * piece just spins at the bottom forever. A hard drop cannot deadlock.
 */
function hardDrop(): void {
  window.dispatchEvent(
    new KeyboardEvent("keydown", { code: "Space", bubbles: true }),
  );
}

/**
 * Let the piece descend visibly instead of teleporting to the floor.
 *
 * Practice mode disables gravity entirely (see use-puyo-game: the gravity block
 * is gated on mode === "play"), so nothing falls on its own while the AI is
 * driving. Holding ArrowDown drives the engine's own soft-drop path, which
 * steps the piece down one row per soft-drop tick and locks it with
 * SOFT_DROP_LOCK — the same code path a human's held-down key uses.
 *
 * This is purely cosmetic: the column and orientation are already final, so the
 * landing cell is identical to a hard drop.
 */
async function naturalDrop(
  g: PuyoGameLike,
  alive: { current: boolean },
): Promise<void> {
  const startRow = g.piece?.r ?? 0;

  window.dispatchEvent(
    new KeyboardEvent("keydown", { code: "ArrowDown", bubbles: true }),
  );

  // Wait for the engine to bring it to rest. Bounded so a stuck piece can
  // never hang the loop; on timeout we hard drop as a guaranteed lock.
  for (let i = 0; i < 120; i += 1) {
    await sleep(16);
    if (!alive.current) break;
    if (g.hud.status !== "control" || !g.piece) {
      window.dispatchEvent(
        new KeyboardEvent("keyup", { code: "ArrowDown", bubbles: true }),
      );
      return;
    }
  }

  window.dispatchEvent(
    new KeyboardEvent("keyup", { code: "ArrowDown", bubbles: true }),
  );
  if (!alive.current) return;

  // Still airborne after the budget: force the lock so autoplay cannot stall.
  if (g.hud.status === "control" && (g.piece?.r ?? -1) >= startRow) {
    hardDrop();
  }
}

export function usePuyoAi(
  game: PuyoGameLike | null,
  opts: UsePuyoAiOptions = {},
): PuyoAiHandle {
  /** Speed knobs live in refs so console changes apply without a re-render. */
  /* 0 by default: every key sleep is real time in which the engine's gravity
   * pulls the pair further down, so a slow key sequence can leave the piece
   * unable to reach the column the search picked. Raise it only to watch. */
  const keyDelayRef = useRef(opts.keyDelayMs ?? 50);
  /** Count of moves that did not land where the search evaluated them. */
  const driftRef = useRef(0);
  // Default 0: the natural-drop animation already paces the game visually, and
  // the next move is prefetched during it, so an extra idle wait adds nothing.
  const thinkDelayRef = useRef(opts.thinkDelayMs ?? 0);
  const verboseRef = useRef(opts.verbose ?? false);

  /** Search strength. Mirrored into state so the console can read it back. */
  const [preset, setPresetState] = useState<nativeAma.WasmPreset>(
    () => opts.preset ?? nativeAma.currentPreset(),
  );
  const [running, setRunning] = useState(false);

  /*
   * Load the ama module: the original C++ beam search compiled to wasm SIMD128,
   * running inside a Worker. This is the only search path — absent it, the AI
   * simply does not move.
   */
  const [nativeReady, setNativeReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void nativeAma.load().then((ok: boolean) => {
      if (cancelled) return;
      setNativeReady(ok);
      if (!verboseRef.current) return;
      if (ok) {
        console.info(
          `[puyo-ai] NATIVE ama wasm active (${
            nativeAma.threaded() ? "threaded x6" : "single-thread"
          }, preset=${nativeAma.currentPreset()})`,
        );
      } else {
        console.warn(
          `[puyo-ai] ama wasm unavailable, the AI cannot move. ${nativeAma.lastError()}`,
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const [lastDecision, setLastDecision] = useState<Diagnostics | null>(null);
  const lastDecisionRef = useRef<Diagnostics | null>(null);

  const gameRef = useRef(game);
  gameRef.current = game;
  const runningRef = useRef(false);
  const busyRef = useRef(false);
  // Flipped false when the component unmounts or autoplay stops. An in-flight
  // step() is a long async function with many await points; without this it
  // keeps pressing keys and hard-dropping after teardown.
  const aliveRef = useRef(true);
  // Cosmetic: let the piece visibly descend rather than snapping to the floor.
  // Costs a few hundred ms of animation but that time overlaps the prefetch of
  // the next move, so it is usually free.
  const naturalDropRef = useRef(opts.naturalDrop !== false);
  const freezeRef = useRef(opts.freezeGravity !== false);
  freezeRef.current = opts.freezeGravity !== false;

  /** Put the game in practice mode (zero gravity) so the board the search
   *  evaluated is the board the keys act on. Idempotent. */
  const ensureFrozen = useCallback(() => {
    if (!freezeRef.current) return;
    const g = gameRef.current;
    if (!g || !g.toggleMode) return;
    if (g.mode === "play") g.toggleMode();
  }, []);

  /** Run one move: read the board -> search -> press keys -> hard drop. */
  const step = useCallback(async () => {
    const g = gameRef.current;
    if (!g || busyRef.current || !aliveRef.current) return;
    busyRef.current = true;

    try {
      // Require "control" specifically. "playing" also covers the resolve
      // phase, when g.piece is null — acting then plans against a stale board
      // while the cascade is still animating.
      if (!aliveRef.current || g.hud.status !== "control" || !g.piece) return;

      // Freeze gravity BEFORE reading the board: the search evaluates a static
      // grid, so a fall mid-think invalidates the plan.
      ensureFrozen();

      const cur = currentPair(g);
      if (cur === null) return;
      const nxt = nextPair(g) ?? cur;

      // The original ama C++ (wasm SIMD128) is the only search path. It runs in
      // a Worker, so this await does not block rendering or input.
      const native = nativeAma.ready()
        ? await nativeAma.decide(g.grid, cur, nxt)
        : null;

      // The search ran off-thread and may have taken a while; the piece could
      // have locked or the game could have been torn down meanwhile.
      if (!aliveRef.current || g.hud.status !== "control" || !g.piece) return;

      if (native === null) {
        // No move came back. Two cases:
        //   1. The search died (wasm trap) -> stop; nothing can drive moves.
        //   2. The board is unplayable (every column tops out) -> there is no
        //      "good" move left, so drop where the piece already is and let
        //      the game end naturally rather than freezing mid-air.
        if (nativeAma.dead()) {
          console.warn(
            `[puyo-ai] search died (${nativeAma.deadReason()}) - disengaging`,
          );
          runningRef.current = false;
          aliveRef.current = false;
          setRunning(false);
          return;
        }
        if (verboseRef.current) {
          console.log("[puyo-ai] no legal move - dropping in place");
        }
        hardDrop();
        return;
      }

      const d: Diagnostics = {
        column: native.column,
        rotation: native.rotation,
        eval: native.eval,
        elapsedMs: native.elapsedMs,
        threaded: native.threaded,
        prefetched: native.prefetched,
      };
      setLastDecision(d);
      lastDecisionRef.current = d;
      if (verboseRef.current) {
        console.log(
          `[puyo-ai] col=${d.column} rot=${d.rotation} eval=${d.eval} ` +
            `${d.threaded ? "x6" : "st"}${d.prefetched ? " cached" : ""} ` +
            `${Math.round(d.elapsedMs)}ms`,
        );
      }

      // Keys are fired CLOSED LOOP against the engine's real piece state. The
      // engine's rotate() applies wall kicks that can shift the axis column
      // sideways, and touchMove() no-ops against a wall, so an open-loop key
      // count routinely lands the piece somewhere else.

      // ---- rotate to the target orientation ----
      for (let guard = 0; guard < 6; guard++) {
        const orient = g.piece?.orient ?? 0;
        if (orient === d.rotation) break;
        // Shortest rotational direction around the 4-cycle.
        const diff = (d.rotation - orient + 4) % 4;
        g.touchRotate(diff === 3 ? -1 : 1);
        await sleep(keyDelayRef.current);
        if (!aliveRef.current || g.hud.status !== "control" || !g.piece) return;
      }

      // ---- shift to the target column ----
      // Rotate first, then shift: a kick during rotation can move the column,
      // so shifting last means the final column is the one we want.
      let shiftBlocked = false;
      for (let guard = 0; guard < 10; guard++) {
        const c = g.piece?.c;
        if (c == null || c === d.column) break;
        g.touchMove(c < d.column ? 1 : -1);
        await sleep(keyDelayRef.current);
        if (!aliveRef.current || g.hud.status !== "control" || !g.piece) return;
        // Blocked by a wall or stack: stop rather than spin.
        if (g.piece.c === c) {
          shiftBlocked = true;
          break;
        }
      }

      // A blocked shift means the target column is unreachable from where the
      // pair actually sits. With gravity frozen the pair is not falling, so we
      // can re-plan from the CURRENT orientation instead of dropping into a
      // column the search never scored. Rotating to a flat orientation often
      // opens the path (a vertical pair cannot slide through a 1-wide gap).
      if (shiftBlocked && freezeRef.current && g.piece) {
        for (let retry = 0; retry < 3 && g.piece.c !== d.column; retry++) {
          const before = g.piece.c;
          g.touchRotate(1);
          await sleep(keyDelayRef.current);
          if (!aliveRef.current || g.hud.status !== "control" || !g.piece)
            return;
          for (let guard = 0; guard < 10; guard++) {
            const c = g.piece?.c;
            if (c == null || c === d.column) break;
            g.touchMove(c < d.column ? 1 : -1);
            await sleep(keyDelayRef.current);
            if (!aliveRef.current || g.hud.status !== "control" || !g.piece)
              return;
            if (g.piece.c === c) break;
          }
          if (g.piece && g.piece.c === before && g.piece.c !== d.column) break;
        }
        // Restore the planned orientation if the retry rotations moved us off it.
        for (let guard = 0; guard < 6; guard++) {
          const orient = g.piece?.orient ?? 0;
          if (orient === d.rotation) break;
          const diff = (d.rotation - orient + 4) % 4;
          const beforeCol = g.piece?.c;
          g.touchRotate(diff === 3 ? -1 : 1);
          await sleep(keyDelayRef.current);
          if (!aliveRef.current || g.hud.status !== "control" || !g.piece)
            return;
          // A kick during the restore moved us off the target column: undo.
          if (g.piece.c !== beforeCol && g.piece.c !== d.column) break;
        }
      }

      // A blocked shift or a kicked rotation means the piece is NOT where the
      // search evaluated it. Dropping anyway corrupts the board relative to the
      // plan, which is exactly what made live play diverge from the bench. Warn
      // unconditionally (this is a correctness event, not a debug detail) and
      // still drop, because holding the piece would stall the game loop.
      // Torn down while pressing keys: do not drop, do not warn. The drift
      // warning fired on exit because this path had no liveness check.
      if (!aliveRef.current || g.hud.status !== "control" || !g.piece) return;

      const okCol = g.piece?.c === d.column;
      const okRot = g.piece?.orient === d.rotation;
      if (!okCol || !okRot) {
        driftRef.current++;
        console.warn(
          `[puyo-ai] placement drift #${driftRef.current}: ` +
            `want col=${d.column} rot=${d.rotation}, ` +
            `got col=${g.piece?.c} rot=${g.piece?.orient}`,
        );
      }

      if (naturalDropRef.current) {
        await naturalDrop(g, aliveRef);
      } else {
        hardDrop();
      }
    } finally {
      busyRef.current = false;
    }
  }, [ensureFrozen]);

  // Warm the first move. Runs once the wasm module is live and the board is in
  // a playable state, so the initial search happens while the player is still
  // looking at a stationary board instead of after they press start.
  useEffect(() => {
    if (!nativeReady) return;
    const g = gameRef.current;
    if (!g || g.hud.status !== "control" || !g.piece) return;
    const cur = currentPair(g);
    if (cur === null) return;
    nativeAma.prime(g.grid, cur, nextPair(g) ?? cur);
  }, [nativeReady, game?.currentSeed]);

  // A wasm trap kills the worker outright. Disengage once, instead of leaving
  // the autoplay loop spinning against a search that can never answer.
  useEffect(() => {
    let cancelled = false;
    nativeAma.onDead((reason: string) => {
      if (cancelled) return;
      console.warn(`[puyo-ai] search died (${reason}) - disengaging`);
      runningRef.current = false;
      aliveRef.current = false;
      setRunning(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Autoplay loop. */
  useEffect(() => {
    if (!running) return;
    runningRef.current = true;
    let cancelled = false;

    (async () => {
      while (!cancelled && runningRef.current) {
        const g = gameRef.current;
        if (!g) break;
        if (g.hud.status === "gameover") {
          if (verboseRef.current) console.log("[puyo-ai] game over, stopping");
          break;
        }
        if (nativeAma.dead()) {
          console.warn("[puyo-ai] search unavailable, stopping");
          break;
        }
        await step();
        await sleep(thinkDelayRef.current);
      }
      if (!cancelled) setRunning(false);
    })();

    return () => {
      cancelled = true;
      runningRef.current = false;
      aliveRef.current = false;
    };
  }, [running, step]);

  const start = useCallback(() => {
    aliveRef.current = true;
    nativeAma.invalidate();
    setRunning(true);
  }, []);

  const stop = useCallback(() => {
    nativeAma.invalidate();
    aliveRef.current = false;
    runningRef.current = false;
    setRunning(false);
  }, []);

  const setPreset = useCallback((p: nativeAma.WasmPreset) => {
    nativeAma.applyPreset(p);
    nativeAma.invalidate();
    setPresetState(p);
    console.log(`[puyo-ai] preset = ${p}`);
  }, []);

  /**
   * The console is the only entry point. Attached to window.__puyoAi, mounted
   * in every environment so the AI can be driven on the deployed site too.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const api = {
      /** true when the original ama C++ (wasm SIMD128) is driving moves */
      get native() {
        return nativeAma.ready();
      },
      /** let the piece visibly descend instead of snapping to the floor */
      get naturalDrop() {
        return naturalDropRef.current;
      },
      set naturalDrop(v: boolean) {
        naturalDropRef.current = v;
      },
      start() {
        start();
        console.log("[puyo-ai] started");
      },
      stop() {
        stop();
        console.log("[puyo-ai] stopped");
      },
      /* Revive liveness first: stop() and a crash both clear aliveRef, and a
       * raw step() would then bail out forever with no way back short of
       * start(). Manual stepping is the main debugging tool, so it must keep
       * working after a stop. */
      step() {
        aliveRef.current = true;
        return step();
      },
      /**
       * Search strength. "spec" is ama's published width 250 / depth 16 and is
       * the default; "bench" and "fast" trade chain height for latency.
       */
      preset(p: nativeAma.WasmPreset) {
        setPreset(p);
        return p;
      },
      status() {
        const s = {
          running: runningRef.current,
          algorithm:
            "citrus610/ama (original C++ -> wasm SIMD128, in a Worker) — " +
            "depth 16, width 250, 6 fixed queues, GTR/FRON/SGTR forms",
          preset: nativeAma.currentPreset(),
          lastDecision: lastDecisionRef.current,
          keyDelayMs: keyDelayRef.current,
          thinkDelayMs: thinkDelayRef.current,
          verbose: verboseRef.current,
          /* Moves that did not land where the search evaluated them. Any
           * non-zero value means the piece drifted off the plan. */
          placementDrift: driftRef.current,
          /* Practice mode = zero gravity, so the pair cannot fall between the
           * search and the keypresses. Required for plan fidelity. */
          freezeGravity: freezeRef.current,
          gameMode: gameRef.current?.mode,
          naturalDrop: naturalDropRef.current,
          nativeReady: nativeAma.ready(),
          nativeThreaded: nativeAma.threaded(),
          /* Prefetch hit rate: hits mean the think time was fully hidden
           * behind the previous move's drop animation. */
          prefetch: nativeAma.pipelineStats(),
          nativeError: nativeAma.lastError(),
          searchDead: nativeAma.dead(),
          crossOriginIsolated: globalThis.crossOriginIsolated === true,
        };
        console.log("[puyo-ai] status", s);
        return s;
      },
      /** Toggle the gravity freeze (practice mode) used for bench parity. */
      get freezeGravity() {
        return freezeRef.current;
      },
      set freezeGravity(v: boolean) {
        freezeRef.current = v;
        const g = gameRef.current;
        if (v && g?.toggleMode && g.mode === "play") g.toggleMode();
        console.log(`[puyo-ai] freezeGravity = ${v}`);
      },
      get verbose() {
        return verboseRef.current;
      },
      set verbose(v: boolean) {
        verboseRef.current = v;
        console.log(`[puyo-ai] verbose = ${v}`);
      },
      get keyDelayMs() {
        return keyDelayRef.current;
      },
      set keyDelayMs(v: number) {
        keyDelayRef.current = v;
      },
      get thinkDelayMs() {
        return thinkDelayRef.current;
      },
      set thinkDelayMs(v: number) {
        thinkDelayRef.current = v;
      },
    };

    (window as unknown as Record<string, unknown>).__puyoAi = api;
    return () => {
      delete (window as unknown as Record<string, unknown>).__puyoAi;
    };
  }, [start, stop, step, setPreset]);

  return {
    running,
    start,
    stop,
    step,
    setPreset,
    lastDecision,
    preset,
    nativeReady,
  };
}

export default usePuyoAi;
