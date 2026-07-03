import type { WidgetRenderContext } from "../types";

export type Link = {
  href: string;
  label: string;
  icon: "email" | "linkedin" | "github" | "link";
};

export function buildLinks(ctx: WidgetRenderContext): Link[] {
  const contactLinks = ctx.data?.meta?.contactLinks ?? [];
  const githubCommand = ctx.data?.meta?.commands?.social
    ?.replace("→", "")
    .trim();

  const email = contactLinks.find((link) => link.label === "Email")?.value;
  const linkedin = contactLinks.find(
    (link) => link.label === "LinkedIn",
  )?.value;
  const github =
    contactLinks.find((link) => link.label === "GitHub")?.value ||
    githubCommand;
  const website = contactLinks.find((link) => link.label === "Website")?.value;

  const out: Link[] = [];
  if (email)
    out.push({ href: `mailto:${email}`, label: "Email", icon: "email" });
  if (linkedin)
    out.push({ href: linkedin, label: "LinkedIn", icon: "linkedin" });
  if (github) out.push({ href: github, label: "GitHub", icon: "github" });
  if (website) out.push({ href: website, label: "Website", icon: "link" });
  return out;
}
