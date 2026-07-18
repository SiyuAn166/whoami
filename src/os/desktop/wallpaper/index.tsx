// src/os/desktop/Wallpaper.tsx
// The desktop wallpaper AS A COMPONENT. Both the live desktop background and
// every gallery preview tile render THIS, so the wallpaper and anything baked
// into it (e.g. the greeting on aurora-grid) are defined in ONE place and can
// never drift apart — the thumbnail is literally the same picture, shrunk.
//
// The greeting is plain DOM + CSS (no image). It is sized in container-query
// units (cqw in wallpapers.css), so it scales with the wallpaper surface: huge
// on the full desktop, tiny-but-proportional in a gallery thumbnail.
import styles from "./Wallpaper.module.css";

interface WallpaperProps {
  /** wallpaper id → data-wallpaper CSS variant (see wallpapers.css) */
  id: string;
  /**
   * "desktop" = full-screen, fixed background layer (default)
   * "thumb"   = gallery preview tile (scaled-down clone)
   */
  variant?: "desktop" | "thumb";
  /**
   * Whether the baked-in greeting may show. Only the aurora-grid wallpaper
   * actually renders it; other wallpapers ignore it.
   */
  greeting?: boolean;
}

export function Wallpaper({
  id,
  variant = "desktop",
  greeting = true,
}: WallpaperProps) {
  return (
    <div
      className={`${styles.wallpaper} ${variant === "desktop" ? styles.wallpaperDesktop : styles.wallpaperThumb}`}
      data-wallpaper={id}
      aria-hidden
    >
      {greeting && id === "aurora-grid" && (
        <div className={styles.wallpaperGreeting}>
          <h1 className={styles.wallpaperTitle}>
            Welcome <span className={styles.wallpaperWave}>👋</span>
          </h1>
          <p className={styles.wallpaperSub}>
            A portfolio that works like a Mac.
          </p>
        </div>
      )}
    </div>
  );
}
