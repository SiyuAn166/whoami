// ============================================================================
// PuyoGame — presentational shell. Game logic/loop/input lives in usePuyoGame;
// this component only wires refs, HUD and overlays. Neon-arcade styling to
// match the Arcade hub + Tetris screens.
// ============================================================================
import { usePuyoGame } from "./hook/usePuyoGame";
import {
  BOARD_H,
  BOARD_W,
  NEXT_COUNT,
  NEXT_SLOT_H,
  NEXT_W,
} from "./lib/config";
import "./style.css";

/** Rising chain badge — mirrors Tetris' ClearFeed capsule, magenta-toned. */
function ChainBadge({ chain }: { chain: number }) {
  if (chain <= 0) return null;
  return (
    <div className="puyo-feed show" key={chain}>
      <span className="puyo-feed-tag">CHAIN</span>
      <span className="puyo-feed-num">
        <span className="x">x</span>
        {chain}
      </span>
    </div>
  );
}

/** Circular chain-power meter. */
function ChainRing({ chain }: { chain: number }) {
  const pct = Math.min(1, chain / 12);
  const deg = Math.round(pct * 360);
  const ringStyle = {
    background: `conic-gradient(#ff5cc8 ${deg}deg, rgba(120,140,220,0.18) ${deg}deg)`,
  };
  return (
    <div className="puyo-ring-wrap">
      <div className="puyo-ring" style={ringStyle}>
        <div className="puyo-ring-hole">
          <span className="puyo-ring-num">{chain}</span>
          <span className="puyo-ring-label">CHAINS</span>
        </div>
      </div>
    </div>
  );
}

function StartOverlay({ over, score }: { over: boolean; score: number }) {
  return (
    <div className="puyo-overlay show">
      <div className="puyo-start-hint">
        {over && (
          <>
            <div className="puyo-title-msg">GAME OVER</div>
            <p className="puyo-final">Score {score}</p>
          </>
        )}
        <p className="puyo-press">
          Press <kbd>Space</kbd> to {over ? "play again" : "start"}
        </p>
      </div>
    </div>
  );
}

function PauseMenu({
  onResume,
  onRestart,
  onQuit,
}: {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}) {
  return (
    <div className="puyo-overlay show">
      <div className="puyo-card">
        <div className="puyo-title-msg">PAUSED</div>
        <button className="puyo-btn" onClick={onResume}>
          CONTINUE
        </button>
        <button className="puyo-btn ghost" onClick={onRestart}>
          START OVER
        </button>
        <button className="puyo-btn ghost" onClick={onQuit}>
          QUIT GAME
        </button>
      </div>
    </div>
  );
}

function HelpOverlay({ onClose }: { onClose: () => void }) {
  const rows: [string, string[]][] = [
    ["Move", ["\u2190", "\u2192"]],
    ["Rotate", ["\u2191", "Z", "X"]],
    ["Soft drop", ["\u2193"]],
    ["Hard drop", ["Space"]],
    ["Pause / Menu", ["Esc"]],
  ];
  return (
    <div className="puyo-overlay show">
      <div className="puyo-card wide">
        <div className="puyo-title-msg">CONTROLS</div>
        <div className="puyo-keys">
          {rows.map(([label, keys]) => (
            <div className="row" key={label}>
              <span>{label}</span>
              <span>
                {keys.map((k) => (
                  <kbd key={k}>{k}</kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
        <p className="puyo-help-note">
          Match 4+ same-colour puyos to pop them. Stack pops into chains for big
          scores.
        </p>
        <button className="puyo-btn" onClick={onClose}>
          CLOSE
        </button>
      </div>
    </div>
  );
}

export function Game({ onQuit }: { onQuit?: () => void }) {
  const {
    phase,
    hud,
    chain,
    help,
    muted,
    boardRef,
    nextRef,
    start,
    resume,
    pause,
    quit,
    toggleMute,
    closeHelp,
  } = usePuyoGame(onQuit);

  return (
    <div className="puyo-shell cinematic">
      <div className="puyo-main">
        {/* LEFT — Next queue + chain badge */}
        <div className="puyo-col left">
          <div className="puyo-panel nextbox">
            <div className="puyo-label">Next</div>
            <div className="puyo-well">
              <canvas
                ref={nextRef}
                width={NEXT_W}
                height={NEXT_COUNT * NEXT_SLOT_H}
              />
            </div>
          </div>
          <ChainBadge chain={chain} />
        </div>

        {/* CENTER — playfield + overlays */}
        <div className="puyo-playfield-wrap">
          <canvas ref={boardRef} width={BOARD_W} height={BOARD_H} />
          {(phase === "idle" || phase === "over") && (
            <StartOverlay over={phase === "over"} score={hud.score} />
          )}
          {phase === "paused" && (
            <PauseMenu onResume={resume} onRestart={start} onQuit={quit} />
          )}
          {help && <HelpOverlay onClose={closeHelp} />}
        </div>

        {/* RIGHT — score + chain power + stats */}
        <div className="puyo-col right">
          <div className="puyo-panel scorebox">
            <div className="puyo-label">Score</div>
            <div className="puyo-score-v">
              {String(hud.score).padStart(5, "0")}
            </div>
          </div>
          <div className="puyo-panel powerbox">
            <div className="puyo-label center">Chain Power</div>
            <ChainRing chain={chain} />
          </div>
          <div className="puyo-panel statbox">
            <div className="stat">
              <span>Puyo Cleared</span>
              <b>{hud.cleared}</b>
            </div>
            <div className="stat">
              <span>Max Chain</span>
              <b>{hud.chainMax}</b>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM BAR — back + pause + sound */}
      <div className="puyo-bottombar">
        <button className="puyo-bar-btn" onClick={quit}>
          {"\u2039 BACK"}
        </button>
        <button
          className="puyo-bar-btn"
          onClick={() => (phase === "playing" ? pause() : start())}
        >
          {phase === "playing" ? "\u23F8 PAUSE" : "\u25B6 PLAY"}
        </button>
        <button
          className="puyo-bar-btn icon"
          onClick={toggleMute}
          aria-label="Toggle sound"
        >
          {muted ? "\uD83D\uDD07" : "\uD83D\uDD0A"}
        </button>
      </div>
    </div>
  );
}
