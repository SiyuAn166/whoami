// ============================================================================
// ArcadeLoader — a short (~2.5s) "bouncing dots" boot screen shown when the
// Arcade hub mounts. Five colored dots bounce in a rainbow wave while the
// Arcade loads, then a LOADING label pulses beneath them. The parent (Hub)
// controls the lifecycle: it renders this while `booting`, flips `leaving` to
// fade it out, then unmounts it. All animation lives in ArcadeLoader.module.css.
// ============================================================================
import styles from "./ArcadeLoader.module.css";

export function ArcadeLoader({
  accent,
  leaving,
}: {
  accent: string;
  leaving: boolean;
}) {
  return (
    <div
      className={`${styles.loader}${leaving ? ` ${styles.leaving}` : ""}`}
      role="status"
      aria-label="Loading Arcade"
      style={{ ["--acc" as string]: accent }}
    >
      <div className={styles.dots} aria-hidden>
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className={styles.label}>LOADING</div>
    </div>
  );
}
