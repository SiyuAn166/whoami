// Public entry the Arcade hub renders: <Game onQuit={...} />.
// No mode-select screen: the board mounts straight into play mode, and the HUD
// carries a play/pause button that toggles gravity (play <-> practice) live.
import { useEffect } from "react";
import { Hud } from "./components/Hud";
import { GameOverOverlay, PauseOverlay } from "./components/Overlays";
import { usePuyoGame } from "./hook/usePuyoGame";

import "./style.css";

export function Game({ onQuit }: { onQuit?: () => void }) {
  const { hostRef, hud, pause, resume, restart, toggleMode } =
    usePuyoGame("practice");

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

  return (
    <div className="puyo-root">
      <div className="puyo-game">
        <Hud
          maxChain={hud.maxChain}
          mode={hud.mode}
          onRestart={restart}
          onToggleMode={toggleMode}
        />
        <div className="puyo-stage-wrap">
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
