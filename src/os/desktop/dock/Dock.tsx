import { APPS } from "../../../apps/registry";
import { Icon } from "../icon/Icon";
import "./Dock.css";

interface DockProps {
  isOpen: (appId: string) => boolean;
  openApp: (appId: string) => void;
}

/** Always-visible dock listing every registered app. */
export function Dock({ isOpen, openApp }: DockProps) {
  return (
    <div className="dock">
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
