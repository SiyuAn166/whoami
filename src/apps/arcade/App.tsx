import type { AppDefinition } from "../types";
import { Hub } from "./Hub";
import { Icon } from "./Icon";

/** The Arcade — a single desktop app whose console hub launches every
 *  registered game (see games.ts). */
export const arcadeApp: AppDefinition = {
  id: "arcade",
  name: "Arcade",
  icon: <Icon />,
  showOnDesktop: true,
  defaultSize: { w: 1400, h: 860 },
  minSize: { w: 1400, h: 860 },
  resizable: true,
  singleton: true,
  title: "Arcade",
  render: (_ctx, onClose) => <Hub onClose={onClose} />,
};
