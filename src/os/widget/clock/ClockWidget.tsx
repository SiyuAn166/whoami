import type { WidgetDefinition } from "../types";
import { ClockContent } from "./ClockContent";
import "./ClockWidget.css";

export const clockWidget: WidgetDefinition = {
  id: "clock",
  size: "small",
  variant: "glass",
  order: 10,
  render: (ctx) => <ClockContent ctx={ctx} />,
};
