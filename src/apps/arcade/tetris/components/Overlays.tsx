import React from "react";
import type { HudSnapshot } from "../lib/types";

interface Props {
  hud: HudSnapshot;
  onRestart: () => void;
  onResume?: () => void;
  onQuit?: () => void;
}

export const Overlays: React.FC<Props> = ({
  hud,
  onRestart,
  onResume,
  onQuit,
}) => {
  // ESC pause menu
  if (hud.status === "paused") {
    return (
      <div className="tetris-overlay">
        <div className="panel">
          <h2>PAUSED</h2>
          <div className="actions">
            <button
              className="primary"
              onClick={(e) => {
                e.currentTarget.blur();
                onResume?.();
              }}
            >
              Resume
            </button>
            {onQuit && (
              <button
                className="ghost"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onQuit();
                }}
              >
                Quit
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (hud.status === "gameover") {
    return (
      <div className="tetris-overlay">
        <div className="panel">
          <h2>GAME OVER</h2>
          <div className="hairline" />
          <div className="readout">
            <span className="label">SCORE</span>
            <span className="value">{hud.score.toLocaleString()}</span>
          </div>
          <div className="hairline" />
          <div className="readout">
            <span className="label">LINES</span>
            <span className="value">{hud.lines}</span>
          </div>
          <div className="hairline" />
          <div className="readout">
            <span className="label">LEVEL</span>
            <span className="value">{hud.level}</span>
          </div>
          <div className="actions">
            <button
              className="primary"
              onClick={(e) => {
                e.currentTarget.blur();
                onRestart();
              }}
            >
              Restart
            </button>
            {onQuit && (
              <button
                className="ghost"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onQuit();
                }}
              >
                Quit
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
