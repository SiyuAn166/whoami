// Slim side panel. Score, next-pair and the live chain popup live inside the
// Pixi canvas (puyo.gg style), so the HUD only carries a compact header (the
// mode badge doubles as the play/pause toggle + a restart button), a one-line
// best-chain stat and a controls legend that swaps for touch devices.
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
      <div className="puyo-hud-top">
        <button
          className={`puyo-badge ${mode}`}
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMode?.();
          }}
          aria-label={
            playing ? "Pause gravity (practice)" : "Start gravity (play)"
          }
          title={playing ? "Tap for practice" : "Tap to play"}
        >
          <span className="puyo-badge-dot">
            {playing ? "\u23F8" : "\u25B6"}
          </span>
          {playing ? "PLAY" : "PRACTICE"}
        </button>
        <button
          className="puyo-icon-btn"
          onClick={(e) => {
            e.currentTarget.blur();
            onRestart?.();
          }}
          aria-label="Restart"
          title="Restart"
        >
          <span className="puyo-icon-restart">&#x21ba;</span>
        </button>
      </div>

      <div className="puyo-best">
        <span className="puyo-best-label">Best</span>
        <span className="puyo-best-value">
          {maxChain > 0 ? `\u00d7${maxChain}` : "\u2013"}
        </span>
      </div>

      <div className="puyo-legend keyboard">
        <span className="puyo-key-row">
          <b>&larr; &rarr;</b> move <b>&darr;</b> drop
        </span>
        <span className="puyo-key-row">
          <b>Z / X</b> rotate
        </span>
        <span className="puyo-key-row">
          <b>Space</b> {playing ? "hard drop" : "place"} <b>Esc</b> pause
        </span>
      </div>

      <div className="puyo-legend touch">
        <span className="puyo-key-row">
          <b>Drag</b> move <b>&darr;</b> soft drop
        </span>
        <span className="puyo-key-row">
          <b>Tap</b> rotate
        </span>
      </div>
    </aside>
  );
}
