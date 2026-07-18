import type { PortfolioData } from "../../types/portfolio";
import { SECTION_LABEL, useFinderNav } from "./nav";
import styles from "./Finder.module.css";

/**
 * Finder path bar — rendered below the content area via the
 * AppDefinition.renderFooter slot. Shows the breadcrumb trail and the live
 * item count for the current folder, like a real macOS Finder window.
 */
export function FinderFooter({ data }: { data: PortfolioData }) {
  const { section } = useFinderNav();
  const counts: Record<string, number> = {
    experience: data.experience.length,
    projects: data.projects.length,
    skills: data.skills.length,
  };
  const count = counts[section] ?? 0;
  return (
    <div className={styles.finderPathbar}>
      <div className={styles.finderCrumbs}>
        <span
          className={`${styles.finderCrumb} ${styles.finderCrumbRoot}`}
          aria-hidden
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <rect
              x="1.75"
              y="3.25"
              width="12.5"
              height="9.5"
              rx="1.75"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
        </span>
        <span className={styles.finderCrumb}>Macintosh HD</span>
        <span className={styles.finderCrumbSep}>›</span>
        <span className={styles.finderCrumb}>Portfolio</span>
        <span className={styles.finderCrumbSep}>›</span>
        <span className={`${styles.finderCrumb} ${styles.isCurrent}`}>
          {SECTION_LABEL[section]}
        </span>
      </div>
      <span className={styles.finderCount}>
        {count} {count === 1 ? "item" : "items"}
      </span>
    </div>
  );
}
