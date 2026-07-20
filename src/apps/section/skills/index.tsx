import { createElement } from "react";
import {
  Cloudflare,
  Docker,
  Go,
  GoogleCloud,
  Grafana,
  Java,
  Kafka,
  Kubernetes,
  Linux,
  PostgreSQL,
  Python,
  React as ReactIcon,
  TailwindCSS,
  Terraform,
  TypeScript,
  ViteJS,
} from "developer-icons";

import type { Skill } from "../../../types/portfolio";
import type { ComponentType, CSSProperties } from "react";

import styles from "./SkillSection.module.css";

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
        fontFamily: "'Consolas', ui-monospace, SFMono-Regular, monospace",
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

/* ═════════════════════════ FINDER — icon grid ═════════════════════════
   Launchpad-style grid: real full-colour brand logos placed bare (no tile
   box), with a small coloured monogram square only for skills that have no
   logo (concepts / trademark-removed brands). No progress bars, no numbers.
   Grouping is data-driven from `skill.category`, with name-based fallback.
   ========================================================================== */

type Domain = "lang" | "infra" | "dist" | "frontend";

const DOMAINS: { id: Domain; label: string; color: string }[] = [
  { id: "lang", label: "Languages", color: "var(--sk-lang, var(--info))" },
  {
    id: "infra",
    label: "Cloud Infrastructure",
    color: "var(--sk-infra, var(--ok))",
  },
  {
    id: "dist",
    label: "Distributed Systems & Networking",
    color: "var(--sk-dist, var(--magenta))",
  },
  {
    id: "frontend",
    label: "Frontend",
    color: "var(--sk-frontend, var(--warn))",
  },
];

function classify(skill: Skill): Domain {
  // 1) explicit data field wins (single source of truth in data.json)
  if (skill.category) return skill.category as Domain;

  // 2) fallback inference for legacy / missing data
  const n = skill.name.toLowerCase();
  if (/(react|vue|svelte|tailwind|vite|css|next)/.test(n)) return "frontend";
  if (
    /(^go$|golang|java|python|type|script|\bsql\b|postgres|rust|kotlin|swift)/.test(
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

/* Skill name (normalised) → real full-colour logo component.
   Anything not listed here falls back to a coloured monogram square.
   Only these are imported, so the bundle stays tiny (tree-shaken). */
type IconComp = ComponentType<{ size?: number; className?: string }>;

const ICONS: Record<string, IconComp> = {
  go: Go,
  java: Java,
  python: Python,
  typescript: TypeScript,
  postgresql: PostgreSQL,
  kubernetes: Kubernetes,
  docker: Docker,
  linux: Linux,
  terraform: Terraform,
  gcp: GoogleCloud,
  grafana: Grafana,
  kafka: Kafka,
  cloudflare: Cloudflare,
  react: ReactIcon,
  tailwindcss: TailwindCSS,
  vitejs: ViteJS,
};

function resolveIcon(name: string): IconComp | null {
  const key = name.toLowerCase().replace(/[_\s]+/g, "");
  return ICONS[key] ?? null;
}

/* Stable hue from the skill name — used to colour the monogram fallback. */
function hueOf(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

function monogram(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9]/g, "");
  return clean.slice(0, 2).toUpperCase() || "?";
}

function SkillTile({ skill }: { skill: Skill }) {
  const label = skill.name.replace(/_/g, " ");
  const Icon = resolveIcon(skill.name);
  return (
    <div className={styles.skTile} title={label}>
      {Icon ? (
        <div className={styles.skIc}>
          {createElement(Icon, { size: 44, className: styles.skImg })}
        </div>
      ) : (
        <div
          className={styles.skIcMono}
          style={{ "--sk-h": hueOf(skill.name) } as CSSProperties}
        >
          <span className={styles.skMono}>{monogram(skill.name)}</span>
        </div>
      )}
      <span className={styles.skName}>{label}</span>
    </div>
  );
}

function FinderSkills({ skills }: { skills: Skill[] }) {
  const groups = DOMAINS.map((d) => ({
    ...d,
    items: skills.filter((s) => classify(s) === d.id),
  })).filter((g) => g.items.length > 0);

  return (
    <section className={styles.skRoot}>
      {groups.map((g) => (
        <div className="sk-group" key={g.id}>
          <div className={styles.skHead}>
            <span className={styles.skDot} style={{ background: g.color }} />
            {g.label}
            <span className={styles.skCount}>{g.items.length}</span>
          </div>
          <div className={styles.skGrid}>
            {g.items.map((s) => (
              <SkillTile key={s.name} skill={s} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
