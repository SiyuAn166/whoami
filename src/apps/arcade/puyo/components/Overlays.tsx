// Pause and Game Over overlays drawn above the board.
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
        <h2>Paused</h2>
        <button className="puyo-btn primary" onClick={onResume}>
          Resume
        </button>
        {onQuit && (
          <button className="puyo-btn ghost" onClick={onQuit}>
            Quit
          </button>
        )}
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
        <h2>Game Over</h2>
        <p className="puyo-final-score">{score.toLocaleString()}</p>
        <p className="puyo-final-sub">Best chain: {maxChain}</p>
        <button className="puyo-btn primary" onClick={onRestart}>
          Play again
        </button>
        {onQuit && (
          <button className="puyo-btn ghost" onClick={onQuit}>
            Quit
          </button>
        )}
      </div>
    </div>
  );
}
