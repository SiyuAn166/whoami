import type { CSSProperties } from "react";
import type { Skill } from "../../../types/portfolio";
import "./SkillSection.css";

/* ───────────────────────── shared ───────────────────────── */
const NS = "siyu";

function getStatus(level: number): string {
  if (level >= 90) return "expert";
  if (level >= 80) return "advanced";
  if (level >= 70) return "proficient";
  if (level >= 60) return "working";
  return "learning";
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const STATUS_COLORS: Record<string, string> = {
  expert: "var(--ok)",
  advanced: "var(--info)",
  proficient: "var(--magenta)",
  working: "var(--warn)",
  learning: "var(--fg-dim)",
};

interface SkillSectionProps {
  skills: Skill[];
  variant?: "finder" | "terminal";
}

export function SkillSection({
  skills,
  variant = "terminal",
}: SkillSectionProps) {
  return variant === "finder" ? (
    <FinderSkills skills={skills} />
  ) : (
    <TerminalSkills skills={skills} />
  );
}

/* ═════════════════════════ TERMINAL — kubectl ═════════════════════════ */
const SCOL = {
  status: { width: "13ch", flexShrink: 0 } as CSSProperties,
  proficiency: { flex: 1, minWidth: "20ch" } as CSSProperties,
};

function bar(level: number): string {
  const filled = Math.max(0, Math.min(10, Math.round(level / 10)));
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

function TerminalSkills({ skills }: { skills: Skill[] }) {
  const nameCh = Math.max(8, ...skills.map((s) => slugify(s.name).length)) + 2;
  const nameStyle: CSSProperties = { width: `${nameCh}ch`, flexShrink: 0 };
  return (
    <section
      className="kube-exp"
      style={{
        fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
        fontSize: 13,
        overflowX: "auto",
      }}
    >
      <div
        style={{
          color: "var(--fg-dim)",
          marginBottom: 8,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ color: "var(--prompt-user)" }}>➜</span>{" "}
        <span style={{ color: "var(--prompt-path)" }}>~</span>{" "}
        <span style={{ color: "var(--fg)" }}>kubectl get skills -n {NS}</span>
      </div>
      <div style={{ minWidth: "min-content" }}>
        <div
          className="flex"
          style={{
            gap: "2ch",
            padding: "2px 8px",
            color: "var(--fg-dim)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          <span style={nameStyle}>NAME</span>
          <span style={SCOL.status}>STATUS</span>
          <span style={SCOL.proficiency}>PROFICIENCY</span>
        </div>
        {skills.map((s) => {
          const status = getStatus(s.level);
          const color = STATUS_COLORS[status];
          return (
            <div
              key={s.name}
              className="flex kube-row"
              style={{ gap: "2ch", padding: "4px 8px" }}
            >
              <span style={{ ...nameStyle, color: "var(--info)" }}>
                {slugify(s.name)}
              </span>
              <span style={{ ...SCOL.status, color }}>{status}</span>
              <span style={{ ...SCOL.proficiency, whiteSpace: "nowrap" }}>
                <span style={{ color }}>{bar(s.level)}</span>
                <span style={{ color: "var(--fg-dim)" }}> {s.level}%</span>
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ color: "var(--fg-dim)", marginTop: 10 }}>
        {skills.length} skills
      </div>
    </section>
  );
}

/* ═════════════════════════ FINDER — grouped tags ═════════════════════════
   A near-monochrome, macOS-native presentation: skills are grouped by domain
   into rounded "tag" pills (Finder tags / System Settings token style).
   Colour is used only as a small semantic accent — a category dot on each pill
   and beside each group heading — never as a large block, matching macOS's
   monochrome-base + restrained-accent language.

   Grouping is data-driven from `skill.category`; a name-based inference is the
   fallback so older data keeps working. No progress bars, no gauges.
   ========================================================================== */

type Domain = "lang" | "infra" | "dist";

const DOMAINS: { id: Domain; label: string; color: string }[] = [
  { id: "lang", label: "Languages", color: "var(--sk-lang)" },
  { id: "infra", label: "Cloud Infrastructure", color: "var(--sk-infra)" },
  {
    id: "dist",
    label: "Distributed Systems & Networking",
    color: "var(--sk-dist)",
  },
];

function classify(skill: Skill): Domain {
  // 1) explicit data field wins (single source of truth in data.json)
  if (skill.category) return skill.category;

  // 2) fallback inference for legacy / missing data
  const n = skill.name.toLowerCase();
  if (
    /(^go$|golang|java|python|type|script|\bsql\b|rust|kotlin|swift|\bc\b)/.test(
      n,
    )
  )
    return "lang";
  if (
    /(kubernetes|docker|linux|terraform|aws|gcp|azure|cloud|prometheus|grafana|infra)/.test(
      n,
    )
  )
    return "infra";
  return "dist";
}

function FinderSkills({ skills }: { skills: Skill[] }) {
  const groups = DOMAINS.map((d) => ({
    ...d,
    items: skills.filter((s) => classify(s) === d.id),
  })).filter((g) => g.items.length > 0);

  return (
    <section className="sk-root">
      {groups.map((g) => (
        <div className="sk-group" key={g.id}>
          <div className="sk-head">
            <span className="sk-dot" style={{ background: g.color }} />
            {g.label}
            <span className="sk-count">{g.items.length}</span>
          </div>
          <div className="sk-tags">
            {g.items.map((s) => {
              const label = s.name.replace(/_/g, " ");
              return (
                <span className="sk-tag" key={s.name} title={label}>
                  <span
                    className="sk-tag-dot"
                    style={{ background: g.color }}
                    aria-hidden
                  />
                  <span className="sk-tag-name">{label}</span>
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

/* Back-compat alias for any existing imports. */
export const CapabilitiesSection = SkillSection;
