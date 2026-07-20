// The game-loop hook: owns the mutable game state, drives the Pixi stage via
// its ticker, handles keyboard input (DAS/ARR), and exposes HUD state + actions
// to React. Practice mode = no auto gravity / no lock delay; Play mode = full.
import { useCallback, useEffect, useRef, useState } from "react";

import {
  ALL_CLEAR_BONUS,
  HIDDEN_ROWS,
  ROWS,
  SPAWN_COL,
  SPAWN_ROW,
  TARGET_POINT,
  TIMING,
} from "../lib/config";
import {
  applyGravity,
  emptyGrid,
  hardDropPiece,
  isAllClear,
  isTopOut,
  lockPiece,
  move as movePiece,
  pieceCells,
  resolveChains,
  rotate as rotatePiece,
  stepDown,
} from "../lib/engine";
import { ColorBag } from "../lib/rng";
import { sfx } from "../lib/sound";
import { PuyoStage } from "../pixi/puyo-stage";

import type { ChainStep, Color, Grid, Mode, Piece } from "../lib/types";

// Fixed logic timestep: step the control loop at a constant 60 Hz so DAS/ARR,
// gravity and lock delay are frame-perfect regardless of the display refresh
// rate (60/120/144 Hz all play identically, like console Puyo).
const FIXED_STEP = 1000 / 60;
// Cap how many times a move/rotate may reset the lock delay while grounded, so
// a piece can't be stalled on the floor forever (commercial "lock reset" cap).
const MAX_LOCK_RESETS = 15;
// When the pair is soft-dropped (down held) into a landing, lock almost
// instantly (~2 frames) so the chain check fires the moment it slams down.
// Natural free-fall landings instead use the tunable TIMING.lockDelay grace.
const SOFT_DROP_LOCK = FIXED_STEP * 2;
// After a tab-out / long stall, cap how much simulation time we replay in one
// frame so we don't fast-forward wildly (a few frames of catch-up at most).
const MAX_CATCHUP_MS = 200;

export type Status = "loading" | "control" | "resolve" | "paused" | "gameover";

// HUD state surfaced to React. Score/next-pair/chain popup are drawn inside the
// Pixi canvas, so React only needs what the overlays read.
interface Hud {
  status: Status;
  score: number;
  maxChain: number;
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
  garbageSent: number;
  // gravity / lock
  gravAccum: number;
  lockAccum: number;
  grounded: boolean;
  softDrop: boolean;
  // horizontal auto-shift
  dir: -1 | 0 | 1;
  // Physically-held direction keys, last element = active direction.
  // Deriving g.dir from this each edge (instead of trusting keydown/keyup
  // edges alone) fixes "holding a direction stops working" when keys overlap
  // or when the OS key-repeat switches to the most-recently-pressed key.
  dirStack: (-1 | 1)[];
  dasAccum: number;
  arrAccum: number;
  // Fixed-timestep accumulator (drains in FIXED_STEP chunks each frame).
  acc: number;
  // Lock-delay reset count while grounded (capped by MAX_LOCK_RESETS).
  lockResets: number;
  // IRS (initial rotation system): rotation pressed during a resolve, applied
  // the instant the next pair spawns so fast inputs are never dropped.
  bufferedRot: number;
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

// Time for a batch of puyos to fall `md` rows at constant speed, plus the
// landing bounce tail. md === 0 -> just the in-place bounce.
function fallMs(md: number): number {
  return TIMING.dropPerRowMs * md + TIMING.bounceMs;
}

// Duration of the pre-drop settle for the whole board (pure: depends only on
// the grid diff + TIMING, so it lives at module scope and needs no memoizing).
function dropDuration(stage: PuyoStage | null, from: Grid, to: Grid): number {
  return fallMs(stage?.puyo.maxDrop(from, to) ?? 0);
}

// Active horizontal direction = the most-recently-pressed held key (SOCD:
// last press wins), or 0 when nothing is held.
function currentDir(stack: (-1 | 1)[]): -1 | 0 | 1 {
  return stack.length ? stack[stack.length - 1] : 0;
}

// Recompute g.dir from the held-key stack. When the active direction changes
// we reset DAS/ARR and do one immediate step (only while under control), so a
// still-held key resumes the instant the conflicting key is released.
function applyDir(g: GameState, stage: PuyoStage): void {
  const want = currentDir(g.dirStack);
  if (want === g.dir) return;
  g.dir = want;
  g.dasAccum = 0;
  g.arrAccum = 0;
  if (want !== 0 && g.status === "control" && g.piece) {
    const before = g.piece.c;
    g.piece = movePiece(g.grid, g.piece, want);
    if (g.piece.c !== before) sfx.move();
    resetLock(g);
    stage.showActive(g.grid, g.piece);
  }
}

function pressDir(g: GameState, stage: PuyoStage, d: -1 | 1): void {
  if (!g.dirStack.includes(d)) g.dirStack.push(d);
  applyDir(g, stage);
}

function releaseDir(g: GameState, stage: PuyoStage, d: -1 | 1): void {
  const i = g.dirStack.lastIndexOf(d);
  if (i !== -1) g.dirStack.splice(i, 1);
  applyDir(g, stage);
}

// Reset the lock-delay timer after a move/rotate, but only up to a cap while
// grounded so a grounded piece can't be kept alive indefinitely by wiggling.
function resetLock(g: GameState): void {
  if (g.grounded) {
    if (g.lockResets >= MAX_LOCK_RESETS) return;
    g.lockResets++;
  }
  g.lockAccum = 0;
}

export function usePuyoGame(initialMode: Mode = "play") {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<PuyoStage | null>(null);
  const gs = useRef<GameState | null>(null);
  const [hud, setHud] = useState<Hud>({
    status: "loading",
    score: 0,
    maxChain: 0,
  });

  const syncHud = useCallback(() => {
    const g = gs.current;
    if (!g) return;
    setHud({
      status: g.status,
      score: g.score,
      maxChain: g.maxChain,
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
      stageRef.current?.pauseLoop();
      syncHud();
      return;
    }
    // Not topped out: consume the next pair (peeked, so the queue/RNG only
    // advances when a piece actually spawns) and enqueue a fresh one.
    const [axis, sat] = g.queue.shift()!;
    g.queue.push(g.bag.pair());
    const p: Piece = { r: SPAWN_ROW, c: SPAWN_COL, axis, sat, orient: 0 };
    g.piece = p;
    // IRS: apply any rotation buffered during the previous resolve.
    if (g.bufferedRot !== 0) {
      const dir = g.bufferedRot > 0 ? 1 : -1;
      let n = Math.abs(g.bufferedRot);
      while (n-- > 0) g.piece = rotatePiece(g.grid, g.piece, dir);
      g.bufferedRot = 0;
    }
    stageRef.current?.setNext(g.queue.slice(0, 2));
    g.gravAccum = 0;
    g.lockAccum = 0;
    g.lockResets = 0;
    g.grounded = false;
    g.acc = 0;
    g.status = "control";
    // IMS / DAS charge: if a direction was held through the previous piece and
    // DAS is already charged, prime ARR so the new pair auto-shifts toward the
    // wall on the very next step (no re-delay) — console Puyo's "DAS charge".
    if (g.dir !== 0 && g.dasAccum >= TIMING.das) g.arrAccum = TIMING.arr;
    stageRef.current?.showActive(g.grid, g.piece);
    syncHud();
  }, [syncHud]);

  // ---- locking + starting a resolve --------------------------------------
  const beginResolve = useCallback(() => {
    const g = gs.current!;
    if (!g.piece) return;
    const placed = pieceCells(g.piece);
    // Hidden overflow rows (r in [HIDDEN_ROWS-2, HIDDEN_ROWS)) are placeable:
    // puyos may rest off-screen there like the real game — they never pop
    // (clearing is board-only, rows >= HIDDEN_ROWS). Refuse to lock a pair only
    // when a cell sticks out ABOVE those rows (r < HIDDEN_ROWS-2, off the top of
    // the grid) OR overlaps an already-occupied cell. The overlap check matters
    // because practice never tops out: once a column fills into the hidden rows
    // the next pair spawns onto an occupied cell and would re-lock on the same
    // spot every frame (placeCell then silently drops it) -> "double placement".
    if (
      g.mode === "practice" &&
      placed.some(
        (c) => c.r < HIDDEN_ROWS - 2 || (c.r >= 0 && g.grid[c.r][c.c] !== 0),
      )
    ) {
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
    g.phaseDur = dropDuration(stageRef.current, locked, settled);
    g.status = "resolve";
    syncHud();
  }, [syncHud]);

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
      stageRef.current?.setBestChain(g.maxChain);
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

  // One fixed 60 Hz step of the under-control simulation: DAS charge, ARR
  // auto-shift, gravity and lock delay. Returns true if it started a resolve
  // (so the frame driver stops stepping this frame).
  const stepControl = useCallback(
    (g: GameState): boolean => {
      if (g.status !== "control" || !g.piece) return false;

      // DAS charge -> ARR auto-shift, at a fixed cadence (frame-perfect).
      if (g.dir !== 0) {
        if (g.dasAccum < TIMING.das) {
          g.dasAccum = Math.min(g.dasAccum + FIXED_STEP, TIMING.das);
        }
        if (g.dasAccum >= TIMING.das) {
          g.arrAccum += FIXED_STEP;
          while (g.arrAccum >= TIMING.arr) {
            const before = g.piece.c;
            g.piece = movePiece(g.grid, g.piece, g.dir);
            if (g.piece.c !== before) resetLock(g);
            g.arrAccum -= TIMING.arr;
          }
        }
      }

      if (g.mode === "play") {
        const interval = g.softDrop ? TIMING.softDrop : TIMING.gravity;
        g.gravAccum += FIXED_STEP;
        while (g.gravAccum >= interval) {
          const np = stepDown(g.grid, g.piece);
          if (np) {
            g.piece = np;
            g.gravAccum -= interval;
          } else {
            g.gravAccum = 0;
            break;
          }
        }
        // Detect grounding EVERY frame (not only on a gravity tick) so the lock
        // timer starts the instant the pair can no longer fall. Otherwise it
        // would wait up to a full gravity interval (~780ms) before even noticing
        // the landing, which made lockDelay changes look like they did nothing.
        if (stepDown(g.grid, g.piece) === null) {
          if (!g.grounded) {
            g.grounded = true;
            g.lockAccum = 0;
          }
          g.lockAccum += FIXED_STEP;
          // Holding soft-drop locks the pair almost instantly on landing so the
          // chain check fires the moment it settles (commercial soft-drop lock).
          const lockAt = g.softDrop ? SOFT_DROP_LOCK : TIMING.lockDelay;
          if (g.lockAccum >= lockAt) {
            beginResolve();
            return true;
          }
        } else {
          g.grounded = false;
          g.lockAccum = 0;
        }
      } else {
        // Practice: no auto gravity; the pair floats until soft-dropped, then
        // auto-locks a short moment after it can no longer fall.
        if (g.softDrop && stepDown(g.grid, g.piece)) {
          g.gravAccum += FIXED_STEP;
          while (g.gravAccum >= TIMING.softDrop) {
            const np = stepDown(g.grid, g.piece);
            if (np) {
              g.piece = np;
              g.grounded = false;
              g.lockAccum = 0;
              g.lockResets = 0;
            }
            g.gravAccum -= TIMING.softDrop;
          }
        }
        if (g.piece && stepDown(g.grid, g.piece) === null) {
          g.grounded = true;
          g.lockAccum += FIXED_STEP;
          const lockAt = g.softDrop ? SOFT_DROP_LOCK : TIMING.lockDelay;
          if (g.lockAccum >= lockAt) {
            beginResolve();
            return true;
          }
        } else {
          g.grounded = false;
          g.lockAccum = 0;
        }
      }
      return false;
    },
    [beginResolve],
  );

  // ---- main tick ---------------------------------------------------------
  const tick = useCallback(
    (ms: number) => {
      const g = gs.current;
      const stage = stageRef.current;
      if (!g || !stage) return;

      // Fixed-timestep control loop: advance the simulation in constant 60 Hz
      // slices so DAS/ARR, gravity and lock delay behave identically on any
      // refresh rate (console-accurate). Rendering still happens once per real
      // frame below, with sub-cell interpolation for smoothness.
      if (g.status === "control") {
        g.acc += ms;
        if (g.acc > MAX_CATCHUP_MS) g.acc = MAX_CATCHUP_MS;
        while (g.acc >= FIXED_STEP) {
          if (stepControl(g)) {
            g.acc = 0;
            break;
          }
          g.acc -= FIXED_STEP;
        }
        if (g.status === "control" && g.piece) {
          // Sub-cell fall progress -> smooth constant-speed descent in the view
          // (logic steps whole rows; this is purely visual interpolation).
          // Gate on whether the pair can ACTUALLY fall one row right now, NOT
          // the lagging `grounded` flag, so the fraction never overshoots and
          // then snaps back up a cell -> the "retract upward" glitch.
          // Only SOFT DROP interpolates sub-cell for a smooth press-and-hold
          // descent. Natural gravity is intentionally STEPPED: the pair holds
          // its row and snaps down a whole cell each interval, giving the
          // classic tick-tick-tick free-fall feel instead of a continuous
          // 60fps glide. (Practice has no auto gravity, so it only ever falls
          // via soft drop -> smooth.)
          let fallFrac = 0;
          if (g.softDrop && stepDown(g.grid, g.piece) !== null) {
            fallFrac = Math.min(g.gravAccum / TIMING.softDrop, 1);
          }
          stage.showActive(g.grid, g.piece, ms, fallFrac);
        }
        return;
      }

      // Between pieces (during a resolve): keep charging DAS from real time so a
      // held direction slams the next pair to the wall the instant it spawns.
      if (g.dir !== 0 && g.dasAccum < TIMING.das) {
        g.dasAccum = Math.min(g.dasAccum + ms, TIMING.das);
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
              g.phaseDur = fallMs(md);
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
    [stepControl, finishResolve, startStep],
  );

  // ---- input -------------------------------------------------------------
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const g = gs.current;
      const stage = stageRef.current;
      if (!g || !stage) return;
      sfx.unlock();

      // Movement/soft-drop keys are tracked in EVERY state (see pressDir): held
      // state stays correct through a resolve so it resumes on the next pair,
      // and g.dir is derived from the held set, not fragile keydown/keyup edges.
      const inControl = g.status === "control" && !!g.piece;
      switch (e.code) {
        case "ArrowLeft":
          e.preventDefault();
          pressDir(g, stage, -1);
          return;
        case "ArrowRight":
          e.preventDefault();
          pressDir(g, stage, 1);
          return;
        case "ArrowDown":
          e.preventDefault();
          // Rescale the gravity clock so sub-cell fall progress is
          // preserved when switching to soft-drop speed: the piece keeps its
          // exact position and simply falls faster (no jump, no reset stutter).
          if (inControl && !g.softDrop && g.mode === "play") {
            const frac = g.gravAccum / TIMING.gravity;
            g.gravAccum = frac * TIMING.softDrop;
          }
          g.softDrop = true;
          return;
        case "KeyZ":
        case "ControlLeft":
          e.preventDefault();
          if (inControl) {
            g.piece = rotatePiece(g.grid, g.piece!, -1);
            sfx.spin();
            resetLock(g);
            stage.showActive(g.grid, g.piece);
          } else {
            g.bufferedRot = Math.max(-2, g.bufferedRot - 1); // IRS buffer
          }
          return;
        case "KeyX":
        case "ArrowUp":
          e.preventDefault();
          if (inControl) {
            g.piece = rotatePiece(g.grid, g.piece!, 1);
            sfx.spin();
            resetLock(g);
            stage.showActive(g.grid, g.piece);
          } else {
            g.bufferedRot = Math.min(2, g.bufferedRot + 1); // IRS buffer
          }
          return;
        case "Space":
          e.preventDefault();
          if (inControl) {
            g.piece = hardDropPiece(g.grid, g.piece!);
            beginResolve();
          }
          return;
        default:
          return;
      }
    },
    [beginResolve],
  );

  const onKeyUp = useCallback((e: KeyboardEvent) => {
    const g = gs.current;
    const stage = stageRef.current;
    if (!g || !stage) return;
    if (e.code === "ArrowDown") {
      // Convert soft-drop progress back onto the natural-gravity clock so the
      // piece resumes falling seamlessly on release -> no dead pause before the
      // next cell, and no visual snap (fall fraction stays continuous).
      if (g.softDrop && g.mode === "play") {
        const frac = g.gravAccum / TIMING.softDrop;
        g.gravAccum = frac * TIMING.gravity;
      }
      g.softDrop = false;
    }
    if (e.code === "ArrowLeft") releaseDir(g, stage, -1);
    if (e.code === "ArrowRight") releaseDir(g, stage, 1);
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
      garbageSent: 0,
      gravAccum: 0,
      lockAccum: 0,
      grounded: false,
      softDrop: false,
      dir: 0,
      dirStack: [],
      dasAccum: 0,
      arrAccum: 0,
      acc: 0,
      lockResets: 0,
      bufferedRot: 0,
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
      stage.setGhostEnabled(true); // ghost + clear-preview on in both play and practice
      if (cancelled) return;
      stage.onTick(tick);
      stage.bindControls(toggleMode, restart);
      stage.setMode(gs.current!.mode);
      stage.puyo.syncStatic(gs.current!.grid);
      stage.setScore(0);
      stage.setBestChain(gs.current!.maxChain);
      spawnNext();
    })();

    // Losing focus (alt-tab, clicking away) can drop keyup events, which used
    // to leave a direction or soft-drop stuck on. Clear all held-key state on
    // blur so input never gets wedged.
    const onBlur = () => {
      const g = gs.current;
      if (!g) return;
      g.dirStack = [];
      g.dir = 0;
      g.softDrop = false;
      g.dasAccum = 0;
      g.arrAccum = 0;
      g.bufferedRot = 0;
    };
    const onVisibility = () => {
      if (document.hidden) stageRef.current?.pauseLoop();
      else if (
        gs.current?.status !== "paused" &&
        gs.current?.status !== "gameover"
      )
        stageRef.current?.resumeLoop();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      stage.destroy();
      stageRef.current = null;
      gs.current = null;
    };
    // Mount-once effect: every handler it uses is stable via refs (gs/stageRef)
    // or reads live state through gs.current, so an empty dep array is correct
    // here — re-running would tear down and rebuild the Pixi stage needlessly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- actions -----------------------------------------------------------
  const pause = useCallback(() => {
    const g = gs.current;
    if (g && g.status === "control") {
      g.status = "paused";
      g.softDrop = false;
      g.dir = 0;
      g.dirStack = [];
      stageRef.current?.pauseLoop();
      syncHud();
    }
  }, [syncHud]);

  const resume = useCallback(() => {
    const g = gs.current;
    if (g && g.status === "paused") {
      g.status = "control";
      stageRef.current?.resumeLoop();
      syncHud();
    }
  }, [syncHud]);

  // Play/pause toggle: flips gravity on/off (play <-> practice) at runtime.
  const toggleMode = useCallback(() => {
    const g = gs.current;
    if (!g) return;
    g.mode = g.mode === "play" ? "practice" : "play";
    stageRef.current?.setMode(g.mode);
    // Reset fall/lock accumulators so the switch takes effect cleanly.
    g.gravAccum = 0;
    g.lockAccum = 0;
    g.grounded = false;
    syncHud();
  }, [syncHud]);

  // ---- touch / imperative actions (mobile) -------------------------------
  // These mirror the keyboard handlers but are driven by pointer gestures in
  // Game.tsx. Each is a no-op unless a piece is under player control, so they
  // are safe to fire at any time. Discrete column steps (not DAS/ARR) so a
  // finger drag maps 1 column-width -> 1 column move; g.dir stays 0.
  const touchMove = useCallback((dir: -1 | 1) => {
    const g = gs.current;
    const stage = stageRef.current;
    if (!g || !stage || g.status !== "control" || !g.piece) return;
    const before = g.piece.c;
    g.piece = movePiece(g.grid, g.piece, dir);
    if (g.piece.c !== before) sfx.move();
    resetLock(g);
    stage.showActive(g.grid, g.piece);
  }, []);

  const touchRotate = useCallback((dir: -1 | 1) => {
    const g = gs.current;
    const stage = stageRef.current;
    if (!g || !stage || g.status !== "control" || !g.piece) return;
    sfx.unlock();
    g.piece = rotatePiece(g.grid, g.piece, dir);
    sfx.spin();
    resetLock(g);
    stage.showActive(g.grid, g.piece);
  }, []);

  // Discrete one-cell drop for touch drag: moving the finger down by one
  // cell-height steps the pair down exactly one row (fully controllable,
  // no accumulator burst). Resets lock delay so it doesn't lock mid-drag.
  const touchStepDown = useCallback(() => {
    const g = gs.current;
    const stage = stageRef.current;
    if (!g || !stage || g.status !== "control" || !g.piece) return;
    const np = stepDown(g.grid, g.piece);
    if (np) {
      g.piece = np;
      g.grounded = false;
      g.lockAccum = 0;
      g.lockResets = 0;
      stage.showActive(g.grid, g.piece);
    }
  }, []);

  // Screen-space hit-test for the in-canvas control buttons, so Game.tsx can
  // skip starting a board touch-gesture when a tap lands on them.
  const hitControls = useCallback((x: number, y: number): boolean => {
    return stageRef.current?.hitControls(x, y) ?? false;
  }, []);

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
    g.garbageSent = 0;
    g.steps = [];
    g.predrop = null;
    g.softDrop = false;
    g.dir = 0;
    g.dirStack = [];
    g.bufferedRot = 0;
    g.dasAccum = 0;
    g.arrAccum = 0;
    g.acc = 0;
    g.lockResets = 0;
    stageRef.current?.puyo.syncStatic(g.grid);
    stageRef.current?.setScore(0);
    stageRef.current?.setGarbage(0);
    stageRef.current?.setBestChain(0);
    stageRef.current?.hideChain();
    stageRef.current?.resumeLoop();
    spawnNext();
  }, [spawnNext]);

  return {
    hostRef,
    hud,
    pause,
    resume,
    restart,
    toggleMode,
    touchMove,
    touchRotate,
    touchStepDown,
    hitControls,
  };
}
