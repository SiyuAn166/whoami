// ============================================================================
// TetrisGame — presentational shell. Game logic/loop/input lives in
// useTetrisGame; this component only wires refs, HUD and overlays.
// ============================================================================
import { useTetrisGame, type Toast } from "./hook/useTetrisGame";
import {
  BOARD_H,
  BOARD_W,
  HOLD_H,
  HOLD_W,
  NEXT_COUNT,
  NEXT_SLOT_H,
  NEXT_W,
} from "./lib/config";

import "./style.css";

/**
 * Special-clear feedback — a single horizontal "studio" capsule.
 * Left: vertical metadata stack (system tag + big neon message).
 * Right: data metric (REN count + B2B status box). Text content unchanged.
 */
function ClearFeed({ toast, b2bOn }: { toast: Toast | null; b2bOn: boolean }) {
  // The capsule now only carries the special-clear label + the B2B sticker.
  // REN is rendered separately (see RenTag) so long names never collide with it.
  const active = !!(toast?.label || b2bOn);
  if (!active) return null;
  const statusOnly = !toast?.label;
  return (
    <div
      className={`tetris-feed show${statusOnly ? " status-only" : ""}${b2bOn ? " b2b" : ""}`}
      key={toast?.key ?? "status"}
    >
      {toast?.label && (
        <div className="tetris-feed-main">
          <span className="tetris-feed-tag">LINE CLEAR</span>
          <span className="tetris-feed-title">{toast.label}</span>
        </div>
      )}
      {b2bOn && <span className="tetris-feed-b2b">B2B</span>}
    </div>
  );
}

/** REN counter — standalone, no background box, sits below the clear capsule. */
function RenTag({ ren }: { ren: number }) {
  if (ren <= 0) return null;
  return (
    <div className="tetris-ren" key={ren}>
      <span className="tetris-ren-num">{ren}</span>
      <span className="tetris-ren-label">REN</span>
    </div>
  );
}

/** Idle / game-over prompt. */
function StartOverlay({ over, score }: { over: boolean; score: number }) {
  return (
    <div className="tetris-overlay show">
      <div className="tetris-start-hint">
        {over && (
          <>
            <h3>Game Over</h3>
            <p className="tetris-final">Score {score}</p>
          </>
        )}
        <p className="tetris-press">
          Press <kbd>Space</kbd> to {over ? "play again" : "start"}
        </p>
      </div>
    </div>
  );
}

/** Pause menu. */
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
    <div className="tetris-overlay show">
      <div className="tetris-card">
        <h3>Paused</h3>
        <button className="tetris-btn" onClick={onResume}>
          CONTINUE
        </button>
        <button className="tetris-btn ghost" onClick={onRestart}>
          START OVER
        </button>
        <button className="tetris-btn ghost" onClick={onQuit}>
          QUIT GAME
        </button>
      </div>
    </div>
  );
}

/** Controls reference. */
function HelpOverlay({ onClose }: { onClose: () => void }) {
  const rows: [string, string[]][] = [
    ["Move", ["←", "→"]],
    ["Rotate", ["↑", "Z", "X"]],
    ["Soft drop", ["↓"]],
    ["Hard drop", ["Space"]],
    ["Hold", ["C"]],
    ["Pause / Menu", ["Esc"]],
  ];
  return (
    <div className="tetris-overlay show">
      <div className="tetris-card wide">
        <h3>Controls</h3>
        <div className="tetris-keys">
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
        <button className="tetris-btn" onClick={onClose}>
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
    toast,
    b2bOn,
    ren,
    help,
    boardRef,
    holdRef,
    nextRef,
    start,
    resume,
    quit,
    closeHelp,
  } = useTetrisGame(onQuit);

  return (
    <div className="tetris-shell cinematic">
      {/* score sits in the gap above the centered group — number only */}
      <div className="tetris-score-top">
        <span className="v">{String(hud.score).padStart(6, "0")}</span>
      </div>

      <div className="tetris-main">
        {/* LEFT — Hold + special-clear messages */}
        <div className="tetris-col left">
          <div className="tetris-panel holdbox">
            <div className="tetris-label">Hold</div>
            <div className="tetris-well">
              <canvas ref={holdRef} width={HOLD_W} height={HOLD_H} />
            </div>
          </div>
          {/* studio capsule: special-clear label + B2B sticker */}
          <ClearFeed toast={toast} b2bOn={b2bOn} />
          {/* REN — standalone, no box, below the capsule */}
          <RenTag ren={ren} />
        </div>

        {/* CENTER — playfield + overlays */}
        <div className="tetris-playfield-wrap">
          <canvas ref={boardRef} width={BOARD_W} height={BOARD_H} />
          {(phase === "idle" || phase === "over") && (
            <StartOverlay over={phase === "over"} score={hud.score} />
          )}
          {phase === "paused" && (
            <PauseMenu onResume={resume} onRestart={start} onQuit={quit} />
          )}
          {help && <HelpOverlay onClose={closeHelp} />}
        </div>

        {/* RIGHT — Next queue */}
        <div className="tetris-col right">
          <div className="tetris-panel nextbox">
            <div className="tetris-label">Next</div>
            <div className="tetris-well">
              <canvas
                ref={nextRef}
                width={NEXT_W}
                height={NEXT_COUNT * NEXT_SLOT_H}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
