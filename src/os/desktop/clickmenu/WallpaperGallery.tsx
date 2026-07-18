// src/os/desktop/clickmenu/WallpaperGallery.tsx
// Right-click → "Change Wallpaper…" gallery. Pure-CSS wallpapers (see
// wallpapers.css); picking one applies it immediately and persists via the
// caller (Desktop.tsx → localStorage). No images, no greeting text.
import { useEffect } from "react";
import { WALLPAPERS } from "./wallpapers.data";

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
      className="wallpaper-gallery__scrim"
      onClick={onClose}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="wallpaper-gallery__panel"
        role="dialog"
        aria-label="Change wallpaper"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="wallpaper-gallery__title">Wallpaper</h2>
        <div className="wallpaper-gallery__grid">
          {WALLPAPERS.map((w) => (
            <button
              key={w.id}
              type="button"
              className={"wp-thumb" + (w.id === current ? " is-active" : "")}
              data-wallpaper={w.id}
              aria-pressed={w.id === current}
              title={w.name}
              onClick={() => onSelect(w.id)}
            >
              {w.id === current && (
                <span className="wp-thumb__check" aria-hidden>
                  ✓
                </span>
              )}
              <span className="wp-thumb__name">{w.name}</span>
            </button>
          ))}
        </div>
        <div className="wallpaper-gallery__footer">
          <button
            type="button"
            className="wallpaper-gallery__done"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
