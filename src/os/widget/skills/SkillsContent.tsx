import type { WidgetRenderContext } from "../types";
import type { Skill } from "../../../types/portfolio";
import "./SkillsWidget.css";

type Domain = "lang" | "infra" | "dist";

const DOMAIN_META: Record<Domain, { label: string; short: string }> = {
  lang: { label: "Languages", short: "Lang" },
  infra: { label: "Cloud Infra", short: "Cloud" },
  dist: { label: "Distributed", short: "Dist" },
};
const ORDER: Domain[] = ["lang", "infra", "dist"];

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
      className="skw"
      role="group"
      aria-label={`${total} skills across three domains`}
    >
      <div className="skw-head">
        <span className="skw-total">{total}</span>
        <span className="skw-total-label">skills</span>
      </div>

      <div className="skw-bar" aria-hidden>
        {segments.map((d) => (
          <span
            key={d}
            className={`skw-seg skw-seg--${d}`}
            style={{ flexGrow: counts[d] }}
          >
            {counts[d] >= 2 ? counts[d] : ""}
          </span>
        ))}
      </div>

      <ul className="skw-legend">
        {ORDER.map((d) => (
          <li className="skw-leg" key={d}>
            <span className={`skw-dot skw-dot--${d}`} aria-hidden />
            <span className="skw-leg-label">{DOMAIN_META[d].label}</span>
            <span className="skw-leg-count">{counts[d]}</span>
          </li>
        ))}
      </ul>

      <div className="skw-foot">View all in Finder ›</div>
    </div>
  );
}
