import type { WidgetRenderContext } from "../types";

export type Link = {
  href: string;
  label: string;
  icon: "email" | "linkedin" | "github" | "link";
};

// Normalize a raw value into a valid absolute href.
// data.json stores links without a protocol (e.g. "linkedin.com/in/..."),
// which the browser would otherwise treat as a relative path.
function normalizeUrl(value: string): string {
  const v = value.trim();
  if (/^(https?:\/\/|mailto:)/i.test(v)) return v;
  return `https://${v}`;
}

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
    out.push({ href: `mailto:${email.trim()}`, label: "Email", icon: "email" });
  if (linkedin)
    out.push({
      href: normalizeUrl(linkedin),
      label: "LinkedIn",
      icon: "linkedin",
    });
  if (github)
    out.push({ href: normalizeUrl(github), label: "GitHub", icon: "github" });
  if (website)
    out.push({ href: normalizeUrl(website), label: "Website", icon: "link" });
  return out;
}
