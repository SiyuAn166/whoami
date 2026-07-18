import { FeaturedContent } from "./FeaturedContent";

import type { WidgetDefinition } from "../types";

export const featuredProjectWidget: WidgetDefinition = {
  id: "featured",
  size: "wide",
  variant: "glass",
  title: "Featured Project",
  order: 30,
  defaultPos: { x: 240, y: 60 },
  defaultAnchor: "left",
  enabled: (ctx) => ctx.data.projects.length > 0,
  href: (ctx) => ctx.data.projects[0]?.url,
  onActivate: (ctx) => ctx.openApp("finder"),
  render: (ctx) => <FeaturedContent ctx={ctx} />,
};
