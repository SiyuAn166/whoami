// ============================================================================
// Game registry. To add a game to the Arcade, drop its folder in and append
// one entry here — the hub renders every registered game's cover automatically.
// `cover` is a portrait image (3:5, e.g. 540×900) imported as a URL by Vite.
// ============================================================================
import { cover as puyoCover, Game as PuyoGame } from "./puyo";
import { cover as tetrisCover, Game as TetrisGame } from "./tetris";

import type { ComponentType } from "react";

export interface GameDef {
  /** Stable id, used as the mounted view key. */
  id: string;
  /** Display title on the marquee. */
  name: string;
  /** One-line tagline under the title. */
  tagline: string;
  /** Accent color (hex) used for glow / selection ring. */
  accent: string;
  /** Portrait cover art (3:5). */
  cover: string;
  /** The playable component; receives onQuit to return to the hub. */
  Game: ComponentType<{ onQuit: () => void }>;
}

export const GAMES: GameDef[] = [
  {
    id: "puyo",
    name: "PUYO",
    tagline: "Match four, chain the pop.",
    accent: "#ff5cc8",
    cover: puyoCover,
    Game: PuyoGame,
  },
  {
    id: "tetris",
    name: "TETRIS",
    tagline: "Drop, line up, clear the stack.",
    accent: "#45d3ff",
    cover: tetrisCover,
    Game: TetrisGame,
  },
];
