import type { AppDefinition } from "../types";
import { TetrisGame } from "./TetrisGame";
import { TetrisIcon } from "./TetrisIcon";
import { TetrisToolbar } from "./TetrisToolbar";

/**
 * Tetris — Guideline-compliant single-player game.
 * Fixed-size window (fixed 10x20 board), singleton, not resizable.
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
  renderToolbar: () => <TetrisToolbar />,
  render: (_ctx, onClose) => <TetrisGame onQuit={onClose} />,
};
