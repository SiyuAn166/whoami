import type { WidgetDefinition } from "../types";
import { CalendarContent } from "./CalendarContent";
import "./CalendarWidget.module.css";

export const calendarWidget: WidgetDefinition = {
  id: "calendar",
  size: "small",
  variant: "glass",
  order: 15,
  render: () => <CalendarContent />,
};
