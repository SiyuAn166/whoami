// ============================================================================
// Arcade hub — the game-select surface.
// A neon card grid; clicking a card
// launches that game as a full-window sub-view.
// Each game already owns its own
// loop/input/state, so the hub just swaps which one is mounted and hands it an
// onQuit that returns to the grid.
// ============================================================================
import { useState, type ReactNode } from "react";
import { Game as PuyoGame } from "./puyo";
import { Icon as PuyoIcon } from "./puyo/Icon";
import { Game as TetrisGame } from "./tetris";
import { Icon as TetrisIcon } from "./tetris/Icon";

import "./style.css";

type View = "hub" | "tetris" | "puyo";

interface GameDef {
  id: Exclude<View, "hub">;
  name: string;
  tagline: string;
  accent: "cyan" | "magenta";
  icon: ReactNode;
}

const GAMES: GameDef[] = [
  {
    id: "tetris",
    name: "TETRIS",
    tagline: "Stack \u00b7 Clear \u00b7 T-Spin",
    accent: "cyan",
    icon: <TetrisIcon size={78} />,
  },
  {
    id: "puyo",
    name: "PUYO",
    tagline: "Match 4 \u00b7 Chain \u00b7 Combo",
    accent: "magenta",
    icon: <PuyoIcon size={78} />,
  },
];

export function Hub({ onClose }: { onClose?: () => void }) {
  const [view, setView] = useState<View>("hub");
  if (view === "tetris") return <TetrisGame onQuit={() => setView("hub")} />;
  if (view === "puyo") return <PuyoGame onQuit={() => setView("hub")} />;
  return (
    <div className="arcade-shell">
      <div className="arcade-scanlines" aria-hidden />
      {/* Centered stage: logo + cards sit inside the neon frame baked into the
          background photo. Because the photo is centered (cover) and this stage
          is centered, the two track together at any window size. */}
      <div className="arcade-stage">
        <div className="arcade-logo" role="img" aria-label="Arcade" />
        <main className="arcade-grid">
          {GAMES.map((g) => (
            <button
              key={g.id}
              className={`arcade-card ${g.accent}`}
              onClick={() => setView(g.id)}
            >
              <div className="arcade-card-art">{g.icon}</div>
              <div className="arcade-card-name">{g.name}</div>
              <div className="arcade-card-tag">{g.tagline}</div>
            </button>
          ))}
        </main>
      </div>
      <footer className="arcade-footer">
        {onClose && (
          <button className="arcade-foot-item link" onClick={onClose}>
            EXIT
          </button>
        )}
      </footer>
    </div>
  );
}
