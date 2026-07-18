import { APPS } from "../../../apps/registry";
import { Icon } from "../icon/Icon";

import type { OpenOptions } from "../../window/WindowManager";

import styles from "./Dock.module.css";

interface DockProps {
  isOpen: (appId: string) => boolean;
  openApp: (appId: string, opts?: OpenOptions) => void;
  /** Hidden (slid off-screen) while a window is fullscreen. */
  hidden?: boolean;
}

/** Always-visible dock listing every registered app. Clicking an icon opens
 * the app at its default centered size (not maximized). */
export function Dock({ isOpen, openApp, hidden }: DockProps) {
  return (
    <div className={`${styles.dock}${hidden ? " " + styles.dockHidden : ""}`}>
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
    </div>
  );
}
