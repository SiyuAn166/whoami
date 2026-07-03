import {
  navigateTo,
  useFinderNav,
  SECTION_LABEL,
  type FinderSection,
} from "./finderNav";
import "./FinderSidebar.css";

export type { FinderSection };

/** macOS-style blue tinted linear glyphs for the Favorites items */
function ItemGlyph({ id }: { id: FinderSection }) {
  if (id === "experience") {
    // briefcase
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <rect
          x="1.75"
          y="4.75"
          width="12.5"
          height="8.5"
          rx="1.75"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <path
          d="M5.5 4.5V3.5C5.5 2.95 5.95 2.5 6.5 2.5H9.5C10.05 2.5 10.5 2.95 10.5 3.5V4.5"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <line
          x1="1.75"
          y1="8.25"
          x2="14.25"
          y2="8.25"
          stroke="currentColor"
          strokeWidth="1.3"
        />
      </svg>
    );
  }
  if (id === "projects") {
    // folder
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M1.75 4.5C1.75 3.95 2.2 3.5 2.75 3.5H6L7.5 5H13.25C13.8 5 14.25 5.45 14.25 6V12C14.25 12.55 13.8 13 13.25 13H2.75C2.2 13 1.75 12.55 1.75 12V4.5Z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  // skills — chart bars
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <line
        x1="3"
        y1="13"
        x2="3"
        y2="8.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <line
        x1="8"
        y1="13"
        x2="8"
        y2="4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <line
        x1="13"
        y1="13"
        x2="13"
        y2="6.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

const ITEMS: FinderSection[] = ["experience", "projects", "skills"];

export function FinderSidebar() {
  const { section } = useFinderNav();
  return (
    <nav className="finder-sidebar">
      <div className="finder-group-label">Favorites</div>
      {ITEMS.map((id) => (
        <button
          key={id}
          type="button"
          className={`finder-item${section === id ? " is-selected" : ""}`}
          onClick={() => navigateTo(id)}
        >
          <span className="finder-item-icon" aria-hidden>
            <ItemGlyph id={id} />
          </span>
          {SECTION_LABEL[id]}
        </button>
      ))}
    </nav>
  );
}
