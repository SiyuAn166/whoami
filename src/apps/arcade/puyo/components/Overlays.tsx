// Pause and Game Over overlays drawn above the board.
// "Smoked glass" style: near-transparent panel over a heavy blur, faint
// hairline border, thin wide-tracked title, label/value readout rows split
// by hairlines, and a solid-white primary pill + outlined ghost quit.
import styles from "../Puyo.module.css";

export function PauseOverlay({
  onResume,
  onQuit,
}: {
  onResume: () => void;
  onQuit?: () => void;
}) {
  return (
    <div className={styles.puyoOverlay}>
      <div className={styles.puyoOverlayCard}>
        <span className={styles.puyoAccent} />
        <h2>Paused</h2>
        <div className={styles.puyoOverlayActions}>
          <button
            className={`${styles.puyoBtn} ${styles.primary}`}
            onClick={(e) => {
              e.currentTarget.blur();
              onResume();
            }}
          >
            Resume
          </button>
          {onQuit && (
            <button
              className={`${styles.puyoBtn} ${styles.ghost}`}
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
    <div className={styles.puyoOverlay}>
      <div className={styles.puyoOverlayCard}>
        <span className={styles.puyoAccent} />
        <h2>Game Over</h2>
        <div className={styles.puyoHairline} />
        <div className={styles.puyoReadout}>
          <span className={styles.puyoReadoutLabel}>SCORE</span>
          <span className={styles.puyoFinalScore}>
            {score.toLocaleString()}
          </span>
        </div>
        <div className={styles.puyoHairline} />
        <div className={styles.puyoReadout}>
          <span className={styles.puyoReadoutLabel}>MAX CHAIN</span>
          <span className={styles.puyoFinalSub}>{maxChain}</span>
        </div>
        <div className={styles.puyoOverlayActions}>
          <button
            className={`${styles.puyoBtn} ${styles.primary}`}
            onClick={(e) => {
              e.currentTarget.blur();
              onRestart();
            }}
          >
            Restart
          </button>
          {onQuit && (
            <button
              className={`${styles.puyoBtn} ${styles.ghost}`}
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
