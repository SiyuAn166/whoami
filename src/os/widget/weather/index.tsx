import { WeatherContent } from "./WeatherContent";

import type { WidgetDefinition } from "../types";

import "./WeatherWidget.module.css";

export const weatherWidget: WidgetDefinition = {
  id: "weather",
  size: "large",
  variant: "glass",
  order: 12,
  defaultPos: { x: 18, y: 60 },
  defaultAnchor: "left",
  render: () => <WeatherContent />,
};
