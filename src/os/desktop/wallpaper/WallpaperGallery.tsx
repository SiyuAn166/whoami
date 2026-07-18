// src/os/desktop/clickmenu/WallpaperGallery.tsx
// Right-click → "Change Wallpaper…" gallery. Pure-CSS wallpapers (see
// wallpapers.css); picking one applies it immediately and persists via the
// caller (Desktop.tsx → localStorage). Each tile renders the SAME <Wallpaper>
// component as the live desktop, so the preview is the real thing (greeting
// included on aurora-grid), just scaled down — no images.
import { useEffect } from "react";

import { WALLPAPERS } from "./wallpapers.data";

import styles from "./Wallpaper.module.css";

import { Wallpaper } from ".";

interface Props {
  /** currently selected wallpaper id */
  current: string;
  /** apply a wallpaper (immediate, macOS-style) */
  onSelect: (id: string) => void;
  /** close the gallery */
  onClose: () => void;
}

export function WallpaperGallery({ current, onSelect, onClose }: Props) {
  // Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className={styles.wallpaperGalleryScrim}
      onClick={onClose}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className={styles.wallpaperGalleryPanel}
        role="dialog"
        aria-label="Change wallpaper"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={styles.wallpaperGalleryTitle}>Wallpaper</h2>
        <div className={styles.wallpaperGalleryGrid}>
          {WALLPAPERS.map((w) => (
            <button
              key={w.id}
              type="button"
              className={`${styles.wpThumb}${w.id === current ? " " + styles.isActive : ""}`}
              aria-pressed={w.id === current}
              title={w.name}
              onClick={() => onSelect(w.id)}
            >
              <Wallpaper id={w.id} variant="thumb" />
              {w.id === current && (
                <span className={styles.wpThumbCheck} aria-hidden>
                  ✓
                </span>
              )}
              <span className={styles.wpThumbName}>{w.name}</span>
            </button>
          ))}
        </div>
        <div className={styles.wallpaperGalleryFooter}>
          <button
            type="button"
            className={styles.wallpaperGalleryDone}
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
