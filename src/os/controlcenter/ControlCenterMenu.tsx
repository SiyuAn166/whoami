import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ControlCenterIcon } from "../desktop/menubar/MenuBarIcons";
import { SpeakerMuteIcon, SpeakerWaveIcon } from "./ControlCenterIcons";
import { useVolume } from "./useVolume";
// Side-effect: installs the site-wide WebAudio volume hook once (guarantees
// it runs even though MenuBar imports this module directly, not the barrel).
import "./installVolumeHook";
import "./ControlCenter.css";

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
    <div className="cc-root" ref={rootRef}>
      <button
        type="button"
        className={`menu-item cc-trigger${open ? " cc-trigger--active" : ""}`}
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
            className="cc-panel"
            role="dialog"
            aria-label="Control Center"
            ref={panelRef}
          >
            <section className="cc-module cc-sound">
              <header className="cc-sound-head">
                <span className="cc-sound-title">Sound</span>
                <span className="cc-chevron" aria-hidden>
                  ›
                </span>
              </header>
              <div className="cc-slider-row">
                <button
                  type="button"
                  className="cc-icon-btn"
                  aria-label={muted ? "Unmute" : "Mute"}
                  onClick={toggleMute}
                >
                  <SpeakerMuteIcon />
                </button>
                <input
                  type="range"
                  className="cc-slider"
                  min={0}
                  max={100}
                  value={volume}
                  aria-label="Volume"
                  style={{ ["--vol" as string]: `${volume}%` }}
                  onChange={(e) => setVolume(Number(e.target.value))}
                />
                <span className="cc-icon cc-icon--wave" aria-hidden>
                  <SpeakerWaveIcon />
                </span>
              </div>
            </section>
          </div>,
          document.body,
        )}
    </div>
  );
}
