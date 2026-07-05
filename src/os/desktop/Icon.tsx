import type { ReactNode } from "react";

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
        className="dock-icon"
        onClick={onOpen}
        aria-label={`Open ${label}`}
      >
        {/* macOS-style name bubble shown on hover / keyboard focus */}
        <span className="dock-tooltip" role="tooltip">
          {label}
        </span>
        {icon}
        {running && <span className="dock-dot" aria-hidden />}
      </button>
    );
  }
  return (
    <button
      className="desktop-icon"
      onDoubleClick={onOpen}
      aria-label={`Open ${label}`}
      title={label}
    >
      <span className="desktop-icon-asset">{icon}</span>
      <span className="desktop-icon-label">{label}</span>
    </button>
  );
}
