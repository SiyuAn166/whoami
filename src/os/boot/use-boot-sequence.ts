import { useEffect, useState } from "react";

/**
 * Drives the system boot screen lifecycle.
 *
 * The overlay stays up until the OS is actually ready — fonts loaded AND the
 * first real paint has happened AND a minimum display time has elapsed — then
 * it fades out. This is what prevents the desktop's elements from "popping in
 * one by one": everything mounts behind the black screen and is revealed at
 * once. A hard MAX cap guarantees we never hang if a signal never resolves.
 */
const MIN_MS = 1600; // keep the boot screen up at least this long
const MAX_MS = 4000; // absolute cap — reveal no later than this
const FADE_MS = 400; // must match the CSS `transition` on .boot

// Dev escape hatch: set VITE_SKIP_BOOT=true (e.g. in .env.local) to skip the
// boot screen entirely during `npm run dev`. Never skips in a production build.
const SKIP_BOOT =
  import.meta.env.DEV && import.meta.env.VITE_SKIP_BOOT === "true";

export function useBootSequence() {
  const [booting, setBooting] = useState(!SKIP_BOOT);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (SKIP_BOOT) return;
    let done = false;
    const start = performance.now();

    const finish = () => {
      if (done) return;
      done = true;
      const elapsed = performance.now() - start;
      const wait = Math.max(0, MIN_MS - elapsed);
      window.setTimeout(() => {
        setLeaving(true); // start CSS fade-out
        window.setTimeout(() => setBooting(false), FADE_MS); // then unmount
      }, wait);
    };

    // 1) fonts ready (avoids text reflow flash)
    const fontsReady: Promise<unknown> =
      (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts
        ?.ready ?? Promise.resolve();

    // 2) window fully loaded (images/assets), or already loaded
    const windowLoaded = new Promise<void>((resolve) => {
      if (document.readyState === "complete") resolve();
      else window.addEventListener("load", () => resolve(), { once: true });
    });

    Promise.all([fontsReady, windowLoaded]).then(() => {
      // wait one more frame so the desktop has painted before we reveal
      requestAnimationFrame(() => requestAnimationFrame(finish));
    });

    // hard safety cap
    const cap = window.setTimeout(finish, MAX_MS);
    return () => window.clearTimeout(cap);
  }, []);

  return { booting, leaving };
}
