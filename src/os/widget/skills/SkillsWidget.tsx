import { navigateTo } from "../../../apps/finder/nav";
import type { WidgetDefinition } from "../types";
import { SkillsContent } from "./SkillsContent";
import "./SkillsWidget.css";

export const skillsWidget: WidgetDefinition = {
  id: "skills",
  size: "medium",
  variant: "glass",
  title: "Top Skills",
  order: 20,
  defaultPos: { x: 18, y: 320 },
  enabled: (ctx) => ctx.data.skills.length > 0,
  onActivate: (ctx) => {
    ctx.openApp("finder");
    navigateTo("skills");
  },
  render: (ctx) => <SkillsContent ctx={ctx} />,
};
