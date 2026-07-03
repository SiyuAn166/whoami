import {
  goBack,
  goForward,
  toggleSidebar,
  useFinderNav,
  SECTION_LABEL,
} from "./finderNav";

/** Toggle-sidebar glyph (macOS "sidebar.left") */
function SidebarGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect
        x="1.75"
        y="2.75"
        width="12.5"
        height="10.5"
        rx="2.25"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <line
        x1="6"
        y1="3"
        x2="6"
        y2="13"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}

/** Chevron used for back / forward */
function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d={dir === "left" ? "M10 3.5L5.5 8L10 12.5" : "M6 3.5L10.5 8L6 12.5"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Finder toolbar — injected into the window titlebar (same row as the traffic
 * lights) via the AppDefinition.renderToolbar slot. Holds the sidebar toggle,
 * the back / forward history controls and the centered current-folder name,
 * exactly like a real macOS Finder unified toolbar.
 */
export function FinderToolbar() {
  const { section, canBack, canForward, sidebarOpen } = useFinderNav();
  return (
    <div className="finder-toolbar">
      <button
        type="button"
        className={`finder-tbtn${sidebarOpen ? " is-active" : ""}`}
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
        title="Toggle sidebar"
      >
        <SidebarGlyph />
      </button>
      <span className="finder-tsep" aria-hidden />
      <button
        type="button"
        className="finder-tbtn"
        onClick={goBack}
        disabled={!canBack}
        aria-label="Back"
        title="Back"
      >
        <Chevron dir="left" />
      </button>
      <button
        type="button"
        className="finder-tbtn"
        onClick={goForward}
        disabled={!canForward}
        aria-label="Forward"
        title="Forward"
      >
        <Chevron dir="right" />
      </button>
      <span className="finder-toolbar-title">{SECTION_LABEL[section]}</span>
    </div>
  );
}
