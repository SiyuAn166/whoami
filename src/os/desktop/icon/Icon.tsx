import type { ReactNode } from "react";
import dockStyles from "../dock/Dock.module.css";
import styles from "./DesktopIcons.module.css";

interface IconProps {
  label: string;
  icon: ReactNode;
  /** Shows the little "running" dot (Dock variant only). */
  running?: boolean;
  onOpen: () => void;
  variant: "dock" | "desktop";
}

/** Shared presentational primitive behind both DockIcon and DesktopIcon. */
export function Icon({ label, icon, running, onOpen, variant }: IconProps) {
  if (variant === "dock") {
    return (
      <button
        className={dockStyles.dockIcon}
        onClick={onOpen}
        aria-label={`Open ${label}`}
      >
        {/* macOS-style name bubble shown on hover / keyboard focus */}
        <span className={dockStyles.dockTooltip} role="tooltip">
          {label}
        </span>
        {icon}
        {running && <span className={dockStyles.dockDot} aria-hidden />}
      </button>
    );
  }
  return (
    <button
      className={styles.desktopIcon}
      onDoubleClick={onOpen}
      aria-label={`Open ${label}`}
      title={label}
    >
      <span className={styles.desktopIconAsset}>{icon}</span>
      <span className={styles.desktopIconLabel}>{label}</span>
    </button>
  );
}
