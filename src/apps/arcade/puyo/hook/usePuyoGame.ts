// ============================================================================
// usePuyoGame — the game's beating heart as a single hook.
// Owns: the Puyo engine, the requestAnimationFrame loop, gravity & lock-delay,
// keyboard input (DAS/ARR), the chain-resolution animation, and sound.
// Returns immutable state for rendering plus canvas refs and player actions.
// Loop and listeners are wired ONCE on mount and read live values through refs.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import {
  ARR,
  CELL,
  DAS,
  FLASH_MS,
  HELP_EVENT,
  KEY_HARD_DROP,
  KEY_LEFT,
  KEY_PAUSE,
  KEY_RIGHT,
  KEY_ROTATE_CCW_Z,
  KEY_ROTATE_CCW_Z_UPPER,
  KEY_ROTATE_CW_ARROW,
  KEY_ROTATE_CW_X,
  KEY_ROTATE_CW_X_UPPER,
  KEY_SOFT_DROP,
  LOCK_DELAY,
  NEXT_CELL,
  NEXT_COUNT,
  NEXT_SLOT_H,
  NEXT_W,
  POP_MS,
  FALL_ACCEL,
  SETTLE_MIN_MS,
  SOFT_DROP_MS,
  TOAST_MS,
  gravityMsForChainCount,
} from "../lib/config";
import { Puyo } from "../lib/engine";
import { drawBoard, drawNext } from "../lib/render";
import {
  isMuted,
  preloadSfx,
  setMuted,
  sfxAllClear,
  sfxDrop,
  sfxHardDrop,
  sfxLand,
  sfxMove,
  sfxPop,
  sfxRotate,
} from "../lib/sound";

export type Phase = "idle" | "playing" | "paused" | "over";

export interface Hud {
  score: number;
  chainMax: number;
  cleared: number;
}

export interface PuyoController {
  phase: Phase;
  hud: Hud;
  chain: number; // live chain count during a resolving reaction (0 when idle)
  help: boolean;
  muted: boolean;
  boardRef: React.RefObject<HTMLCanvasElement | null>;
  nextRef: React.RefObject<HTMLCanvasElement | null>;
  start: () => void;
  resume: () => void;
  pause: () => void;
  quit: () => void;
  toggleMute: () => void;
  closeHelp: () => void;
}

export function usePuyoGame(onQuit?: () => void): PuyoController {
  const boardRef = useRef<HTMLCanvasElement>(null);
  const nextRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Puyo | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [hud, setHud] = useState<Hud>({ score: 0, chainMax: 0, cleared: 0 });
  const [chain, setChain] = useState(0);
  const [help, setHelp] = useState(false);
  const [muted, setMutedState] = useState(false);

  const phaseRef = useRef<Phase>("idle");
  phaseRef.current = phase;

  // True while a chain reaction is animating — freezes gravity & input.
  const resolvingRef = useRef(false);
  // Whether the active pair should be drawn (false during resolve / spawn gap).
  const hasActiveRef = useRef(false);
  const chainTimer = useRef<number | null>(null);
  const badgeTimer = useRef<number | null>(null);
  // Cells blinking/popping this chain link + when the flash started (for the loop).
  const flashCellsRef = useRef<[number, number][] | null>(null);
  const flashStartRef = useRef(0);
  // Puyos currently falling+settling after a pop (from/to rows) + start time.
  const settleRef = useRef<{
    moves: { col: number; from: number; to: number }[];
    start: number;
  } | null>(null);

  const renderRef = useRef<() => void>(() => {});

  function render() {
    const g = gameRef.current;
    const bctx = boardRef.current?.getContext("2d");
    if (bctx) {
      const showActive =
        hasActiveRef.current &&
        (phaseRef.current === "playing" || phaseRef.current === "paused");
      const flash = flashCellsRef.current
        ? {
            cells: flashCellsRef.current,
            t: performance.now() - flashStartRef.current,
          }
        : null;
      // Only predict a clear while the pair is live and controllable — not while
      // a chain is resolving or the pair is hidden.
      const predict =
        showActive && g && phaseRef.current === "playing" ? g.predict() : null;
      // Post-pop settle: draw each moved puyo lifted toward its old row, easing to 0.
      let fall: Map<string, number> | null = null;
      if (settleRef.current) {
        const { moves, start } = settleRef.current;
        // Cells fallen so far under constant gravity: d = 1/2 * a * t^2. Each
        // puyo is drawn lifted toward its OLD row by however far it still has to
        // go, so they all accelerate together and land at distance-scaled times.
        const t = performance.now() - start;
        const fallenCells = 0.5 * FALL_ACCEL * t * t;
        fall = new Map();
        for (const m of moves) {
          const dist = m.to - m.from; // cells to fall (positive = downward)
          const remaining = Math.max(0, dist - fallenCells);
          fall.set(m.to + "," + m.col, -remaining * CELL);
        }
      }
      // Active pair snaps cell-to-cell as gravity steps it down a full row per
      // tick — no sub-cell glide. (Post-pop air-puyo settle still animates below.)
      const pairOffsetPx = 0;
      drawBoard(
        bctx,
        g ? g.grid : null,
        showActive && g ? g.pair : null,
        showActive && g ? g.ghostSettled() : null,
        flash,
        predict,
        fall,
        pairOffsetPx,
      );
    }
    const nctx = nextRef.current?.getContext("2d");
    if (nctx) {
      nctx.clearRect(0, 0, NEXT_W, NEXT_COUNT * NEXT_SLOT_H);
      if (g) drawNext(nctx, g.next(NEXT_COUNT), NEXT_W, NEXT_SLOT_H, NEXT_CELL);
    }
    if (g) setHud({ score: g.score, chainMax: g.chainMax, cleared: g.cleared });
  }
  renderRef.current = render;

  // ---- chain resolution animation -----------------------------------------
  function beginResolve() {
    const g = gameRef.current!;
    resolvingRef.current = true;
    hasActiveRef.current = false;
    let chainIdx = 0;

    // Once puyos have settled: detect groups, blink them, then remove+score.
    const detect = () => {
      const groups = g.findClearGroups();
      renderRef.current();
      if (groups.length === 0) {
        finishResolve();
        return;
      }
      // FLASH phase: puyos stay on the board and blink; the loop animates them.
      const cells: [number, number][] = [];
      for (const grp of groups) for (const cell of grp) cells.push(cell);
      flashCellsRef.current = cells;
      flashStartRef.current = performance.now();
      // COMMIT phase: after the flash, actually remove + score, then next link.
      chainTimer.current = window.setTimeout(() => {
        flashCellsRef.current = null;
        const result = g.commitClear(++chainIdx, groups);
        setChain(result.chain);
        sfxPop(result.chain);
        renderRef.current();
        chainTimer.current = window.setTimeout(step, POP_MS);
      }, FLASH_MS);
    };

    // Apply gravity; if puyos fall, animate the settle. Whether we WAIT for that
    // fall before spawning the next pair depends on if a chain is coming:
    //   • chain coming -> stay frozen, animate the fall, then pop (detect()).
    //   • no chain     -> spawn the next pair NOW and let the old puyos finish
    //     falling underneath (purely visual; the grid is already settled), so
    //     the player never waits on the settle animation to regain control.
    const step = () => {
      const moves = g.applyGravityAnimated();
      if (moves.length === 0) {
        detect();
        return;
      }
      settleRef.current = { moves, start: performance.now() };
      // Fall runs until the FARTHEST puyo lands: t = sqrt(2d/a) — a real fall.
      let maxDist = 0;
      for (const m of moves) maxDist = Math.max(maxDist, m.to - m.from);
      const dur = Math.max(
        SETTLE_MIN_MS,
        Math.sqrt((2 * maxDist) / FALL_ACCEL),
      );
      const willClear = g.findClearGroups().length > 0;
      if (willClear) {
        // Real chain — keep the board frozen through the fall, then pop.
        chainTimer.current = window.setTimeout(() => {
          settleRef.current = null;
          detect();
        }, dur);
      } else {
        // No chain — spawn immediately; just clear the settle overlay when the
        // fall finishes, without blocking control on it.
        chainTimer.current = window.setTimeout(() => {
          settleRef.current = null;
          renderRef.current();
        }, dur);
        finishResolve();
      }
    };
    // Start the post-lock settle immediately — no mid-air hang before it falls.
    step();
  }

  function finishResolve() {
    const g = gameRef.current!;
    if (g.isAllClear() && g.cleared > 0) {
      g.score += 2100;
      sfxAllClear();
    }
    resolvingRef.current = false;
    g.spawnActive();
    if (g.over) {
      setPhase("over");
      renderRef.current();
      return;
    }
    hasActiveRef.current = true;
    renderRef.current();
    // Fade the chain badge shortly after the reaction ends.
    if (badgeTimer.current !== null) clearTimeout(badgeTimer.current);
    badgeTimer.current = window.setTimeout(() => setChain(0), TOAST_MS);
  }

  // ---- game loop + input (mounted once) ------------------------------------
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let dropAcc = 0;
    let lockAcc = 0;
    let grounded = false;
    let dir = 0;
    let dasAcc = 0;
    let arrAcc = 0;
    const held = new Set<string>();
    const softActive = () => held.has(KEY_SOFT_DROP);

    function lockNow() {
      const g = gameRef.current!;
      sfxLand();
      g.lockPair();
      grounded = false;
      lockAcc = 0;
      beginResolve();
    }

    function loop(now: number) {
      raf = requestAnimationFrame(loop);
      const dt = now - last;
      last = now;
      const g = gameRef.current;
      if (!g || phaseRef.current !== "playing" || resolvingRef.current) {
        renderRef.current();
        return;
      }

      // Horizontal DAS/ARR.
      if (dir !== 0) {
        dasAcc += dt;
        if (dasAcc >= DAS) {
          arrAcc += dt;
          while (arrAcc >= ARR) {
            if (g.move(dir)) sfxMove();
            arrAcc -= ARR;
          }
        }
      }

      // Gravity.
      const interval = softActive()
        ? Math.min(gravityMsForChainCount(g.cleared), SOFT_DROP_MS)
        : gravityMsForChainCount(g.cleared);
      dropAcc += dt;
      if (dropAcc >= interval) {
        dropAcc = 0;
        if (g.softDrop()) {
          if (softActive()) g.score += 1;
          sfxDrop();
          grounded = false;
          lockAcc = 0;
        } else {
          grounded = true;
        }
      }

      // Lock delay once resting.
      if (grounded) {
        if (g.canFall()) {
          grounded = false;
          lockAcc = 0;
        } else {
          lockAcc += dt;
          if (lockAcc >= LOCK_DELAY) lockNow();
        }
      }
      renderRef.current();
    }
    raf = requestAnimationFrame(loop);

    function onKeyDown(e: KeyboardEvent) {
      if (phaseRef.current !== "playing") {
        if (e.key === KEY_PAUSE && phaseRef.current === "paused") {
          e.preventDefault();
          setPhase("playing");
        }
        if (
          e.key === KEY_HARD_DROP &&
          (phaseRef.current === "idle" || phaseRef.current === "over")
        ) {
          e.preventDefault();
          startGame();
        }
        return;
      }
      if (resolvingRef.current) {
        if (e.key === KEY_HARD_DROP) e.preventDefault();
        return;
      }
      const g = gameRef.current!;
      switch (e.key) {
        case KEY_LEFT:
          if (!held.has(KEY_LEFT)) {
            held.add(KEY_LEFT);
            dir = -1;
            dasAcc = 0;
            arrAcc = 0;
            if (g.move(-1)) {
              sfxMove();
              if (grounded) lockAcc = 0;
            }
          }
          break;
        case KEY_RIGHT:
          if (!held.has(KEY_RIGHT)) {
            held.add(KEY_RIGHT);
            dir = 1;
            dasAcc = 0;
            arrAcc = 0;
            if (g.move(1)) {
              sfxMove();
              if (grounded) lockAcc = 0;
            }
          }
          break;
        case KEY_SOFT_DROP:
          held.add(KEY_SOFT_DROP);
          break;
        case KEY_ROTATE_CW_ARROW:
        case KEY_ROTATE_CW_X:
        case KEY_ROTATE_CW_X_UPPER:
          if (g.rotate(1)) {
            sfxRotate();
            if (grounded) lockAcc = 0;
          }
          break;
        case KEY_ROTATE_CCW_Z:
        case KEY_ROTATE_CCW_Z_UPPER:
          if (g.rotate(-1)) {
            sfxRotate();
            if (grounded) lockAcc = 0;
          }
          break;
        case KEY_HARD_DROP:
          e.preventDefault();
          g.hardDrop();
          sfxHardDrop();
          lockNow();
          break;
        case KEY_PAUSE:
          e.preventDefault();
          setPhase("paused");
          break;
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      held.delete(e.key);
      if (e.key === KEY_LEFT && dir === -1) dir = held.has(KEY_RIGHT) ? 1 : 0;
      if (e.key === KEY_RIGHT && dir === 1) dir = held.has(KEY_LEFT) ? -1 : 0;
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      cancelAnimationFrame(raf);
      if (chainTimer.current !== null) clearTimeout(chainTimer.current);
      if (badgeTimer.current !== null) clearTimeout(badgeTimer.current);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const openHelp = () => setHelp(true);
    window.addEventListener(HELP_EVENT, openHelp);
    return () => window.removeEventListener(HELP_EVENT, openHelp);
  }, []);

  function startGame() {
    preloadSfx();
    gameRef.current = new Puyo();
    resolvingRef.current = false;
    hasActiveRef.current = true;
    flashCellsRef.current = null;
    settleRef.current = null;
    setChain(0);
    setHelp(false);
    if (chainTimer.current !== null) clearTimeout(chainTimer.current);
    if (badgeTimer.current !== null) clearTimeout(badgeTimer.current);
    setPhase("playing");
  }

  return {
    phase,
    hud,
    chain,
    help,
    muted,
    boardRef,
    nextRef,
    start: startGame,
    resume: () => setPhase("playing"),
    pause: () => setPhase("paused"),
    quit: () => (onQuit ? onQuit() : setPhase("idle")),
    toggleMute: () => {
      const m = !isMuted();
      setMuted(m);
      setMutedState(m);
    },
    closeHelp: () => setHelp(false),
  };
}
