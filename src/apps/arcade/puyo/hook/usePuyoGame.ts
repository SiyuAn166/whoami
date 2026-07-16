// The game-loop hook: owns the mutable game state, drives the Pixi stage via
// its ticker, handles keyboard input (DAS/ARR), and exposes HUD state + actions
// to React. Practice mode = no auto gravity / no lock delay; Play mode = full.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  emptyGrid,
  lockPiece,
  move as movePiece,
  rotate as rotatePiece,
  stepDown,
  hardDropPiece,
  isTopOut,
  applyGravity,
  resolveChains,
  isAllClear,
  pieceCells,
} from "../lib/engine";
import { ColorBag } from "../lib/rng";
import {
  TIMING,
  SPAWN_COL,
  SPAWN_ROW,
  ROWS,
  HIDDEN_ROWS,
  TARGET_POINT,
} from "../lib/config";
import type { Grid, Piece, Color, ChainStep, Mode } from "../lib/types";
import { PuyoStage } from "../pixi/PuyoStage";
import { sfx } from "../lib/sound";

const ALL_CLEAR_BONUS = 3600;

export type Status = "loading" | "control" | "resolve" | "paused" | "gameover";

interface Hud {
  status: Status;
  score: number;
  chain: number;
  maxChain: number;
  next: [Color, Color][];
  mode: Mode;
}

type Phase = "predrop" | "pop" | "drop" | "pause";

interface GameState {
  grid: Grid;
  piece: Piece | null;
  bag: ColorBag;
  queue: [Color, Color][]; // upcoming pairs (index 0 = next)
  status: Status;
  score: number;
  chain: number;
  maxChain: number;
  // garbage tally
  chainScore: number;
  garbageLeftover: number;
  garbageSent: number;
  // gravity / lock
  gravAccum: number;
  lockAccum: number;
  grounded: boolean;
  softDrop: boolean;
  // horizontal auto-shift
  dir: -1 | 0 | 1;
  dasAccum: number;
  arrAccum: number;
  // resolve playback
  steps: ChainStep[];
  stepIndex: number;
  phase: Phase;
  phaseT: number;
  phaseDur: number;
  predrop: { from: Grid; to: Grid; bounce: Set<string> } | null;
  resolveFinal: Grid;
  // runtime mode: "play" = auto gravity, "practice" = 0 gravity. Toggled live.
  mode: Mode;
}

// Where the just-locked pair comes to rest after gravity, as "r,c" keys.
// Gravity preserves vertical order within a column, so a placed cell at index
// k among its column's occupied rows lands at index k in the settled column.
function settledPositions(
  locked: Grid,
  settled: Grid,
  placed: { r: number; c: number }[],
): Set<string> {
  const set = new Set<string>();
  for (const { r, c } of placed) {
    const lrows: number[] = [];
    const srows: number[] = [];
    for (let rr = 0; rr < ROWS; rr++) {
      if (locked[rr][c] !== 0) lrows.push(rr);
      if (settled[rr][c] !== 0) srows.push(rr);
    }
    const k = lrows.indexOf(r);
    const dr = k >= 0 && k < srows.length ? srows[k] : r;
    if (dr >= HIDDEN_ROWS) set.add(`${dr},${c}`);
  }
  return set;
}

export function usePuyoGame(initialMode: Mode = "play") {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<PuyoStage | null>(null);
  const gs = useRef<GameState | null>(null);
  const [hud, setHud] = useState<Hud>({
    status: "loading",
    score: 0,
    chain: 0,
    maxChain: 0,
    next: [],
    mode: initialMode,
  });

  const syncHud = useCallback(() => {
    const g = gs.current;
    if (!g) return;
    setHud({
      status: g.status,
      score: g.score,
      chain: g.chain,
      maxChain: g.maxChain,
      next: g.queue.slice(0, 2),
      mode: g.mode,
    });
  }, []);

  // ---- spawning ----------------------------------------------------------
  const spawnNext = useCallback(() => {
    const g = gs.current!;
    // Placed + no clear has already happened before this call. Game over is
    // decided by the death cell (the red X on the 3rd column), NOT by whether
    // the pair fits in the hidden spawn row — that fires one puyo too late.
    // Top-out only applies in play mode; practice never ends.
    if (g.mode === "play" && isTopOut(g.grid)) {
      g.piece = null;
      g.status = "gameover";
      stageRef.current?.hideActive();
      syncHud();
      return;
    }
    // Not topped out: consume the next pair (peeked, so the queue/RNG only
    // advances when a piece actually spawns) and enqueue a fresh one.
    const [axis, sat] = g.queue.shift()!;
    g.queue.push(g.bag.pair());
    const p: Piece = { r: SPAWN_ROW, c: SPAWN_COL, axis, sat, orient: 0 };
    g.piece = p;
    stageRef.current?.setNext(g.queue.slice(0, 2));
    g.gravAccum = 0;
    g.lockAccum = 0;
    g.grounded = false;
    g.status = "control";
    stageRef.current?.showActive(g.grid, p);
    syncHud();
  }, [syncHud]);

  // ---- locking + starting a resolve --------------------------------------
  const beginResolve = useCallback(() => {
    const g = gs.current!;
    if (!g.piece) return;
    const placed = pieceCells(g.piece);
    // Practice mode never tops out, so a pair resting partly out of the board
    // (any cell in a hidden row) must NOT be placed — the player has to move it
    // to a column with room. Play mode places it and tops out on next spawn.
    if (g.mode === "practice" && placed.some((c) => c.r < HIDDEN_ROWS)) {
      return;
    }
    sfx.placed();
    const locked = lockPiece(g.grid, g.piece);
    g.piece = null;
    stageRef.current?.hideActive();

    const settled = applyGravity(locked);
    const res = resolveChains(locked);
    g.steps = res.steps;
    g.resolveFinal = res.finalGrid;
    g.stepIndex = 0;
    g.phaseT = 0;
    g.chain = 0;
    g.chainScore = 0;
    g.garbageSent = 0;
    g.garbageLeftover = 0;
    stageRef.current?.setGarbage(0);

    stageRef.current?.puyo.syncStatic(locked);

    // Always play a landing phase so the just-placed pair squashes/bounces on
    // impact, even when neither puyo falls any further. Puyos that also drop
    // (split / uneven ground) bounce via their fall; the ones that don't are
    // force-bounced at their resting cells.
    g.predrop = {
      from: locked,
      to: settled,
      bounce: settledPositions(locked, settled, placed),
    };
    g.phase = "predrop";
    g.phaseDur = dropDuration(locked, settled);
    g.status = "resolve";
    syncHud();
  }, [syncHud]);

  const dropDuration = (from: Grid, to: Grid): number => {
    const md = stageRef.current?.puyo.maxDrop(from, to) ?? 0;
    // Longest fall (constant speed) + the landing bounce tail. With no fall at
    // all (md === 0) it's just the in-place bounce.
    return TIMING.dropPerRowMs * md + TIMING.bounceMs;
  };

  const startStep = useCallback(
    (i: number) => {
      const g = gs.current!;
      const step = g.steps[i];
      g.stepIndex = i;
      g.phase = "pop";
      g.phaseT = 0;
      g.phaseDur = TIMING.popMs;
      g.chain = step.chain;
      g.maxChain = Math.max(g.maxChain, step.chain);
      stageRef.current?.puyo.syncStatic(step.before);
      stageRef.current?.fx.spawnBurst(step.popped);
      if (step.chain >= 1) {
        stageRef.current?.showChain(step.chain);
        sfx.chain(step.chain);
      }
      g.score += step.score;
      g.chainScore += step.score;
      stageRef.current?.setScore(g.score);
      // Live nuisance count: recompute each pop step so the tray grows as the
      // chain progresses (matches puyosim). Committed for real in finishResolve.
      stageRef.current?.setGarbage(Math.floor(g.chainScore / TARGET_POINT));
      syncHud();
    },
    [syncHud],
  );

  const finishResolve = useCallback(() => {
    const g = gs.current!;
    const final = g.resolveFinal;
    g.grid = final;
    stageRef.current?.puyo.syncStatic(final);
    if (g.steps.length > 0 && isAllClear(final)) {
      g.score += ALL_CLEAR_BONUS;
      g.chainScore += ALL_CLEAR_BONUS;
      stageRef.current?.setScore(g.score);
    }
    // Garbage sent = chain score / target point, carrying the fractional
    // remainder into the next chain (standard Puyo Tsu nuisance calc).
    g.garbageSent = Math.floor(g.chainScore / TARGET_POINT);
    stageRef.current?.setGarbage(g.garbageSent);
    g.steps = [];
    spawnNext();
  }, [spawnNext]);

  // ---- main tick ---------------------------------------------------------
  const tick = useCallback(
    (ms: number) => {
      const g = gs.current;
      const stage = stageRef.current;
      if (!g || !stage) return;

      if (g.status === "control" && g.piece) {
        // Horizontal auto-shift.
        if (g.dir !== 0) {
          g.dasAccum += ms;
          if (g.dasAccum >= TIMING.das) {
            g.arrAccum += ms;
            while (g.arrAccum >= TIMING.arr) {
              const np = movePiece(g.grid, g.piece, g.dir);
              g.piece = np;
              g.arrAccum -= TIMING.arr;
            }
          }
        }

        if (g.mode === "play") {
          const interval = g.softDrop ? TIMING.softDrop : TIMING.gravity;
          g.gravAccum += ms;
          let moved = false;
          while (g.gravAccum >= interval) {
            const np = stepDown(g.grid, g.piece);
            if (np) {
              g.piece = np;
              g.gravAccum -= interval;
              moved = true;
              g.grounded = false;
              g.lockAccum = 0;
            } else {
              g.gravAccum = 0;
              g.grounded = true;
              break;
            }
          }
          if (g.grounded) {
            g.lockAccum += ms;
            if (g.lockAccum >= TIMING.lockDelay) {
              beginResolve();
              return;
            }
          }
          void moved;
        } else {
          // Practice: no auto gravity (the pair floats until soft-dropped), but
          // once it can't fall any further it auto-locks after a short delay,
          // so placement is detected without pressing Space.
          if (g.softDrop && stepDown(g.grid, g.piece)) {
            g.gravAccum += ms;
            while (g.gravAccum >= TIMING.softDrop) {
              const np = stepDown(g.grid, g.piece);
              if (np) {
                g.piece = np;
                g.grounded = false;
                g.lockAccum = 0;
              }
              g.gravAccum -= TIMING.softDrop;
            }
          }
          if (g.piece && stepDown(g.grid, g.piece) === null) {
            g.grounded = true;
            g.lockAccum += ms;
            if (g.lockAccum >= TIMING.lockDelay) {
              beginResolve();
              return;
            }
          } else {
            g.grounded = false;
            g.lockAccum = 0;
          }
        }
        if (g.piece) stage.showActive(g.grid, g.piece);
        return;
      }

      if (g.status === "resolve") {
        g.phaseT += ms;
        const t = Math.min(g.phaseT / g.phaseDur, 1);
        if (g.phase === "predrop" && g.predrop) {
          stage.puyo.renderDrops(
            g.predrop.from,
            g.predrop.to,
            g.phaseT,
            g.predrop.bounce,
          );
          if (t >= 1) {
            stage.puyo.syncStatic(g.predrop.to);
            g.predrop = null;
            if (g.steps.length > 0) startStep(0);
            else finishResolve();
          }
        } else if (g.phase === "pop") {
          const step = g.steps[g.stepIndex];
          stage.puyo.renderPops(step.popped, t);
          if (t >= 1) {
            stage.puyo.syncStatic(step.afterPop);
            // Only enter the drop phase when something actually falls. On steps
            // where the cleared group had nothing above it (maxDrop === 0) the
            // old code still reserved a full bounce tail (bounceMs) of frozen
            // screen, so the chain cadence stalled on some steps but not others
            // -> the "inconsistent" drop timing. Skip straight to the pause.
            const md = stage.puyo.maxDrop(step.afterPop, step.after);
            if (md === 0) {
              stage.puyo.syncStatic(step.after);
              g.phase = "pause";
              g.phaseT = 0;
              g.phaseDur = TIMING.settlePause;
            } else {
              g.phase = "drop";
              g.phaseT = 0;
              g.phaseDur = TIMING.dropPerRowMs * md + TIMING.bounceMs;
            }
          }
        } else if (g.phase === "drop") {
          const step = g.steps[g.stepIndex];
          stage.puyo.renderDrops(step.afterPop, step.after, g.phaseT);
          if (t >= 1) {
            stage.puyo.syncStatic(step.after);
            g.phase = "pause";
            g.phaseT = 0;
            g.phaseDur = TIMING.settlePause;
          }
        } else if (g.phase === "pause") {
          if (t >= 1) {
            const next = g.stepIndex + 1;
            if (next < g.steps.length) startStep(next);
            else finishResolve();
          }
        }
      }
    },
    [beginResolve, finishResolve, startStep],
  );

  // ---- input -------------------------------------------------------------
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const g = gs.current;
      const stage = stageRef.current;
      if (!g || !stage) return;
      sfx.unlock();
      if (g.status !== "control" || !g.piece) return;
      switch (e.code) {
        case "ArrowLeft":
          e.preventDefault();
          if (g.dir !== -1) {
            const before = g.piece.c;
            g.piece = movePiece(g.grid, g.piece, -1);
            if (g.piece.c !== before) sfx.move();
            g.dir = -1;
            g.dasAccum = 0;
            g.arrAccum = 0;
            g.lockAccum = 0;
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (g.dir !== 1) {
            const before = g.piece.c;
            g.piece = movePiece(g.grid, g.piece, 1);
            if (g.piece.c !== before) sfx.move();
            g.dir = 1;
            g.dasAccum = 0;
            g.arrAccum = 0;
            g.lockAccum = 0;
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          g.softDrop = true;
          break;
        case "KeyZ":
        case "ControlLeft":
          e.preventDefault();
          g.piece = rotatePiece(g.grid, g.piece, -1);
          sfx.spin();
          g.lockAccum = 0;
          break;
        case "KeyX":
        case "ArrowUp":
          e.preventDefault();
          g.piece = rotatePiece(g.grid, g.piece, 1);
          sfx.spin();
          g.lockAccum = 0;
          break;
        case "Space": {
          e.preventDefault();
          g.piece = hardDropPiece(g.grid, g.piece);
          beginResolve();
          return;
        }
        default:
          return;
      }
      stage.showActive(g.grid, g.piece);
    },
    [beginResolve],
  );

  const onKeyUp = useCallback((e: KeyboardEvent) => {
    const g = gs.current;
    if (!g) return;
    if (e.code === "ArrowDown") g.softDrop = false;
    if (e.code === "ArrowLeft" && g.dir === -1) {
      g.dir = 0;
    }
    if (e.code === "ArrowRight" && g.dir === 1) {
      g.dir = 0;
    }
  }, []);

  // ---- lifecycle ---------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    const stage = new PuyoStage();
    stageRef.current = stage;

    const bag = new ColorBag();
    gs.current = {
      grid: emptyGrid(),
      piece: null,
      bag,
      queue: [bag.pair(), bag.pair(), bag.pair()],
      status: "loading",
      score: 0,
      chain: 0,
      maxChain: 0,
      chainScore: 0,
      garbageLeftover: 0,
      garbageSent: 0,
      gravAccum: 0,
      lockAccum: 0,
      grounded: false,
      softDrop: false,
      dir: 0,
      dasAccum: 0,
      arrAccum: 0,
      steps: [],
      stepIndex: 0,
      phase: "pop",
      phaseT: 0,
      phaseDur: 0,
      predrop: null,
      resolveFinal: emptyGrid(),
      mode: initialMode,
    };

    (async () => {
      if (!hostRef.current) return;
      await stage.init(hostRef.current);
      sfx.preload();
      stage.setGhostEnabled(initialMode === "play");
      if (cancelled) return;
      stage.onTick(tick);
      stage.puyo.syncStatic(gs.current!.grid);
      stage.setScore(0);
      spawnNext();
    })();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      stage.destroy();
      stageRef.current = null;
      gs.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- actions -----------------------------------------------------------
  const pause = useCallback(() => {
    const g = gs.current;
    if (g && g.status === "control") {
      g.status = "paused";
      g.softDrop = false;
      g.dir = 0;
      syncHud();
    }
  }, [syncHud]);

  const resume = useCallback(() => {
    const g = gs.current;
    if (g && g.status === "paused") {
      g.status = "control";
      syncHud();
    }
  }, [syncHud]);

  // Play/pause toggle: flips gravity on/off (play <-> practice) at runtime.
  const toggleMode = useCallback(() => {
    const g = gs.current;
    if (!g) return;
    g.mode = g.mode === "play" ? "practice" : "play";
    stageRef.current?.setGhostEnabled(g.mode === "play");
    // Reset fall/lock accumulators so the switch takes effect cleanly.
    g.gravAccum = 0;
    g.lockAccum = 0;
    g.grounded = false;
    syncHud();
  }, [syncHud]);

  const restart = useCallback(() => {
    const g = gs.current;
    if (!g) return;
    g.grid = emptyGrid();
    g.piece = null;
    g.bag = new ColorBag();
    g.queue = [g.bag.pair(), g.bag.pair(), g.bag.pair()];
    g.score = 0;
    g.chain = 0;
    g.maxChain = 0;
    g.chainScore = 0;
    g.garbageLeftover = 0;
    g.garbageSent = 0;
    g.steps = [];
    g.predrop = null;
    g.softDrop = false;
    g.dir = 0;
    stageRef.current?.puyo.syncStatic(g.grid);
    stageRef.current?.setScore(0);
    stageRef.current?.setGarbage(0);
    stageRef.current?.hideChain();
    spawnNext();
  }, [spawnNext]);

  return { hostRef, hud, pause, resume, restart, toggleMode };
}
