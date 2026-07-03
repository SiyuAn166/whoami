import type { WidgetRenderContext } from "../types";

export type Link = {
  href: string;
  label: string;
  icon: "email" | "linkedin" | "github" | "link";
};

export function buildLinks(ctx: WidgetRenderContext): Link[] {
  const data = ctx.data?.payload || {};
  const out: Link[] = [];
  if (data.email)
    out.push({
      href: `mailto:${data.email}`,
      label: data.email,
      icon: "email",
    });
  if (data.linkedin)
    out.push({ href: data.linkedin, label: "LinkedIn", icon: "linkedin" });
  if (data.github)
    out.push({ href: data.github, label: "GitHub", icon: "github" });
  if (data.website)
    out.push({ href: data.website, label: "Website", icon: "link" });
  return out;
}
