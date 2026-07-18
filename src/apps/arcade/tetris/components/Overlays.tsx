import React from "react";
import type { HudSnapshot } from "../lib/types";
import styles from "../Tetris.module.css";

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
      <div className={styles.tetrisOverlay}>
        <div className={styles.panel}>
          <h2>PAUSED</h2>
          <div className={styles.actions}>
            <button
              className={styles.primary}
              onClick={(e) => {
                e.currentTarget.blur();
                onResume?.();
              }}
            >
              Resume
            </button>
            {onQuit && (
              <button
                className={styles.ghost}
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
      <div className={styles.tetrisOverlay}>
        <div className={styles.panel}>
          <h2>GAME OVER</h2>
          <div className={styles.hairline} />
          <div className={styles.readout}>
            <span className={styles.label}>SCORE</span>
            <span className={styles.value}>{hud.score.toLocaleString()}</span>
          </div>
          <div className={styles.hairline} />
          <div className={styles.readout}>
            <span className={styles.label}>LINES</span>
            <span className={styles.value}>{hud.lines}</span>
          </div>
          <div className={styles.hairline} />
          <div className={styles.readout}>
            <span className={styles.label}>LEVEL</span>
            <span className={styles.value}>{hud.level}</span>
          </div>
          <div className={styles.actions}>
            <button
              className={styles.primary}
              onClick={(e) => {
                e.currentTarget.blur();
                onRestart();
              }}
            >
              Restart
            </button>
            {onQuit && (
              <button
                className={styles.ghost}
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
