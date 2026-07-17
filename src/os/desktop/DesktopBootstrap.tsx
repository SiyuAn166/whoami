import "./DesktopBootstrap.css";

/**
 * DesktopBootstrap — the onboarding "Welcome" content from the old Bootstrap
 * widget, baked directly into the desktop as a FIXED, non-interactive layer.
 *
 * Unlike a widget it cannot be moved or removed: it is part of the desktop
 * itself. It sits above the wallpaper but below windows / menu bar / dock, and
 * is `pointer-events: none` so it never intercepts clicks. Windows opened on
 * top naturally cover it.
 */
export function DesktopBootstrap() {
  return (
    <div className="desktop-bootstrap" aria-hidden>
      <div className="dbs-hero">
        <h1 className="dbs-title">
          Welcome <span className="dbs-wave">👋</span>
        </h1>
        <p className="dbs-sub">A portfolio that works like a Mac.</p>
      </div>
    </div>
  );
}
