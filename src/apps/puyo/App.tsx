import { Game } from "./Game";
import { Icon } from "./Icon";
import type { AppDefinition } from "../types";

/** Standalone Puyo app definition. The Arcade hub renders <Game/> directly, but
 *  this entry lets Puyo also be launched on its own (dock/desktop) if desired. */
export const puyoApp: AppDefinition = {
  id: "puyo",
  name: "Puyo",
  icon: <Icon />,
  showOnDesktop: false,
  defaultSize: { w: 720, h: 640 },
  minSize: { w: 560, h: 560 },
  resizable: true,
  singleton: true,
  title: "Puyo Puyo",
  render: (_ctx, onClose) => <Game onQuit={onClose} />,
};
