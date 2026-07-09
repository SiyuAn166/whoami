import type { PortfolioData } from "../../types/portfolio";
import { SECTION_LABEL, useFinderNav } from "./nav";

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
    <div className="finder-pathbar">
      <div className="finder-crumbs">
        <span className="finder-crumb finder-crumb-root" aria-hidden>
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
        <span className="finder-crumb">Macintosh HD</span>
        <span className="finder-crumb-sep">›</span>
        <span className="finder-crumb">Portfolio</span>
        <span className="finder-crumb-sep">›</span>
        <span className="finder-crumb is-current">
          {SECTION_LABEL[section]}
        </span>
      </div>
      <span className="finder-count">
        {count} {count === 1 ? "item" : "items"}
      </span>
    </div>
  );
}
