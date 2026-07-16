import type { AppDefinition } from "../../types";
import { Game } from "./Game";
import { Icon } from "./Icon";

/** Standalone Tetris app definition.
 *  The Arcade hub renders <Game/> directly, but this entry lets Tetris also be
 *  launched on its own (dock/desktop) if desired — mirrors puyo/App.tsx.
 */
export const tetrisApp: AppDefinition = {
  id: "tetris",
  name: "Tetris",
  icon: <Icon />,
  showOnDesktop: false,
  defaultSize: { w: 900, h: 820 },
  minSize: { w: 720, h: 720 },
  resizable: true,
  singleton: true,
  title: "Tetris",
  render: (_ctx, onClose) => <Game onQuit={onClose} />,
};
