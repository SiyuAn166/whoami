import type { Meta } from "../../types/portfolio";

/** Thin status bar pinned to the bottom of the Terminal window. */
export function StatusBar({ meta }: { meta: Meta }) {
  return (
    <footer className="status-bar">
      <span className="truncate">{meta.copyright}</span>
      <span
        className="truncate hidden sm:inline"
        style={{ textAlign: "right" }}
      >
        {meta.location}
      </span>
    </footer>
  );
}
