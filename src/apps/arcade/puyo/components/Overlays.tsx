// Pause and Game Over overlays drawn above the board.
// "Smoked glass" style: near-transparent panel over a heavy blur, faint
// hairline border, thin wide-tracked title, label/value readout rows split
// by hairlines, and a solid-white primary pill + outlined ghost quit.
export function PauseOverlay({
  onResume,
  onQuit,
}: {
  onResume: () => void;
  onQuit?: () => void;
}) {
  return (
    <div className="puyo-overlay">
      <div className="puyo-overlay-card">
        <span className="puyo-accent" />
        <h2>Paused</h2>
        <div className="puyo-overlay-actions">
          <button
            className="puyo-btn primary"
            onClick={(e) => {
              e.currentTarget.blur();
              onResume();
            }}
          >
            Resume
          </button>
          {onQuit && (
            <button
              className="puyo-btn ghost"
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

export function GameOverOverlay({
  score,
  maxChain,
  onRestart,
  onQuit,
}: {
  score: number;
  maxChain: number;
  onRestart: () => void;
  onQuit?: () => void;
}) {
  return (
    <div className="puyo-overlay">
      <div className="puyo-overlay-card">
        <span className="puyo-accent" />
        <h2>Game Over</h2>
        <div className="puyo-hairline" />
        <div className="puyo-readout">
          <span className="puyo-readout-label">SCORE</span>
          <span className="puyo-final-score">{score.toLocaleString()}</span>
        </div>
        <div className="puyo-hairline" />
        <div className="puyo-readout">
          <span className="puyo-readout-label">MAX CHAIN</span>
          <span className="puyo-final-sub">{maxChain}</span>
        </div>
        <div className="puyo-overlay-actions">
          <button
            className="puyo-btn primary"
            onClick={(e) => {
              e.currentTarget.blur();
              onRestart();
            }}
          >
            Restart
          </button>
          {onQuit && (
            <button
              className="puyo-btn ghost"
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
