import { AppleIcon } from "./Icons";

import styles from "./Boot.module.css";

/**
 * Classic Mac–style system boot screen.
 * Full-screen black overlay with a single thin progress bar.
 * Shown while the whole OS mounts, then fades out (see useBootSequence).
 *
 * No brand logo is used. An icon slot is intentionally reserved above the
 * bar — drop your own mark/glyph into the placeholder below when ready.
 */
export function BootScreen({ leaving }: { leaving: boolean }) {
  return (
    <div
      className={`${styles.boot} ${leaving ? styles.leaving : ""}`}
      role="progressbar"
      aria-label="Starting up"
      aria-busy={!leaving}
    >
      <div className={styles.stack}>
        {/* <div className={styles.icon} aria-hidden="true" /> */}
        <AppleIcon className={styles.icon} aria-hidden="false" />

        <div className={styles.bar}>
          <i className={leaving ? styles.fillDone : styles.fill} />
        </div>
      </div>
    </div>
  );
}
