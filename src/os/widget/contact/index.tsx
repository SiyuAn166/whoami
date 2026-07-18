import { ContactContent } from "./ContactContent";

import type { WidgetDefinition } from "../types";

import "./ContactWidget.module.css";

export const contactWidget: WidgetDefinition = {
  id: "contact",
  size: "small",
  variant: "glass",
  order: 5,
  defaultPos: { x: 60, y: 30 },
  defaultAnchor: "right",
  render: (ctx) => <ContactContent ctx={ctx} />,
};
