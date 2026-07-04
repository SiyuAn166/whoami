import "./MenuBar.css";
import { MenuClock } from "./MenuBarClock";
import {
  AppleGlyph,
  BatteryGlyph,
  ControlCenterGlyph,
  SearchGlyph,
  WifiGlyph,
} from "./MenuBarGlyphs";

interface MenuBarProps {
  appName: string;
}

export function MenuBar({ appName }: MenuBarProps) {
  return (
    <div className="menu-bar">
      <div className="flex items-center gap-0.5">
        <span className="menu-item menu-item--apple" aria-hidden>
          <AppleGlyph />
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
          <BatteryGlyph />
        </span>
        <span className="menu-item" aria-hidden>
          <WifiGlyph />
        </span>
        <span className="menu-item" aria-hidden>
          <SearchGlyph />
        </span>
        <span className="menu-item" aria-hidden>
          <ControlCenterGlyph />
        </span>
        <span className="menu-item" aria-hidden>
          <MenuClock />
        </span>
      </div>
    </div>
  );
}
