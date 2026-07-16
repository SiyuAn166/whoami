import React from "react";
import type { HudSnapshot } from "../lib/types";

interface Props {
  hud: HudSnapshot;
  muted: boolean;
  onRestart: () => void;
  onToggleMute: () => void;
  onQuit?: () => void;
}

const RestartIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M12 5V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" />
  </svg>
);
const MuteIcon = ({ muted }: { muted: boolean }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M4 9v6h4l5 5V4L8 9H4z" />
    {muted && (
      <path d="M16 8l6 8M22 8l-6 8" stroke="currentColor" strokeWidth="2" />
    )}
  </svg>
);

export const Hud: React.FC<Props> = ({
  hud,
  muted,
  onRestart,
  onToggleMute,
  onQuit,
}) => {
  return (
    <div className="tetris-hud">
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
      <div className="tetris-controls">
        <button className="tbtn" title="Restart" onClick={onRestart}>
          <RestartIcon />
        </button>
        <button
          className="tbtn"
          title={muted ? "Unmute" : "Mute"}
          onClick={onToggleMute}
        >
          <MuteIcon muted={muted} />
        </button>
        {onQuit && (
          <button className="tbtn" title="Quit" onClick={onQuit}>
            ✕
          </button>
        )}
      </div>
    </div>
  );
};
