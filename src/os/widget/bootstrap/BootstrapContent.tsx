import styles from "./BootstrapWidget.module.css";

/**
 * Bootstrap widget — S4 "annotated desktop map".
 * A miniature macOS desktop (menu bar · window · dock) with leader-line
 * labels pointing at each interaction. Static, no animation.
 */
export function BootstrapContent() {
  return (
    <div className={styles.bswRoot}>
      <header className={styles.bswHead}>
        <h2 className={styles.bswTitle}>
          Welcome <span className={styles.bswWave}>👋</span>
        </h2>
        <p className={styles.bswSub}>A portfolio that works like a Mac.</p>
      </header>

      <div
        className={styles.bswMap}
        role="img"
        aria-label="A miniature macOS desktop showing the menu bar, a window and the dock"
      >
        <div className={styles.bswMenubar}>
          <span />
          <span style={{ width: 8 }} />
          <span style={{ width: 10 }} />
        </div>

        <div className={styles.bswWin}>
          <i />
        </div>

        <div className={styles.bswDock}>
          <b />
          <b />
          <b />
        </div>

        <div className={`${styles.bswTag} ${styles.bswTagRc}`}>
          Right-click → menu
        </div>
        <div className={`${styles.bswTag} ${styles.bswTagDock}`}>
          Dock → open apps
        </div>
        <div className={`${styles.bswTag} ${styles.bswTagDrag}`}>
          Drag → move windows
        </div>
      </div>
    </div>
  );
}
