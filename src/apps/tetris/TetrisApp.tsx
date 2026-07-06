import type { AppDefinition } from "../types";
import { TetrisGame } from "./TetrisGame";
import { TetrisIcon } from "./TetrisIcon";

/**
 * Tetris — Guideline-compliant single-player game.
 * Plugs into the window system like any other app: fixed-size window
 * (the board is a fixed 10×20 grid), singleton, not resizable.
 *
 * NOTE: field names below mirror what `WindowManager` reads from an
 * AppDefinition (id / name / defaultSize {w,h} / minSize / resizable /
 * singleton / render / icon). Adjust to your exact `apps/types.ts` if needed.
 */
export const tetrisApp: AppDefinition = {
  id: "tetris",
  name: "Tetris",
  title: "Tetris",
  singleton: true,
  resizable: false,
  defaultSize: { w: 700, h: 726 },
  minSize: { w: 700, h: 726 },
  icon: <TetrisIcon />,
  render: (_ctx, onClose) => <TetrisGame onQuit={onClose} />,
};
