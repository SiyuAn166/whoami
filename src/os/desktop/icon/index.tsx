import { APPS } from "../../../apps/registry";
import { Icon } from "./Icon";

import styles from "./DesktopIcons.module.css";

interface DesktopIconsProps {
  openApp: (appId: string) => void;
}

/** Desktop shortcuts — one per app flagged `showOnDesktop`, opened via double-click. */
export function DesktopIcons({ openApp }: DesktopIconsProps) {
  const apps = APPS.filter((a) => a.showOnDesktop);
  return (
    <div className={styles.desktopIcons}>
      {apps.map((app) => (
        <Icon
          key={app.id}
          variant="desktop"
          label={app.name}
          icon={app.icon}
          onOpen={() => openApp(app.id)}
        />
      ))}
    </div>
  );
}
