// Slim side panel. Score, next-pair and the live chain popup are rendered
// inside the Pixi canvas (puyo.gg style), so the HUD only carries the mode
// badge, a best-chain stat, an action box (play/pause + restart) and a legend.
import type { Mode } from "../lib/types";

export function Hud({
  maxChain,
  mode,
  onRestart,
  onToggleMode,
}: {
  maxChain: number;
  mode: Mode;
  onRestart?: () => void;
  onToggleMode?: () => void;
}) {
  const playing = mode === "play";
  return (
    <aside className="puyo-hud">
      <div className={`puyo-badge ${mode}`}>
        {playing ? "PLAY" : "PRACTICE"}
      </div>

      <div className="puyo-hud-block">
        <span className="puyo-hud-label">Best chain</span>
        <span className="puyo-hud-value chain">
          {maxChain > 0 ? `${maxChain}` : "-"}
        </span>
      </div>

      <div className="puyo-hud-block puyo-actions">
        <span className="puyo-hud-label">Actions</span>
        <div className="puyo-action-row">
          <button
            className="puyo-icon-btn"
            onClick={onToggleMode}
            aria-label={
              playing ? "Pause gravity (practice)" : "Start gravity (play)"
            }
            title={
              playing ? "Pause gravity (practice)" : "Start gravity (play)"
            }
          >
            <span className="puyo-icon-mode">
              {playing ? "\u23F8" : "\u25B6"}
            </span>
          </button>
          <button
            className="puyo-icon-btn"
            onClick={onRestart}
            aria-label="Restart"
            title="Restart"
          >
            <span className="puyo-icon-restart">&#x21ba;</span>
          </button>
        </div>
      </div>

      <div className="puyo-hud-block puyo-legend">
        <span className="puyo-hud-label">Controls</span>
        <span className="puyo-key-row">
          <b>&larr; &rarr;</b> move
        </span>
        <span className="puyo-key-row">
          <b>&darr;</b> soft drop
        </span>
        <span className="puyo-key-row">
          <b>Z / X</b> rotate
        </span>
        <span className="puyo-key-row">
          <b>Space</b> {playing ? "hard drop" : "place"}
        </span>
        <span className="puyo-key-row">
          <b>P / Esc</b> pause
        </span>
      </div>
    </aside>
  );
}
