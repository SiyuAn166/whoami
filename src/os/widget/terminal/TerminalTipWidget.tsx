import type { WidgetDefinition } from "../types";
import { TerminalContent } from "./TerminalContent";
import "./TerminalTipWidget.css";

export const terminalTipWidget: WidgetDefinition = {
  id: "terminalTip",
  size: "wide",
  variant: "terminal",
  order: 50,
  onActivate: (ctx) => ctx.openApp("terminal"),
  render: (ctx) => <TerminalContent ctx={ctx} />,
};
