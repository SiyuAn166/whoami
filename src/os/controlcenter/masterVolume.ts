// ─── System master volume ───────────────────────────────────────────
// Single source of truth for the site-wide audio level (Control Center).
// Games read getMasterVolume() when producing sound and subscribe to live
// changes. Persisted to localStorage as 0-100 (key "cc:volume", default 50)
// so it survives reloads and matches the Control Center slider units.

const KEY = "cc:volume";
const DEFAULT_PCT = 50;

type Listener = (v: number) => void;
const listeners = new Set<Listener>();

function readPct(): number {
  if (typeof window === "undefined") return DEFAULT_PCT;
  const raw = window.localStorage.getItem(KEY);
  const n = raw == null ? NaN : Number(raw);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : DEFAULT_PCT;
}

// Module-level state (0-1). Initialized from storage.
let current = readPct() / 100;

/** Current master volume, 0-1. */
export function getMasterVolume(): number {
  return current;
}

/** Set master volume (accepts 0-1). Persists + notifies all subscribers. */
export function setMasterVolume(v01: number): void {
  current = Math.min(1, Math.max(0, v01));
  try {
    window.localStorage.setItem(KEY, String(Math.round(current * 100)));
    document.documentElement.style.setProperty(
      "--system-volume",
      String(current),
    );
  } catch {
    /* storage unavailable — keep in-memory value */
  }
  listeners.forEach((l) => l(current));
}

/** Subscribe to master-volume changes. Returns an unsubscribe fn. */
export function subscribeMasterVolume(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
