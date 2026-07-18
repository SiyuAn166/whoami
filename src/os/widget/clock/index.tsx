import type { WidgetDefinition } from "../types";
import { ClockContent } from "./ClockContent";
import "./ClockWidget.module.css";

export const clockWidget: WidgetDefinition = {
  id: "clock",
  size: "small",
  variant: "glass",
  order: 10,
  defaultPos: { x: 18, y: 60 },
  render: (ctx) => <ClockContent ctx={ctx} />,
};
