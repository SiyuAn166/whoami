import { APPS, getApp } from "../../../apps/registry";
import { Icon } from "../icon/Icon";

import type { WindowInstance } from "../../window/types";
import type { OpenOptions } from "../../window/WindowManager";

import styles from "./Dock.module.css";

interface DockProps {
  isOpen: (appId: string) => boolean;
  openApp: (appId: string, opts?: OpenOptions) => void;
  /** Hidden (slid off-screen) while a window is fullscreen. */
  hidden?: boolean;
  /** Windows minimized to the dock, shown as thumbnails right of a divider. */
  minimized?: WindowInstance[];
  /** Restore a minimized window (from its thumbnail). */
  onRestore?: (id: string) => void;
}

/** Always-visible dock listing every registered app. Clicking an icon opens
 * the app at its default centered size (not maximized). */
export function Dock({
  isOpen,
  openApp,
  hidden,
  minimized = [],
  onRestore,
}: DockProps) {
  return (
    <div
      className={`${styles.dock}${hidden ? " " + styles.dockHidden : ""}`}
      data-dock
    >
      {APPS.map((app) => (
        <Icon
          key={app.id}
          variant="dock"
          label={app.name}
          icon={app.icon}
          running={isOpen(app.id)}
          onOpen={() => openApp(app.id)}
        />
      ))}

      {/* Minimized-window tray: a divider, then one thumbnail per window. */}
      {minimized.length > 0 && (
        <span className={styles.dockDivider} aria-hidden />
      )}
      {minimized.map((w) => {
        const app = getApp(w.appId);
        return (
          <button
            key={w.id}
            type="button"
            className={styles.dockThumb}
            onClick={() => onRestore?.(w.id)}
            aria-label={`Restore ${w.title}`}
          >
            <span className={styles.dockThumbShot}>
              {w.snapshot ? (
                <img src={w.snapshot} alt="" aria-hidden />
              ) : (
                <span className={styles.dockThumbFallback}>{app?.icon}</span>
              )}
              {/* Little app badge in the corner, exactly like macOS. */}
              <span className={styles.dockThumbBadge}>{app?.icon}</span>
            </span>
            <span className={styles.dockThumbTip}>{w.title}</span>
          </button>
        );
      })}
    </div>
  );
}
