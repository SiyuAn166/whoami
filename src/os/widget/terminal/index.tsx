import { TerminalContent } from "./TerminalContent";

import type { WidgetDefinition } from "../types";

import "./TerminalTipWidget.module.css";

export const terminalTipWidget: WidgetDefinition = {
  id: "terminalTip",
  size: "wide",
  variant: "terminal",
  order: 50,
  onActivate: (ctx) => ctx.openApp("terminal"),
  render: (ctx) => <TerminalContent ctx={ctx} />,
};
