import React from "react";
import type { HudSnapshot } from "../lib/types";

interface Props {
  hud: HudSnapshot;
  onRestart: () => void;
}

export const Hud: React.FC<Props> = ({ hud, onRestart }) => {
  return (
    <aside className="tetris-hud">
      <div className="tetris-stats">
        <div className="stat">
          <span>SCORE</span>
          <b>{hud.score.toLocaleString()}</b>
        </div>
        <div className="stat">
          <span>LEVEL</span>
          <b>{hud.level}</b>
        </div>
        <div className="stat">
          <span>LINES</span>
          <b>{hud.lines}</b>
        </div>
      </div>

      <div className="tetris-hud-block tetris-actions">
        <span className="tetris-hud-label">Actions</span>
        <div className="tetris-action-row">
          <button
            className="tetris-icon-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              onRestart();
            }}
            aria-label="Restart"
            title="Restart"
          >
            <span className="tetris-icon-restart">&#x21ba;</span>
          </button>
        </div>
      </div>

      <div className="tetris-help">
        <span className="help-label">CONTROLS</span>
        <span className="help-row">
          <b>&larr; &rarr;</b> move
        </span>
        <span className="help-row">
          <b>&darr;</b> soft drop
        </span>
        <span className="help-row">
          <b>&uarr; / X</b> rotate CW
        </span>
        <span className="help-row">
          <b>Z</b> rotate CCW
        </span>
        <span className="help-row">
          <b>Space</b> hard drop
        </span>
        <span className="help-row">
          <b>C</b> hold
        </span>
        <span className="help-row">
          <b>Esc</b> pause
        </span>
      </div>
    </aside>
  );
};
