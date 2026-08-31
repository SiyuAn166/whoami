// Games listen on `window` and drive their own render loop, so a background
// Arcade would otherwise swallow Space / arrows while another OS window is
// typed into, and keep burning frames while minimized to the dock.

const shell = (el: Element | null | undefined) =>
  el?.closest("[data-window-id]");

/** True when `el`'s OS window is on screen (not minimized/closed). */
export function windowVisible(el: Element | null | undefined): boolean {
  const win = shell(el);
  return !win || !win.hasAttribute("inert"); // no shell ⇒ nothing to gate on
}

/** True when `el`'s OS window is on screen AND focused. Gate key handlers here. */
export function windowActive(el: Element | null | undefined): boolean {
  const win = shell(el);
  if (!win) return true;
  return (
    !win.hasAttribute("inert") &&
    win.getAttribute("data-window-focused") === "true"
  );
}

/** Fires whenever the OS window is shown or hidden. Returns an unsubscribe. */
export function observeWindowVisible(
  el: Element | null | undefined,
  onChange: (visible: boolean) => void,
): () => void {
  const win = shell(el);
  if (!win) return () => {};
  const mo = new MutationObserver(() => onChange(!win.hasAttribute("inert")));
  mo.observe(win, { attributes: true, attributeFilter: ["inert"] });
  return () => mo.disconnect();
}
