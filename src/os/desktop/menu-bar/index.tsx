import { ControlCenterMenu } from "../../control-center/ControlCenterMenu";
import { MenuClock } from "./Clock";
import { AppleIcon, BatteryIcon, SearchIcon, WifiIcon } from "./Icons";

import styles from "./MenuBar.module.css";

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
      className={`${styles.menuBar}${hidden ? " " + styles.menuBarHidden : ""}`}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <div className="flex items-center gap-0.5">
        <span
          className={`${styles.menuItem} ${styles.menuItemApple}`}
          aria-hidden
        >
          <AppleIcon />
        </span>
        <span className={`${styles.menuItem} font-bold`}>{appName}</span>
        <span className={`${styles.menuItem} font-semibold hidden sm:inline`}>
          File
        </span>
        <span className={`${styles.menuItem} font-semibold hidden sm:inline`}>
          Edit
        </span>
        <span className={`${styles.menuItem} font-semibold hidden md:inline`}>
          View
        </span>
        <span className={`${styles.menuItem} font-semibold hidden md:inline`}>
          Go
        </span>
        <span className={`${styles.menuItem} font-semibold hidden md:inline`}>
          Window
        </span>
        <span className={`${styles.menuItem} font-semibold hidden md:inline`}>
          Help
        </span>
      </div>
      <div className="flex items-center">
        <span className={styles.menuItem} aria-hidden>
          <BatteryIcon />
        </span>
        <span className={styles.menuItem} aria-hidden>
          <WifiIcon />
        </span>
        <span className={styles.menuItem} aria-hidden>
          <SearchIcon />
        </span>
        <ControlCenterMenu />
        <span className={styles.menuItem} aria-hidden>
          <MenuClock />
        </span>
      </div>
    </div>
  );
}
