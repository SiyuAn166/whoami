import { useCallback, useEffect, useState } from "react";
import {
  getMasterVolume,
  setMasterVolume,
  subscribeMasterVolume,
} from "./master-volume";

const DEFAULT_VOLUME = 50;

/**
 * React binding for the system master volume (Control Center).
 * Delegates to the masterVolume module (the single source of truth that games
 * read), so moving the slider changes real game audio. Volume is 0-100 here;
 * the module stores 0-1. `muted` remembers the pre-mute level.
 */
export function useVolume() {
  const [volume, setVolumeState] = useState<number>(() =>
    Math.round(getMasterVolume() * 100),
  );
  const [lastNonZero, setLastNonZero] = useState<number>(
    () => Math.round(getMasterVolume() * 100) || DEFAULT_VOLUME,
  );

  // Stay in sync if volume changes elsewhere (e.g. another component).
  useEffect(
    () =>
      subscribeMasterVolume((v) => {
        const pct = Math.round(v * 100);
        setVolumeState(pct);
        if (pct > 0) setLastNonZero(pct);
      }),
    [],
  );

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(100, Math.max(0, Math.round(v)));
    setMasterVolume(clamped / 100);
  }, []);

  const toggleMute = useCallback(() => {
    const cur = Math.round(getMasterVolume() * 100);
    setMasterVolume((cur > 0 ? 0 : lastNonZero || DEFAULT_VOLUME) / 100);
  }, [lastNonZero]);

  return { volume, setVolume, toggleMute, muted: volume === 0 };
}
