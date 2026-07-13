import type { AppDefinition } from "../../types";
import { Game } from "./Game";
import { Icon } from "./Icon";
import { Toolbar } from "./Toolbar";

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
  defaultSize: { w: 830, h: 860 },
  minSize: { w: 700, h: 726 },
  icon: <Icon />,
  renderToolbar: () => <Toolbar />,
  render: (_ctx, onClose) => <Game onQuit={onClose} />,
};
