import type { Meta } from "../../types/portfolio";
import windowStyles from "../../os/window/Window.module.css";

/** Thin status bar pinned to the bottom of the Terminal window. */
export function StatusBar({ meta }: { meta: Meta }) {
  return (
    <footer className={windowStyles.statusBar}>
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
