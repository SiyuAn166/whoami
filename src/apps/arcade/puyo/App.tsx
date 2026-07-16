import type { AppDefinition } from "../../types";
import { Game } from "./Game";
import { Icon } from "./Icon";

/** Standalone Puyo app definition.
 *  The Arcade hub renders <Game/> directly, but this entry also lets Puyo be
 *  launched on its own (dock/desktop) if desired. Shape is unchanged from the
 *  previous bundle so the registry keeps working without edits.
 */
export const puyoApp: AppDefinition = {
  id: "puyo",
  name: "Puyo",
  icon: <Icon />,
  showOnDesktop: false,
  defaultSize: { w: 600, h: 780 },
  minSize: { w: 460, h: 640 },
  resizable: true,
  singleton: true,
  title: "Puyo Puyo",
  render: (_ctx, onClose) => <Game onQuit={onClose} />,
};
