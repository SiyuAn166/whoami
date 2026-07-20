import { createElement } from "react";

import {
  bar,
  classify,
  DOMAINS,
  getStatus,
  hueOf,
  monogram,
  NS,
  resolveIcon,
  SCOL,
  slugify,
  STATUS_COLORS,
} from "./skills";

import type { Skill } from "../../../types/portfolio";
import type { CSSProperties } from "react";

import styles from "./SkillSection.module.css";

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
   Data + taxonomy + icon resolution live in ./skills.
   ========================================================================== */

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
