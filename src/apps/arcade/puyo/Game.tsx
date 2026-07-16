// Public entry the Arcade hub renders: <Game onQuit={...} />.
// No mode-select screen: the board mounts straight into play mode, and the HUD
// carries a play/pause button that toggles gravity (play <-> practice) live.
import { useEffect, useRef } from "react";
import { Hud } from "./components/Hud";
import { GameOverOverlay, PauseOverlay } from "./components/Overlays";
import { usePuyoGame } from "./hook/usePuyoGame";

import "./style.css";

export function Game({ onQuit }: { onQuit?: () => void }) {
  const {
    hostRef,
    hud,
    pause,
    resume,
    restart,
    toggleMode,
    touchMove,
    touchRotate,
    touchStepDown,
  } = usePuyoGame("practice");

  const stageWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape" || e.code === "KeyP") {
        e.preventDefault();
        if (hud.status === "control") pause();
        else if (hud.status === "paused") resume();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hud.status, pause, resume]);

  // Touch controls: horizontal drag steps columns (~1 column-width each),
  // vertical drag steps the pair down one row per cell-height dragged
  // (proportional, so drop speed tracks the finger exactly — no runaway
  // soft-drop), and a quick tap (little movement) rotates clockwise. Stable
  // listeners — the hook actions no-op unless a piece is under control.
  useEffect(() => {
    const el = stageWrapRef.current;
    if (!el) return;
    const TAP_MOVE = 12; // px; below this a touch counts as a tap
    const TAP_MS = 260; // ms; above this it's a hold, not a tap
    const g = {
      active: false,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      accX: 0,
      accY: 0,
      stepX: 32,
      stepY: 32,
      moved: false,
      t0: 0,
    };

    const start = (e: TouchEvent) => {
      const t = e.touches[0];
      g.active = true;
      g.startX = t.clientX;
      g.startY = t.clientY;
      g.lastX = t.clientX;
      g.lastY = t.clientY;
      g.accX = 0;
      g.accY = 0;
      g.moved = false;
      g.t0 = Date.now();
      // One column-width ~= host width / 12 (board is ~half the letterboxed
      // canvas, 6 columns); one row-height ~= host height / 13 (13 rows).
      // Clamped so a step always needs a usable amount of finger travel.
      g.stepX = Math.max(20, el.clientWidth / 12);
      g.stepY = Math.max(20, el.clientHeight / 13);
    };
    const move = (e: TouchEvent) => {
      if (!g.active) return;
      e.preventDefault();
      const t = e.touches[0];
      const dxTotal = t.clientX - g.startX;
      const dyTotal = t.clientY - g.startY;
      g.accX += t.clientX - g.lastX;
      g.accY += t.clientY - g.lastY;
      g.lastX = t.clientX;
      g.lastY = t.clientY;
      while (g.accX <= -g.stepX) {
        touchMove(-1);
        g.accX += g.stepX;
        g.moved = true;
      }
      while (g.accX >= g.stepX) {
        touchMove(1);
        g.accX -= g.stepX;
        g.moved = true;
      }
      // Proportional downward stepping: one row per cell-height dragged down.
      // Only consumes downward travel (never steps up); resets when the
      // finger moves back up so it can't bank negative slack.
      if (g.accY < 0) g.accY = 0;
      while (g.accY >= g.stepY) {
        touchStepDown();
        g.accY -= g.stepY;
        g.moved = true;
      }
      if (Math.abs(dxTotal) > TAP_MOVE || Math.abs(dyTotal) > TAP_MOVE) {
        g.moved = true;
      }
    };
    const end = () => {
      if (!g.active) return;
      g.active = false;
      if (!g.moved && Date.now() - g.t0 < TAP_MS) touchRotate(1);
    };

    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
    };
  }, [touchMove, touchRotate, touchStepDown]);

  return (
    <div className="puyo-root">
      <div className="puyo-game">
        <Hud
          maxChain={hud.maxChain}
          mode={hud.mode}
          onRestart={restart}
          onToggleMode={toggleMode}
        />
        <div className="puyo-stage-wrap" ref={stageWrapRef}>
          <div className="puyo-canvas-host" ref={hostRef} />
          {hud.status === "loading" && (
            <div className="puyo-loading">Loading…</div>
          )}
          {hud.status === "paused" && (
            <PauseOverlay onResume={resume} onQuit={onQuit} />
          )}
          {hud.status === "gameover" && (
            <GameOverOverlay
              score={hud.score}
              maxChain={hud.maxChain}
              onRestart={restart}
              onQuit={onQuit}
            />
          )}
        </div>
      </div>
    </div>
  );
}
