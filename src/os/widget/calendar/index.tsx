import { CalendarContent } from "./CalendarContent";

import type { WidgetDefinition } from "../types";

import "./CalendarWidget.module.css";

export const calendarWidget: WidgetDefinition = {
  id: "calendar",
  size: "small",
  variant: "glass",
  order: 15,
  render: () => <CalendarContent />,
};
