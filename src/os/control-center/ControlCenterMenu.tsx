import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ControlCenterIcon } from "../desktop/menu-bar/Icons";
import { useLensFilter } from "./hook/use-lens-filter";
import { useVolume } from "./hook/use-volume";
import { SpeakerMuteIcon, SpeakerWaveIcon } from "./ControlCenterIcons";

import menuBarStyles from "../desktop/menu-bar/MenuBar.module.css";
import styles from "./ControlCenter.module.css";

// Side-effect: installs the site-wide WebAudio volume hook once (guarantees
// it runs even though MenuBar imports this module directly, not the barrel).
import "./hook/install-volume-hook";

/**
 * Menu-bar Control Center: a trigger that mirrors the other menu items and,
 * when clicked, opens a translucent macOS-style panel with a Sound module.
 *
 * The panel is rendered through a portal to <body> - NOT inside the menu bar.
 * The menu bar has its own `backdrop-filter`, which would otherwise become the
 * panel's backdrop root and flatten the glass (a child can only blur its
 * filtered ancestor, not the desktop behind it). Portaling out + fixed
 * positioning lets the panel's backdrop-filter frost the real desktop.
 */
export function ControlCenterMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { volume, setVolume, toggleMute, muted } = useVolume();

  // Build + size the L1 liquid-glass displacement filter for the panel. Runs
  // once the portal-mounted panel exists (keyed on `open`) so panelRef.current
  // is non-null; rebuilds on resize. Without this the panel is plain frost.
  useLensFilter(panelRef, [open]);

  // Close on outside pointer-down or Escape while open. The panel lives in a
  // portal, so it is NOT inside rootRef - check both the trigger and the panel.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={styles.ccRoot} ref={rootRef}>
      <button
        type="button"
        className={`${menuBarStyles.menuItem} ${styles.ccTrigger}${open ? " " + styles.ccTriggerActive : ""}`}
        aria-label="Control Center"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <ControlCenterIcon />
      </button>

      {open &&
        createPortal(
          <div
            className={`${styles.ccPanel} ${styles.ccPanelLens}`}
            role="dialog"
            aria-label="Control Center"
            ref={panelRef}
          >
            <section className={`${styles.ccModule} cc-sound`}>
              <header className={styles.ccSoundHead}>
                <span className={styles.ccSoundTitle}>Sound</span>
                <span className={styles.ccChevron} aria-hidden>
                  ›
                </span>
              </header>
              <div className={styles.ccSliderRow}>
                <button
                  type="button"
                  className={styles.ccIconBtn}
                  aria-label={muted ? "Unmute" : "Mute"}
                  onClick={toggleMute}
                >
                  <SpeakerMuteIcon />
                </button>
                <input
                  id="control-center-menu"
                  type="range"
                  className={styles.ccSlider}
                  min={0}
                  max={100}
                  value={volume}
                  aria-label="Volume"
                  style={{ ["--vol" as string]: `${volume}%` }}
                  onChange={(e) => setVolume(Number(e.target.value))}
                />
                <button
                  type="button"
                  className={`${styles.ccIconBtn} cc-icon--wave`}
                  aria-label="Max volume"
                  onClick={() => setVolume(100)}
                >
                  <SpeakerWaveIcon />
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )}
    </div>
  );
}
