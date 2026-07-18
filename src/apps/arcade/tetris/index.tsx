/* eslint-disable react-refresh/only-export-components -- manifest/barrel entrance, not a hot-reloaded page component */
import type { AppDefinition } from "../../types";
import { Game } from "./Game";
import { Icon } from "./Icon";

export { default as cover } from "./assets/tetris-cover.png";
export { Game } from "./Game";
export { Icon } from "./Icon";
export * from "./lib/config";
export * from "./lib/engine";

/** Standalone Tetris app definition.
 *  The Arcade hub renders <Game/> directly, but this entry lets Tetris also be
 *  launched on its own (dock/desktop) if desired — mirrors puyo's entry.
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
