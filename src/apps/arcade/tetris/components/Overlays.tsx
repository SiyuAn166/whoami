import React from "react";
import type { HudSnapshot } from "../lib/types";

interface Props {
  hud: HudSnapshot;
  onRestart: () => void;
}

export const Overlays: React.FC<Props> = ({ hud, onRestart }) => {
  if (hud.status !== "gameover") return null;
  return (
    <div className="tetris-overlay">
      <div className="panel">
        <h2>GAME OVER</h2>
        <p>
          Score <b>{hud.score.toLocaleString()}</b>
        </p>
        <p>
          Lines <b>{hud.lines}</b> · Level <b>{hud.level}</b>
        </p>
        <div className="row">
          <button onClick={onRestart}>Restart</button>
        </div>
      </div>
    </div>
  );
};

export const Controls: React.FC = () => (
  <div className="tetris-help">
    <div>← → move · ↓ soft · Space hard</div>
    <div>↑ / X rotate CW · Z rotate CCW · C hold</div>
  </div>
);
