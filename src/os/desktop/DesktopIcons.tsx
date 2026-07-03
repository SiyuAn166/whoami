import { APPS } from "../../apps/registry";
import { Icon } from "./Icon";
import "./DesktopIcons.css";

interface DesktopIconsProps {
  openApp: (appId: string) => void;
}

/** Desktop shortcuts — one per app flagged `showOnDesktop`, opened via double-click. */
export function DesktopIcons({ openApp }: DesktopIconsProps) {
  const apps = APPS.filter((a) => a.showOnDesktop);
  return (
    <div className="desktop-icons">
      {apps.map((app) => (
        <Icon
          key={app.id}
          variant="desktop"
          label={app.name}
          glyph={app.icon}
          onOpen={() => openApp(app.id)}
        />
      ))}
    </div>
  );
}
