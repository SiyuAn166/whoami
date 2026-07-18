import type { WidgetRenderContext } from "../types";
import type { Skill } from "../../../types/portfolio";
import styles from "./SkillsWidget.module.css";

type Domain = "lang" | "infra" | "dist";

const DOMAIN_META: Record<Domain, { label: string; short: string }> = {
  lang: { label: "Languages", short: "Lang" },
  infra: { label: "Cloud Infra", short: "Cloud" },
  dist: { label: "Distributed", short: "Dist" },
};
const ORDER: Domain[] = ["lang", "infra", "dist"];
const SEG_CLASS: Record<Domain, string> = {
  lang: styles.skwSegLang,
  infra: styles.skwSegInfra,
  dist: styles.skwSegDist,
};
const DOT_CLASS: Record<Domain, string> = {
  lang: styles.skwDotLang,
  infra: styles.skwDotInfra,
  dist: styles.skwDotDist,
};

/** Domain comes from data (`category`); fall back to name inference. */
function classify(skill: Skill): Domain {
  const c = (skill as { category?: Domain }).category;
  if (c === "lang" || c === "infra" || c === "dist") return c;
  const n = skill.name.toLowerCase();
  if (
    /(^go$|golang|java|python|typescript|type_?script|\bsql\b|rust|kotlin|swift|\bc\+\+|node)/.test(
      n,
    )
  )
    return "lang";
  if (
    /(kubernetes|k8s|docker|terraform|linux|aws|gcp|azure|cloud|prometheus|grafana|helm)/.test(
      n,
    )
  )
    return "infra";
  return "dist";
}

export function SkillsContent({ ctx }: { ctx: WidgetRenderContext }) {
  const skills = ctx.data.skills ?? [];
  const total = skills.length;

  const counts: Record<Domain, number> = { lang: 0, infra: 0, dist: 0 };
  for (const s of skills) counts[classify(s)] += 1;

  const segments = ORDER.filter((d) => counts[d] > 0);

  return (
    <div
      className={styles.skw}
      role="group"
      aria-label={`${total} skills across three domains`}
    >
      <div className={styles.skwHead}>
        <span className={styles.skwTotal}>{total}</span>
        <span className={styles.skwTotalLabel}>skills</span>
      </div>

      <div className={styles.skwBar} aria-hidden>
        {segments.map((d) => (
          <span
            key={d}
            className={`${styles.skwSeg} ${SEG_CLASS[d]}`}
            style={{ flexGrow: counts[d] }}
          >
            {counts[d] >= 2 ? counts[d] : ""}
          </span>
        ))}
      </div>

      <ul className={styles.skwLegend}>
        {ORDER.map((d) => (
          <li className={styles.skwLeg} key={d}>
            <span className={`${styles.skwDot} ${DOT_CLASS[d]}`} aria-hidden />
            <span className={styles.skwLegLabel}>{DOMAIN_META[d].label}</span>
            <span className={styles.skwLegCount}>{counts[d]}</span>
          </li>
        ))}
      </ul>

      <div className={styles.skwFoot}>View all in Finder ›</div>
    </div>
  );
}
