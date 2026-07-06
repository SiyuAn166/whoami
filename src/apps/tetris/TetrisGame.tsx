import { useEffect, useRef, useState } from "react";
import {
  COLS,
  HIDDEN_ROWS,
  ROWS,
  Tetris,
  shape,
  type PieceType,
} from "./engine";
import "./Tetris.css";
import { drawCell } from "./tileRenderer";

const CELL = 30; // board cell size (px)
const BOARD_W = COLS * CELL; // 300
const BOARD_H = ROWS * CELL; // 600
const NEXT_COUNT = 5;

// Input timing (ms).
const DAS = 140; // delayed auto-shift
const ARR = 30; // auto-repeat rate
const LOCK_DELAY = 500;
const LOCK_RESET_CAP = 15;
const CLEAR_MS = 220; // line-clear wipe animation duration

type Phase = "idle" | "playing" | "paused" | "over";

export function TetrisGame({ onQuit }: { onQuit?: () => void }) {
  const boardRef = useRef<HTMLCanvasElement>(null);
  const holdRef = useRef<HTMLCanvasElement>(null);
  const nextRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Tetris | null>(null);
  const renderRef = useRef<() => void>(() => {});
  renderRef.current = render;

  const [phase, setPhase] = useState<Phase>("idle");
  const [hud, setHud] = useState({ score: 0, lines: 0, level: 1 });
  const [help, setHelp] = useState(false);
  const [toast, setToast] = useState<{ text: string; key: number } | null>(
    null,
  );

  // Mutable refs the rAF loop / listeners read without re-subscribing.
  const phaseRef = useRef<Phase>("idle");
  phaseRef.current = phase;

  // Line-clear animation state (read by render()).
  const clearingRef = useRef(false);
  const clearRowsRef = useRef<number[]>([]); // visible-board row indices
  const clearStartRef = useRef(0);

  // ---- core render of the board / hold / next -----------------------------
  function render() {
    const g = gameRef.current;
    const bctx = boardRef.current?.getContext("2d");
    if (!bctx) return;
    bctx.clearRect(0, 0, BOARD_W, BOARD_H);
    // faint grid
    bctx.strokeStyle = "rgba(255,255,255,.05)";
    bctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
      bctx.beginPath();
      bctx.moveTo(x * CELL + 0.5, 0);
      bctx.lineTo(x * CELL + 0.5, BOARD_H);
      bctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      bctx.beginPath();
      bctx.moveTo(0, y * CELL + 0.5);
      bctx.lineTo(BOARD_W, y * CELL + 0.5);
      bctx.stroke();
    }
    if (!g) return;

    // locked cells (skip hidden rows)
    for (let r = HIDDEN_ROWS; r < HIDDEN_ROWS + ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = g.grid[r][c];
        if (cell)
          drawCell(bctx, c * CELL, (r - HIDDEN_ROWS) * CELL, CELL, cell);
      }
    }

    // active + ghost — hidden while a clear animation is playing
    if (
      (phaseRef.current === "playing" || phaseRef.current === "paused") &&
      !clearingRef.current
    ) {
      const a = g.active;
      // ghost
      const gy = g.ghostY();
      bctx.save();
      bctx.globalAlpha = 0.22;
      shape(a.piece, a.rot).forEach(([x, y]) => {
        const ry = gy + y - HIDDEN_ROWS;
        if (ry >= 0) drawCell(bctx, (a.x + x) * CELL, ry * CELL, CELL, a.piece);
      });
      bctx.restore();
      // active
      shape(a.piece, a.rot).forEach(([x, y]) => {
        const ry = a.y + y - HIDDEN_ROWS;
        if (ry >= 0) drawCell(bctx, (a.x + x) * CELL, ry * CELL, CELL, a.piece);
      });
    }

    // left-to-right erase sweep over the rows being cleared
    if (clearingRef.current) {
      const prog = Math.min(
        1,
        (performance.now() - clearStartRef.current) / CLEAR_MS,
      );
      const wipeX = prog * BOARD_W;
      for (const ry of clearRowsRef.current) {
        const y = ry * CELL;
        // erase the already-swept portion of the row
        bctx.clearRect(0, y, wipeX, CELL);
        // bright leading edge
        bctx.save();
        bctx.globalCompositeOperation = "lighter";
        const ex = Math.max(0, wipeX - 34);
        const grad = bctx.createLinearGradient(ex, 0, wipeX, 0);
        grad.addColorStop(0, "rgba(255,255,255,0)");
        grad.addColorStop(1, "rgba(255,255,255,.85)");
        bctx.fillStyle = grad;
        bctx.fillRect(ex, y, wipeX - ex, CELL);
        bctx.restore();
      }
    }

    // hold
    const hctx = holdRef.current?.getContext("2d");
    if (hctx) {
      hctx.clearRect(0, 0, 72, 48);
      if (g.hold) drawMini(hctx, g.hold, 72, 48, 0, 11);
    }
    // next
    const nctx = nextRef.current?.getContext("2d");
    if (nctx) {
      nctx.clearRect(0, 0, 92, NEXT_COUNT * 60);
      g.next(NEXT_COUNT).forEach((k, i) =>
        drawMini(nctx, k, 92, 60, i * 60, 13),
      );
    }

    setHud({ score: g.score, lines: g.lines, level: g.level });
  }

  function drawMini(
    ctx: CanvasRenderingContext2D,
    k: PieceType,
    w: number,
    h: number,
    oy: number,
    mc: number,
  ) {
    const cells = shape(k, 0);
    const xs = cells.map((c) => c[0]);
    const ys = cells.map((c) => c[1]);
    const minx = Math.min(...xs),
      maxx = Math.max(...xs),
      miny = Math.min(...ys),
      maxy = Math.max(...ys);
    const bw = (maxx - minx + 1) * mc,
      bh = (maxy - miny + 1) * mc;
    const ox = (w - bw) / 2,
      ooy = oy + (h - bh) / 2;
    cells.forEach(([x, y]) =>
      drawCell(ctx, ox + (x - minx) * mc, ooy + (y - miny) * mc, mc, k),
    );
  }

  function popToast(text: string) {
    setToast({ text, key: Date.now() });
  }

  // ---- game loop + input --------------------------------------------------
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let dropAcc = 0;
    let lockAcc = 0;
    let lockResets = 0;
    let grounded = false;

    // horizontal auto-shift state
    let dir = 0; // -1 | 0 | 1
    let dasAcc = 0;
    let arrAcc = 0;
    const held = new Set<string>();

    const softDropActive = () => held.has("ArrowDown");

    // Phase-1 lock: place piece, detect full rows, then either start the
    // erase animation (locking input) or resolve immediately if nothing clears.
    function beginLock() {
      const g = gameRef.current!;
      const { rows, result } = g.lockDetect();
      if (result.toast) popToast(result.toast);
      grounded = false;
      lockAcc = 0;
      lockResets = 0;
      const visible = rows.map((r) => r - HIDDEN_ROWS).filter((r) => r >= 0);
      if (visible.length > 0) {
        clearRowsRef.current = visible;
        clearStartRef.current = performance.now();
        clearingRef.current = true;
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

      // line-clear animation: freeze the board, ignore input, then collapse
      if (clearingRef.current) {
        if (now - clearStartRef.current >= CLEAR_MS) {
          clearingRef.current = false;
          clearRowsRef.current = [];
          const { allClear } = g.resolveClear();
          if (allClear) popToast("ALL CLEAR");
          if (g.over) setPhase("over");
        }
        renderRef.current();
        return;
      }

      // horizontal DAS/ARR
      if (dir !== 0) {
        dasAcc += dt;
        if (dasAcc >= DAS) {
          arrAcc += dt;
          while (arrAcc >= ARR) {
            g.move(dir);
            arrAcc -= ARR;
          }
        }
      }

      // gravity (soft drop accelerates)
      const g0 = g.gravityMs();
      const interval = softDropActive() ? Math.min(g0, 40) : g0;
      dropAcc += dt;
      if (dropAcc >= interval) {
        dropAcc = 0;
        if (g.softDrop()) {
          if (softDropActive()) g.score += 1;
          grounded = false;
          lockAcc = 0;
        } else {
          grounded = true;
        }
      }

      // lock delay
      if (grounded) {
        // if a move/rotate freed the piece, cancel grounding
        if (
          !g.collides(g.active.x, g.active.y + 1, g.active.rot, g.active.piece)
        ) {
          grounded = false;
          lockAcc = 0;
        } else {
          lockAcc += dt;
          if (lockAcc >= LOCK_DELAY || lockResets >= LOCK_RESET_CAP)
            beginLock();
        }
      }

      renderRef.current();
    }
    raf = requestAnimationFrame(loop);

    function resetLockTimer() {
      if (grounded) {
        lockAcc = 0;
        lockResets++;
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (phaseRef.current !== "playing") {
        // ESC resumes from the pause menu
        if (e.key === "Escape" && phaseRef.current === "paused") {
          e.preventDefault();
          setPhase("playing");
        }
        return;
      }
      // ignore all game input while the clear animation is playing
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
            if (g.move(-1)) resetLockTimer();
          }
          break;
        case "ArrowRight":
          if (!held.has("ArrowRight")) {
            held.add("ArrowRight");
            dir = 1;
            dasAcc = 0;
            arrAcc = 0;
            if (g.move(1)) resetLockTimer();
          }
          break;
        case "ArrowDown":
          held.add("ArrowDown");
          break;
        case "ArrowUp":
        case "x":
        case "X":
          if (g.rotate(1)) resetLockTimer();
          break;
        case "z":
        case "Z":
          if (g.rotate(-1)) resetLockTimer();
          break;
        case "c":
        case "C":
          if (g.holdPiece()) {
            grounded = false;
            lockAcc = 0;
          }
          break;
        case " ": {
          e.preventDefault();
          g.hardDropOnly();
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
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
    // rAF loop reads the latest render via renderRef; mounts once.
  }, []);

  function startGame() {
    gameRef.current = new Tetris();
    clearingRef.current = false;
    clearRowsRef.current = [];
    setToast(null);
    setHelp(false);
    setPhase("playing");
  }

  return (
    <div className="tetris-shell">
      {/* LEFT */}
      <div className="tetris-col left">
        <div className="tetris-panel holdbox">
          <div className="tetris-label">Hold</div>
          <div className="tetris-well">
            <canvas ref={holdRef} width={72} height={48} />
          </div>
        </div>
        <div className="tetris-panel">
          <div className="tetris-stat">
            <span className="k">Score</span>
            <span className="v">{hud.score}</span>
          </div>
        </div>
        <div className="tetris-panel">
          <div className="tetris-stat" style={{ marginBottom: 10 }}>
            <span className="k">Lines</span>
            <span className="v">{hud.lines}</span>
          </div>
          <div className="tetris-stat">
            <span className="k">Level</span>
            <span className="v">{hud.level}</span>
          </div>
        </div>
      </div>

      {/* CENTER */}
      <div className="tetris-playfield-wrap">
        <canvas ref={boardRef} width={BOARD_W} height={BOARD_H} />
        {toast && (
          <div className="tetris-toast show" key={toast.key}>
            {toast.text}
          </div>
        )}
        {(phase === "idle" || phase === "over") && (
          <div className="tetris-overlay show">
            <div className="tetris-card">
              <h3>{phase === "over" ? "Game Over" : "Tetris"}</h3>
              {phase === "over" && (
                <p className="tetris-final">Score {hud.score}</p>
              )}
              <button className="tetris-btn" onClick={startGame}>
                {phase === "over" ? "PLAY AGAIN" : "START GAME"}
              </button>
            </div>
          </div>
        )}
        {phase === "paused" && (
          <div className="tetris-overlay show">
            <div className="tetris-card">
              <h3>Paused</h3>
              <button
                className="tetris-btn"
                onClick={() => setPhase("playing")}
              >
                CONTINUE
              </button>
              <button className="tetris-btn ghost" onClick={startGame}>
                START OVER
              </button>
              <button
                className="tetris-btn ghost"
                onClick={() => (onQuit ? onQuit() : setPhase("idle"))}
              >
                QUIT GAME
              </button>
            </div>
          </div>
        )}
        {help && (
          <div className="tetris-overlay show">
            <div className="tetris-card wide">
              <h3>Controls</h3>
              <div className="tetris-keys">
                <div className="row">
                  <span>Move</span>
                  <span>
                    <kbd>←</kbd>
                    <kbd>→</kbd>
                  </span>
                </div>
                <div className="row">
                  <span>Rotate</span>
                  <span>
                    <kbd>↑</kbd>
                    <kbd>Z</kbd>
                  </span>
                </div>
                <div className="row">
                  <span>Soft drop</span>
                  <kbd>↓</kbd>
                </div>
                <div className="row">
                  <span>Hard drop</span>
                  <kbd>Space</kbd>
                </div>
                <div className="row">
                  <span>Hold</span>
                  <kbd>C</kbd>
                </div>
                <div className="row">
                  <span>Pause / Menu</span>
                  <kbd>Esc</kbd>
                </div>
              </div>
              <button className="tetris-btn" onClick={() => setHelp(false)}>
                CLOSE
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT */}
      <div className="tetris-col right">
        <div className="tetris-panel nextbox">
          <div className="tetris-label">Next</div>
          <div className="tetris-well">
            <canvas ref={nextRef} width={92} height={NEXT_COUNT * 60} />
          </div>
        </div>
        <button className="tetris-btn help" onClick={() => setHelp(true)}>
          HELP
        </button>
      </div>
    </div>
  );
}
