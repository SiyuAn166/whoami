import type { WidgetDefinition } from "../types";
import { ContactContent } from "./ContactContent";
import "./ContactWidget.css";

export const contactWidget: WidgetDefinition = {
  id: "contact",
  size: "small",
  variant: "glass",
  order: 5,
  render: (ctx) => <ContactContent ctx={ctx} />,
};
