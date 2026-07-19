/* eslint-disable react-refresh/only-export-components -- manifest/barrel entrance, not a hot-reloaded page component */
import { Game } from "./Game";
import { Icon } from "./Icon";

import type { AppDefinition } from "../../types";

// Public entrance. The Arcade hub only consumes { Game } and { Icon }; puyoApp is
// exported for standalone launch. Engine + config are re-exported for any
// callers that want the pure logic.
export { default as cover } from "./assets/puyo-cover.webp?inline";
export { Game } from "./Game";
export { Icon } from "./Icon";
export * from "./lib/config";
export * as engine from "./lib/engine";
export type { ChainStep, Color, Grid, Mode, Piece } from "./lib/types";

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
