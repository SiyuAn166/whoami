import React, { useEffect, useRef, useState } from "react";
import { Overlays } from "./components/Overlays";
import { useTetrisGame } from "./hook/useTetrisGame";
import { SoundBank } from "./lib/sound";
import { TetrisStage } from "./pixi/TetrisStage";
import "./style.css";

export interface GameProps {
  onQuit?: () => void;
}

export const Game: React.FC<GameProps> = ({ onQuit }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<TetrisStage | null>(null);
  const soundRef = useRef<SoundBank | null>(null);
  const [booted, setBooted] = useState(false);

  const { hud, reset, togglePause, tryMove, tryRotate, softDrop } =
    useTetrisGame(stageRef, soundRef, booted);

  useEffect(() => {
    let disposed = false;
    const stage = new TetrisStage();
    const sound = new SoundBank();
    (async () => {
      await stage.init(hostRef.current!);
      if (disposed) {
        stage.destroy();
        return;
      }
      stageRef.current = stage;
      soundRef.current = sound;
      void sound.load();
      setBooted(true);
    })();
    return () => {
      disposed = true;
      stageRef.current?.destroy();
      stageRef.current = null;
    };
  }, []);

  // start a game once the stage is live
  useEffect(() => {
    if (booted) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booted]);

  // wire the in-canvas restart button
  useEffect(() => {
    if (booted) stageRef.current?.bindRestart(() => reset());
  }, [booted, reset]);

  // ---- touch controls (mobile) ----
  // tap = rotate CW · horizontal drag = move by column · pull down = soft drop
  // · pull/flick down = soft drop. Taps on the in-canvas restart button
  // are left for Pixi to handle.
  useEffect(() => {
    if (!booted) return;
    const host = hostRef.current;
    if (!host) return;

    const TAP_MOVE_MAX = 12; // px of travel still counts as a tap
    const TAP_TIME_MAX = 250; // ms
    const SOFT_FACTOR = 0.9; // fraction of a cell pulled down to soft-drop

    interface Gesture {
      id: number;
      startX: number;
      startY: number;
      lastX: number;
      lastY: number;
      lastT: number;
      startT: number;
      accX: number;
      moved: boolean;
      ignore: boolean; // started on the restart button
      done: boolean; // hard-dropped / consumed
    }
    let g: Gesture | null = null;

    const mk = (t: Touch, ignore: boolean): Gesture => ({
      id: t.identifier,
      startX: t.clientX,
      startY: t.clientY,
      lastX: t.clientX,
      lastY: t.clientY,
      lastT: performance.now(),
      startT: performance.now(),
      accX: 0,
      moved: false,
      ignore,
      done: ignore,
    });

    const pick = (e: TouchEvent): Touch | null => {
      if (!g) return null;
      for (const t of Array.from(e.changedTouches))
        if (t.identifier === g.id) return t;
      return null;
    };

    const start = (e: TouchEvent) => {
      if (g) return; // single-finger control
      const t = e.changedTouches[0];
      if (stageRef.current?.hitRestart(t.clientX, t.clientY)) {
        g = mk(t, true); // let Pixi get the tap; swallow our end handler
        return;
      }
      g = mk(t, false);
      e.preventDefault();
    };

    const move = (e: TouchEvent) => {
      const t = pick(e);
      if (!t || !g || g.ignore || g.done) return;
      e.preventDefault();
      const now = performance.now();
      const dx = t.clientX - g.lastX;
      const cell = stageRef.current?.cellPx() || 30;

      // horizontal: one column per cell of travel
      g.accX += dx;
      while (g.accX >= cell) {
        tryMove(1);
        g.accX -= cell;
        g.moved = true;
      }
      while (g.accX <= -cell) {
        tryMove(-1);
        g.accX += cell;
        g.moved = true;
      }

      if (Math.hypot(t.clientX - g.startX, t.clientY - g.startY) > TAP_MOVE_MAX)
        g.moved = true;

      // pulled below the start line -> soft drop engaged (continuous)
      softDrop(t.clientY - g.startY > cell * SOFT_FACTOR);

      g.lastX = t.clientX;
      g.lastY = t.clientY;
      g.lastT = now;
    };

    const end = (e: TouchEvent) => {
      const t = pick(e);
      if (!t || !g) return;
      const tap =
        !g.moved &&
        !g.ignore &&
        !g.done &&
        performance.now() - g.startT < TAP_TIME_MAX;
      softDrop(false);
      if (tap) tryRotate(1);
      g = null;
    };

    host.addEventListener("touchstart", start, { passive: false });
    host.addEventListener("touchmove", move, { passive: false });
    host.addEventListener("touchend", end);
    host.addEventListener("touchcancel", end);
    return () => {
      host.removeEventListener("touchstart", start);
      host.removeEventListener("touchmove", move);
      host.removeEventListener("touchend", end);
      host.removeEventListener("touchcancel", end);
    };
  }, [booted, tryMove, tryRotate, softDrop, stageRef]);

  return (
    <div className="tetris-root">
      <div className="tetris-stage-wrap">
        <div ref={hostRef} className="tetris-canvas-host" />
        <Overlays
          hud={hud}
          onRestart={() => reset()}
          onResume={togglePause}
          onQuit={onQuit}
        />
      </div>
    </div>
  );
};

export default Game;
