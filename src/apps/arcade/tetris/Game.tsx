import React, { useEffect, useRef, useState } from "react";
import { TetrisStage } from "./pixi/TetrisStage";
import { SoundBank } from "./lib/sound";
import { useTetrisGame } from "./hook/useTetrisGame";
import { Hud } from "./components/Hud";
import { Overlays, Controls } from "./components/Overlays";
import "./style.css";

export interface GameProps {
  onQuit?: () => void;
}

export const Game: React.FC<GameProps> = ({ onQuit }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<TetrisStage | null>(null);
  const soundRef = useRef<SoundBank | null>(null);
  const [booted, setBooted] = useState(false);
  const [muted, setMuted] = useState(false);

  const { hud, reset } = useTetrisGame(stageRef, soundRef, booted);

  useEffect(() => {
    let disposed = false;
    const stage = new TetrisStage();
    const sound = new SoundBank();
    (async () => {
      await stage.init(hostRef.current!);
      if (disposed) {
        stage.destroy();
        return;
      }
      stageRef.current = stage;
      soundRef.current = sound;
      void sound.load();
      setBooted(true);
    })();
    return () => {
      disposed = true;
      stageRef.current?.destroy();
      stageRef.current = null;
    };
  }, []);

  // start a game once the stage is live
  useEffect(() => {
    if (booted) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booted]);

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    soundRef.current?.setMuted(m);
  };

  return (
    <div className="tetris-root">
      <Hud
        hud={hud}
        muted={muted}
        onRestart={() => reset()}
        onToggleMute={toggleMute}
        onQuit={onQuit}
      />
      <div className="tetris-stage-wrap">
        <div ref={hostRef} className="tetris-canvas-host" />
        <Overlays hud={hud} onRestart={() => reset()} />
      </div>
      <Controls />
    </div>
  );
};

export default Game;
