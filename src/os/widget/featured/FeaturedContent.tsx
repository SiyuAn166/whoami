import type { WidgetRenderContext } from "../types";

import styles from "./FeaturedProjectWidget.module.css";

export function FeaturedContent({ ctx }: { ctx: WidgetRenderContext }) {
  const p = ctx.data.projects[0];
  return (
    <div className={styles.wgtFeatured}>
      <div className={styles.wgtFeaturedTop}>
        <span className={styles.wgtFeaturedName}>
          {p.name.replace(/_/g, " ")}
        </span>
        <span
          className={styles.wgtFeaturedStatus}
          data-status={p.status.toLowerCase()}
        >
          {p.status}
        </span>
      </div>
      <p className={styles.wgtFeaturedDesc}>{p.description}</p>
      <div className={styles.wgtFeaturedTags}>
        {p.tags.slice(0, 3).map((t) => (
          <span className={styles.wgtTag} key={t}>
            {t.replace(/_/g, " ")}
          </span>
        ))}
      </div>
      <div className={styles.wgtFeaturedCta}>
        {p.version} · {ctx.data.projects[0].url ? "Open ↗" : "Details"}
      </div>
    </div>
  );
}
