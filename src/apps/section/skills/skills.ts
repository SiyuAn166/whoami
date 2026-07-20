import {
  _React,
  Akamai,
  Aws,
  ClaudeCode,
  CloudflareIcon,
  DockerIcon,
  Etcd,
  GithubCopilot,
  Go,
  GoogleCloud,
  Grafana,
  Grpc,
  Java,
  Kafka,
  Kubernetes,
  LinuxTux,
  Postgresql,
  Prometheus,
  Python,
  TailwindIcon,
  TerraformIcon,
  TypescriptIcon,
  Vite,
} from "@dev.icons/react";

import type { Skill } from "../../../types/portfolio";
import type { ComponentType, CSSProperties } from "react";

/* ───────────────────────── shared ───────────────────────── */
export const NS = "siyu";

export function getStatus(level: number): string {
  if (level >= 90) return "expert";
  if (level >= 80) return "advanced";
  if (level >= 70) return "proficient";
  if (level >= 60) return "working";
  return "learning";
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const STATUS_COLORS: Record<string, string> = {
  expert: "var(--ok)",
  advanced: "var(--info)",
  proficient: "var(--magenta)",
  working: "var(--warn)",
  learning: "var(--fg-dim)",
};

/* ═══════════ TERMINAL — kubectl column styles + proficiency bar ═══════════ */
export const SCOL = {
  status: { width: "13ch", flexShrink: 0 } as CSSProperties,
  proficiency: { flex: 1, minWidth: "20ch" } as CSSProperties,
};

export function bar(level: number): string {
  const filled = Math.max(0, Math.min(10, Math.round(level / 10)));
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

/* ═══════════ FINDER — taxonomy (grouping + matching, single source) ═══════════
   One config drives BOTH the Finder groups (label + color, in array order)
   and the name-based auto-classification (`match`). To add a category: append
   an entry. To add a skill: set its `category` in data.json (preferred), or
   extend a category's `match` keywords here. Exactly one entry is the
   `fallback` catch-all, used when nothing else matches. */
interface DomainDef {
  id: string;
  label: string;
  color: string;
  match?: RegExp; // keywords that auto-assign a skill by its name
  fallback?: boolean; // the catch-all category when nothing matches
}

export const DOMAINS = [
  {
    id: "lang",
    label: "Languages",
    color: "var(--sk-lang, var(--info))",
    match:
      /(^go$|golang|java|python|type|script|\bsql\b|postgres|rust|kotlin|swift)/,
  },
  {
    id: "infra",
    label: "Cloud Infrastructure",
    color: "var(--sk-infra, var(--ok))",
    match:
      /(kubernetes|docker|linux|terraform|aws|gcp|azure|cloud|prometheus|grafana|infra)/,
  },
  {
    id: "dist",
    label: "Distributed Systems & Networking",
    color: "var(--sk-dist, var(--magenta))",
    fallback: true,
  },
  {
    id: "frontend",
    label: "Frontend",
    color: "var(--sk-frontend, var(--warn))",
    match: /(react|vue|svelte|tailwind|vite|css|next)/,
  },
  {
    id: "agent",
    label: "Agents",
    color: "var(--sk-agent, var(--info))",
    match: /(claude|copilot|gemini|cursor)/,
  },
] as const satisfies readonly DomainDef[];

// Domain union is derived from the config — add an entry above and the type
// updates automatically; no separate union to maintain.
export type Domain = (typeof DOMAINS)[number]["id"];

const FALLBACK_DOMAIN: Domain =
  DOMAINS.find((d) => "fallback" in d && d.fallback)?.id ?? "dist";

export function classify(skill: Skill): Domain {
  // 1) explicit data field wins (single source of truth in data.json)
  if (skill.category) return skill.category as Domain;

  // 2) name-based inference — first category whose keywords match wins
  const n = skill.name.toLowerCase();
  for (const d of DOMAINS) {
    if ("match" in d && d.match.test(n)) return d.id;
  }
  return FALLBACK_DOMAIN;
}

/* ═══════════ FINDER — icons ═══════════
   Skill name (normalised) → real full-colour logo component.
   Anything not listed here falls back to a coloured monogram square.
   Only these are imported, so the bundle stays tiny (tree-shaken). */
export type IconComp = ComponentType<{ size?: number; className?: string }>;

const ICONS: Record<string, IconComp> = {
  go: Go,
  java: Java,
  python: Python,
  typescript: TypescriptIcon,
  postgresql: Postgresql,
  kubernetes: Kubernetes,
  docker: DockerIcon,
  linux: LinuxTux,
  terraform: TerraformIcon,
  gcp: GoogleCloud,
  grafana: Grafana,
  kafka: Kafka,
  cloudflare: CloudflareIcon,
  react: _React,
  tailwindcss: TailwindIcon,
  vitejs: Vite,
  aws: Aws,
  prometheus: Prometheus,
  grpc: Grpc,
  etcd: Etcd,
  akamai: Akamai,
  claude: ClaudeCode,
  copilot: GithubCopilot,
};

export function resolveIcon(name: string): IconComp | null {
  const key = name.toLowerCase().replace(/[_\s]+/g, "");
  return ICONS[key] ?? null;
}

/* ═══════════ FINDER — monogram fallback ═══════════ */
/* Stable hue from the skill name — used to colour the monogram fallback. */
export function hueOf(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

export function monogram(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9]/g, "");
  return clean.slice(0, 2).toUpperCase() || "?";
}
