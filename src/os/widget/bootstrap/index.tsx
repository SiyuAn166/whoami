import type { WidgetDefinition } from "../types";
import { BootstrapContent } from "./BootstrapContent";
import "./BootstrapWidget.module.css";

export const bootstrapWidget: WidgetDefinition = {
  id: "bootstrap",
  size: "large",
  variant: "glass",
  order: 0, // first / top of the column
  defaultAnchor: "center", // center the welcome widget on the screen
  defaultPos: { x: 660, y: 180 }, // fallback only (used before measurement / if anchoring is skipped)
  render: () => <BootstrapContent />,
};
