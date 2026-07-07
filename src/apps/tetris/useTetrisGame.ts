// ============================================================================
// useTetrisGame — the game's beating heart as a single hook.
// Owns: the Tetris engine instance, the requestAnimationFrame loop, gravity &
// lock-delay, keyboard input (DAS/ARR), the line-clear animation, and sound.
// Returns immutable state for rendering plus canvas refs and player actions.
// The loop and listeners are wired ONCE on mount and read live values through
// refs, so they never need to re-subscribe.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { HIDDEN_ROWS, Tetris } from "./engine";

const TOAST_MS = 1500;
import {
  preloadSfx,
  sfxClear,
  sfxDrop,
  sfxDropdown,
  sfxHardDrop,
  sfxHold,
  sfxMove,
  sfxRotate,
} from "./sfx";
import {
  ARR,
  CLEAR_MS,
  DAS,
  HOLD_CELL,
  HOLD_H,
  HOLD_W,
  LOCK_DELAY,
  LOCK_RESET_CAP,
  NEXT_CELL,
  NEXT_COUNT,
  NEXT_SLOT_H,
  NEXT_W,
  SOFT_DROP_MS,
} from "./tetrisConfig";
import { composeMessage, type ClearMessage } from "./tetrisMessages";
import { drawBoard, drawMini, type ClearAnimation } from "./tetrisRender";

export type Phase = "idle" | "playing" | "paused" | "over";
export interface Hud {
  score: number;
  lines: number;
  level: number;
}
export interface Toast extends ClearMessage {
  key: number;
}

export interface TetrisController {
  phase: Phase;
  hud: Hud;
  toast: Toast | null;
  b2bOn: boolean;
  ren: number;
  help: boolean;
  boardRef: React.RefObject<HTMLCanvasElement | null>;
  holdRef: React.RefObject<HTMLCanvasElement | null>;
  nextRef: React.RefObject<HTMLCanvasElement | null>;
  start: () => void; // new game
  resume: () => void; // un-pause
  quit: () => void; // leave (delegates to onQuit)
  closeHelp: () => void;
}

export function useTetrisGame(onQuit?: () => void): TetrisController {
  const boardRef = useRef<HTMLCanvasElement>(null);
  const holdRef = useRef<HTMLCanvasElement>(null);
  const nextRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Tetris | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [hud, setHud] = useState<Hud>({ score: 0, lines: 0, level: 1 });
  const [help, setHelp] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  // Persistent status (TETR.IO-style): B2B and REN live as long as their chain
  // survives — they do NOT fade with the transient clear label.
  const [b2bOn, setB2bOn] = useState(false);
  const [ren, setRen] = useState(0);

  // Live mirrors read by the loop/listeners without re-subscribing.
  const phaseRef = useRef<Phase>("idle");
  phaseRef.current = phase;

  // Line-clear animation state (read by the renderer).
  const clearingRef = useRef(false);
  const clearRowsRef = useRef<number[]>([]);
  const clearStartRef = useRef(0);

  // renderRef always points at the latest draw closure so the rAF loop can
  // call it without listing it as an effect dependency.
  const renderRef = useRef<() => void>(() => {});
  const toastTimer = useRef<number | null>(null);
  const feedTimer = useRef<number | null>(null);

  // ---- draw everything + sync HUD -----------------------------------------
  function render() {
    const g = gameRef.current;
    const anim: ClearAnimation = {
      active: clearingRef.current,
      rows: clearRowsRef.current,
      startedAt: clearStartRef.current,
      durationMs: CLEAR_MS,
    };
    const bctx = boardRef.current?.getContext("2d");
    if (bctx) {
      const showActive =
        phaseRef.current === "playing" || phaseRef.current === "paused";
      drawBoard(bctx, g, showActive, anim);
    }
    const hctx = holdRef.current?.getContext("2d");
    if (hctx) {
      hctx.clearRect(0, 0, HOLD_W, HOLD_H);
      if (g?.hold) drawMini(hctx, g.hold, HOLD_W, HOLD_H, 0, HOLD_CELL);
    }
    const nctx = nextRef.current?.getContext("2d");
    if (nctx) {
      nctx.clearRect(0, 0, NEXT_W, NEXT_COUNT * NEXT_SLOT_H);
      g?.next(NEXT_COUNT).forEach((k, i) =>
        drawMini(nctx, k, NEXT_W, NEXT_SLOT_H, i * NEXT_SLOT_H, NEXT_CELL),
      );
    }
    if (g) setHud({ score: g.score, lines: g.lines, level: g.level });
  }
  renderRef.current = render;

  // Show a special-clear message, then auto-hide it after TOAST_MS.
  function showToast(msg: ClearMessage) {
    if (!msg.any) return;
    if (toastTimer.current !== null) clearTimeout(toastTimer.current);
    setToast({ ...msg, key: Date.now() });
    toastTimer.current = window.setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, TOAST_MS);
  }

  // ---- game loop + input (mounted once) -----------------------------------
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let dropAcc = 0;
    let lockAcc = 0;
    let lockResets = 0;
    let grounded = false;

    // Horizontal auto-shift state.
    let dir = 0;
    let dasAcc = 0;
    let arrAcc = 0;
    const held = new Set<string>();
    const softDropActive = () => held.has("ArrowDown");

    /** Reset the lock-delay timer on a successful move/rotate near the floor. */
    function resetLockTimer() {
      if (grounded) {
        lockAcc = 0;
        lockResets++;
      }
    }

    /**
     * Settle the current piece: detect full rows & score, then either play the
     * clear animation (rows collapse afterwards) or spawn the next piece now.
     */
    function beginLock() {
      const g = gameRef.current!;
      const { rows, result, willAllClear } = g.lockDetect();

      grounded = false;
      lockAcc = 0;
      lockResets = 0;

      const visible = rows.map((r) => r - HIDDEN_ROWS).filter((r) => r >= 0);
      const cleared = visible.length > 0;

      // Feedback (label / B2B / REN) is shown ONLY when this lock actually
      // cleared lines. A plain drop with no clear must never surface any box.
      // Source is the per-clear `result` (not the persistent engine flags):
      //   - result.backToBack -> true only on the 2nd+ consecutive difficult
      //     clear, so the first Tetris/T-spin never shows the B2B badge.
      //   - result.combo      -> REN count (>=1 from the 2nd consecutive clear).
      if (cleared) {
        const msg = composeMessage(result);
        if (msg.label)
          showToast({ label: msg.label, b2b: false, ren: 0, any: true });
        setB2bOn(result.backToBack);
        setRen(result.combo >= 1 ? result.combo : 0);
        if (feedTimer.current !== null) clearTimeout(feedTimer.current);
        feedTimer.current = window.setTimeout(() => {
          setB2bOn(false);
          setRen(0);
          feedTimer.current = null;
        }, TOAST_MS);

        clearRowsRef.current = visible;
        clearStartRef.current = performance.now();
        clearingRef.current = true;
        // All Clear replaces the normal clear sound (predicted pre-collapse).
        sfxClear(willAllClear ? "allclear" : result.clearType);
      } else {
        g.resolveClear();
        if (g.over) setPhase("over");
      }
    }

    function loop(now: number) {
      raf = requestAnimationFrame(loop);
      const dt = now - last;
      last = now;

      const g = gameRef.current;
      if (!g || phaseRef.current !== "playing") {
        renderRef.current();
        return;
      }

      // While the clear sweep plays: freeze gravity/input, then collapse rows.
      if (clearingRef.current) {
        if (now - clearStartRef.current >= CLEAR_MS) {
          clearingRef.current = false;
          clearRowsRef.current = [];
          const { allClear } = g.resolveClear();
          if (allClear)
            showToast({ label: "ALL CLEAR", b2b: false, ren: 0, any: true });
          if (g.over) setPhase("over");
        }
        renderRef.current();
        return;
      }

      // Horizontal DAS/ARR — one sound per cell actually moved.
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

      // Gravity (faster while soft-dropping). Soft drop & natural fall share
      // this path, so both play the per-cell drop sound.
      const gInterval = g.gravityMs();
      const interval = softDropActive()
        ? Math.min(gInterval, SOFT_DROP_MS)
        : gInterval;
      dropAcc += dt;
      if (dropAcc >= interval) {
        dropAcc = 0;
        if (g.softDrop()) {
          if (softDropActive()) g.score += 1;
          sfxDrop();
          grounded = false;
          lockAcc = 0;
        } else {
          grounded = true;
        }
      }

      // Lock delay once resting on the stack.
      if (grounded) {
        if (
          !g.collides(g.active.x, g.active.y + 1, g.active.rot, g.active.piece)
        ) {
          grounded = false;
          lockAcc = 0;
        } else {
          lockAcc += dt;
          if (lockAcc >= LOCK_DELAY || lockResets >= LOCK_RESET_CAP) {
            sfxDropdown(); // soft/natural landing only — hard drop uses its own
            beginLock();
          }
        }
      }

      renderRef.current();
    }
    raf = requestAnimationFrame(loop);

    function onKeyDown(e: KeyboardEvent) {
      // Non-playing states: Space starts/restarts, Esc resumes from pause.
      if (phaseRef.current !== "playing") {
        if (e.key === "Escape" && phaseRef.current === "paused") {
          e.preventDefault();
          setPhase("playing");
        }
        if (
          e.key === " " &&
          (phaseRef.current === "idle" || phaseRef.current === "over")
        ) {
          e.preventDefault();
          startGame();
        }
        return;
      }
      // Ignore gameplay input during the clear animation.
      if (clearingRef.current) {
        if (e.key === " ") e.preventDefault();
        return;
      }

      const g = gameRef.current!;
      switch (e.key) {
        case "ArrowLeft":
          if (!held.has("ArrowLeft")) {
            held.add("ArrowLeft");
            dir = -1;
            dasAcc = 0;
            arrAcc = 0;
            if (g.move(-1)) {
              resetLockTimer();
              sfxMove();
            }
          }
          break;
        case "ArrowRight":
          if (!held.has("ArrowRight")) {
            held.add("ArrowRight");
            dir = 1;
            dasAcc = 0;
            arrAcc = 0;
            if (g.move(1)) {
              resetLockTimer();
              sfxMove();
            }
          }
          break;
        case "ArrowDown":
          held.add("ArrowDown");
          break;
        case "ArrowUp":
        case "x":
        case "X":
          if (g.rotate(1)) {
            resetLockTimer();
            sfxRotate();
          }
          break;
        case "z":
        case "Z":
          if (g.rotate(-1)) {
            resetLockTimer();
            sfxRotate();
          }
          break;
        case "c":
        case "C":
          if (g.holdPiece()) {
            grounded = false;
            lockAcc = 0;
            sfxHold();
          }
          break;
        case " ": {
          e.preventDefault();
          g.hardDropOnly();
          sfxHardDrop();
          beginLock();
          break;
        }
        case "Escape":
          e.preventDefault();
          setPhase("paused");
          break;
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      held.delete(e.key);
      if (e.key === "ArrowLeft" && dir === -1)
        dir = held.has("ArrowRight") ? 1 : 0;
      if (e.key === "ArrowRight" && dir === 1)
        dir = held.has("ArrowLeft") ? -1 : 0;
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      cancelAnimationFrame(raf);
      if (toastTimer.current !== null) clearTimeout(toastTimer.current);
      if (feedTimer.current !== null) clearTimeout(feedTimer.current);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Titlebar "?" button (rendered by window chrome) opens help via event.
  useEffect(() => {
    const openHelp = () => setHelp(true);
    window.addEventListener("tetris:help", openHelp);
    return () => window.removeEventListener("tetris:help", openHelp);
  }, []);

  function startGame() {
    preloadSfx();
    gameRef.current = new Tetris();
    clearingRef.current = false;
    clearRowsRef.current = [];
    setToast(null);
    setB2bOn(false);
    setRen(0);
    if (toastTimer.current !== null) clearTimeout(toastTimer.current);
    if (feedTimer.current !== null) clearTimeout(feedTimer.current);
    setHelp(false);
    setPhase("playing");
  }

  return {
    phase,
    hud,
    toast,
    b2bOn,
    ren,
    help,
    boardRef,
    holdRef,
    nextRef,
    start: startGame,
    resume: () => setPhase("playing"),
    quit: () => (onQuit ? onQuit() : setPhase("idle")),
    closeHelp: () => setHelp(false),
  };
}
