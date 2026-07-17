import { APPS } from "../../../apps/registry";
import type { OpenOptions } from "../../window/WindowManager";
import { Icon } from "../icon/Icon";
import "./Dock.css";

interface DockProps {
  isOpen: (appId: string) => boolean;
  openApp: (appId: string, opts?: OpenOptions) => void;
  /** Hidden (slid off-screen) while a window is fullscreen. */
  hidden?: boolean;
}

/** Always-visible dock listing every registered app. Clicking an icon opens
 * the app at "full size" (filling the space between the menu bar and dock).
 */
export function Dock({ isOpen, openApp, hidden }: DockProps) {
  return (
    <div className={`dock${hidden ? " dock--hidden" : ""}`}>
      {APPS.map((app) => (
        <Icon
          key={app.id}
          variant="dock"
          label={app.name}
          icon={app.icon}
          running={isOpen(app.id)}
          onOpen={() => openApp(app.id, { maximized: true })}
        />
      ))}
    </div>
  );
}
