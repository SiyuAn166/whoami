import { ControlCenterMenu } from "../../controlcenter/ControlCenterMenu";
import { MenuClock } from "./MenuBarClock";
import { AppleIcon, BatteryIcon, SearchIcon, WifiIcon } from "./MenuBarIcons";

import "./MenuBar.css";

interface MenuBarProps {
  appName: string;
  /** In fullscreen the bar is hidden; it slides back on top-edge hover. */
  hidden?: boolean;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

export function MenuBar({
  appName,
  hidden,
  onPointerEnter,
  onPointerLeave,
}: MenuBarProps) {
  return (
    <div
      className={`menu-bar${hidden ? " menu-bar--hidden" : ""}`}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <div className="flex items-center gap-0.5">
        <span className="menu-item menu-item--apple" aria-hidden>
          <AppleIcon />
        </span>
        <span className="menu-item font-bold">{appName}</span>
        <span className="menu-item font-semibold hidden sm:inline">File</span>
        <span className="menu-item font-semibold hidden sm:inline">Edit</span>
        <span className="menu-item font-semibold hidden md:inline">View</span>
        <span className="menu-item font-semibold hidden md:inline">Go</span>
        <span className="menu-item font-semibold hidden md:inline">Window</span>
        <span className="menu-item font-semibold hidden md:inline">Help</span>
      </div>
      <div className="flex items-center">
        <span className="menu-item" aria-hidden>
          <BatteryIcon />
        </span>
        <span className="menu-item" aria-hidden>
          <WifiIcon />
        </span>
        <span className="menu-item" aria-hidden>
          <SearchIcon />
        </span>
        <ControlCenterMenu />
        <span className="menu-item" aria-hidden>
          <MenuClock />
        </span>
      </div>
    </div>
  );
}
