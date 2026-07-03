import type { ReactNode } from "react";
import type { PortfolioData } from "../../../types/portfolio";
import { ExperienceSection } from "../../finder/section/experience/ExperienceSection";
import { IdentitySection } from "../../finder/section/identity/IdentitySection";
import { ProjectSection } from "../../finder/section/projects/ProjectSection";
import { SkillSection } from "../../finder/section/skills/SkillSection";
import type { VDir } from "../vfs";
import { resolve } from "../vfs";
import { ContactCard } from "./ContactCard";
import { Text } from "./TerminalText";
import { HELP } from "./constants";

export function renderFile(
  render: string | undefined,
  text: string | undefined,
  data: PortfolioData,
): ReactNode {
  switch (render) {
    case "identity":
      return (
        <IdentitySection
          identity={data.identity}
          experience={data.experience}
          meta={data.meta}
        />
      );
    case "experience":
      return <ExperienceSection entries={data.experience} variant="terminal" />;
    case "projects":
      return <ProjectSection projects={data.projects} variant="terminal" />;
    case "skills":
      return <SkillSection skills={data.skills} variant="terminal" />;
    case "contact":
      return <ContactCard data={data} />;
    default:
      return <Text>{text ?? ""}</Text>;
  }
}

/** First url found directly inside a directory (e.g. its README.md). */
export function dirUrl(dir: VDir): string | null {
  const f = dir.children.find((c) => c.type === "file" && c.url);
  return f && f.type === "file" ? (f.url ?? null) : null;
}

export function resolveOpen(
  fs: VDir,
  cwd: string[],
  arg: string,
): string | null {
  if (!arg) return null;
  if (/^https?:\/\//i.test(arg)) return arg;
  const target = resolve(fs, cwd, arg);
  if (target) {
    if (target.node.type === "file") return target.node.url ?? null;
    return dirUrl(target.node); // directory → its README link
  }
  // Fallback: treat a bare argument as a project slug, searchable from anywhere.
  const search = (dir: VDir): string | null => {
    for (const c of dir.children) {
      if (c.type !== "dir") continue;
      if (c.name === arg) return dirUrl(c);
      const hit = search(c);
      if (hit) return hit;
    }
    return null;
  };
  return search(fs);
}

export function manPage(cmd: string | undefined): ReactNode {
  const entry = HELP.find((h) => h.name === cmd);
  if (!cmd)
    return (
      <Text color="var(--fg-dim)">
        What manual page do you want? (try `man ls`)
      </Text>
    );
  if (!entry)
    return <Text color="var(--error)">{`No manual entry for ${cmd}`}</Text>;
  return (
    <Text>{`${entry.name.toUpperCase()}(1)\n\n    ${entry.name} — ${entry.desc}`}</Text>
  );
}
