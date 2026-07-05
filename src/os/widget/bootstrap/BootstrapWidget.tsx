import type { WidgetDefinition } from "../types";
import { BootstrapContent } from "./BootstrapContent";
import "./BootstrapWidget.css";

export const bootstrapWidget: WidgetDefinition = {
  id: "bootstrap",
  size: "large",
  variant: "glass",
  order: 0, // first / top of the column
  defaultPos: { x: 660, y: 180 },
  render: () => <BootstrapContent />,
};
