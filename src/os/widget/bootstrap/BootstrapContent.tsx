import "./BootstrapWidget.css";

/**
 * Bootstrap widget — S4 "annotated desktop map".
 * A miniature macOS desktop (menu bar · window · dock) with leader-line
 * labels pointing at each interaction. Static, no animation.
 */
export function BootstrapContent() {
  return (
    <div className="bsw-root">
      <header className="bsw-head">
        <h2 className="bsw-title">
          Welcome <span className="bsw-wave">👋</span>
        </h2>
        <p className="bsw-sub">A portfolio that works like a Mac.</p>
      </header>

      <div
        className="bsw-map"
        role="img"
        aria-label="A miniature macOS desktop showing the menu bar, a window and the dock"
      >
        <div className="bsw-menubar">
          <span />
          <span style={{ width: 8 }} />
          <span style={{ width: 10 }} />
        </div>

        <div className="bsw-win">
          <i />
        </div>

        <div className="bsw-dock">
          <b />
          <b />
          <b />
        </div>

        <div className="bsw-tag bsw-tag--rc">Right-click → menu</div>
        <div className="bsw-tag bsw-tag--dock">Dock → open apps</div>
        <div className="bsw-tag bsw-tag--drag">Drag → move windows</div>
      </div>
    </div>
  );
}
