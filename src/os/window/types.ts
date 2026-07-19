import type { CSSProperties } from "react";

export type WindowState =
  "normal" | "maximized" | "fullscreen" | "minimized" | "closed";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Size {
  w: number;
  h: number;
}

/**
 * Chrome-only, app-agnostic description of one open window. `Window` never
 * looks past these fields — content is always opaque `children` supplied by
 * whatever app spawned the instance.
 */
export interface WindowInstance {
  id: string;
  appId: string;
  title: string;
  rect: Rect;
  state: WindowState;
  zIndex: number;
  minSize?: Size;
  resizable?: boolean;
  /** The state to return to when un-minimized (normal / maximized / fullscreen).
   * Recorded at minimize time so restoring from the dock tray honors it. */
  restoreState?: WindowState;
  /** PNG data-URL snapshot of the window, captured the moment it is
   * minimized, shown as the dock tray thumbnail (like macOS). */
  snapshot?: string;
}

export const MENUBAR_H = 28;
export const TOP_GAP = 12;
export const EDGE = 0; // viewport margin a window can't cross
export const DOCK_H = 86; // fallback dock height used before the dock mounts / can be measured
export const MIN_W = 440;
export const MIN_H = 300;
export const DEFAULT_MAX_W = 1152; // 72rem

export const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), Math.max(lo, hi));

export const vp = () => ({ vw: window.innerWidth, vh: window.innerHeight });

/** Live-measured vertical space the dock reserves at the bottom of the screen:
 * the dock element's own height plus whatever gap sits below it. Used instead of
 * the fixed DOCK_H so maximized windows rest exactly on top of the dock no matter
 * its icon size / padding. Falls back to DOCK_H if the dock isn't in the DOM yet.
 * Mark the dock's root element with `data-dock` for this to work.
 */
export function dockHeight(): number {
  if (typeof document === "undefined") return DOCK_H;

  // 1) Explicit hook on the dock root: <div className={styles.dock} data-dock>.
  //    Measured live, so it tracks icon size / padding / bottom gap automatically.
  const el = document.querySelector<HTMLElement>("[data-dock]");
  if (el) {
    const r = el.getBoundingClientRect();
    // Reserve everything from the dock's top edge down to the viewport bottom
    // (dock height + whatever margin sits below it).
    const reserve = Math.round(window.innerHeight - r.top);
    // Guard: a dock slid off-screen (fullscreen) or an odd layout would give a
    // nonsensical value — only trust a sane, positive reserve.
    if (r.height > 0 && reserve > 0 && reserve < window.innerHeight / 2) {
      return reserve;
    }
  }

  // 2) Optional CSS escape hatch: :root { --dock-h: 86px }.
  const cssVar = getComputedStyle(document.documentElement).getPropertyValue(
    "--dock-h",
  );
  const parsed = parseInt(cssVar, 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;

  // 3) Nothing found (dock not mounted yet / hidden) → static fallback.
  return DOCK_H;
}

export const COARSE =
  typeof window !== "undefined" &&
  !!window.matchMedia &&
  window.matchMedia("(pointer: coarse)").matches;

/** Default centered geometry for a freshly-opened window, offset slightly per open count so stacked windows are visible.
 */
export function defaultRect(size?: Size, minSize?: Size, offset = 0): Rect {
  const { vw, vh } = vp();
  const w = Math.min(size?.w ?? DEFAULT_MAX_W, vw - 2 * EDGE);
  const h = Math.min(
    size?.h ?? MIN_H,
    vh - (MENUBAR_H + TOP_GAP) - dockHeight(),
  );
  const baseX = Math.round((vw - w) / 2);
  const baseY = MENUBAR_H + TOP_GAP;
  const shift = offset * 28;
  return clampRect({ x: baseX + shift, y: baseY + shift, w, h }, minSize);
}

/** "Full size" window: fills the space between the menu bar and the dock.
 * Menu bar and dock stay visible. Triggered by clicking a dock icon.
 */
export function maxedRect(): Rect {
  const { vw, vh } = vp();
  return {
    x: EDGE,
    y: MENUBAR_H,
    w: vw,
    h: vh - MENUBAR_H - dockHeight(),
  };
}

/** True fullscreen: the window covers the entire viewport, edge to edge.
 * The menu bar and dock are hidden (menu bar reveals on top-edge hover).
 * Triggered by the green traffic light / double-clicking the titlebar.
 */
export function fullscreenRect(): Rect {
  const { vw, vh } = vp();
  return { x: 0, y: 0, w: vw, h: vh };
}

/** Keep a rect within the viewport (above menubar, below dock) and above the minimum size.
 */
export function clampRect(r: Rect, minSize?: Size): Rect {
  const { vw, vh } = vp();
  const minW = minSize?.w ?? MIN_W;
  const minH = minSize?.h ?? MIN_H;
  const w = clamp(r.w, Math.min(minW, vw), vw);
  const dockH = dockHeight();
  const h = clamp(
    r.h,
    Math.min(minH, vh - MENUBAR_H - dockH),
    vh - MENUBAR_H - dockH,
  );
  return {
    w,
    h,
    x: clamp(r.x, EDGE, vw - EDGE - w),
    y: clamp(r.y, MENUBAR_H, vh - dockH - h),
  };
}

/** Resize handles: edges (inset from corners) + corners.
 */
export const HANDLES: { dir: string; style: CSSProperties }[] = [
  {
    dir: "n",
    style: { top: 0, left: 14, right: 14, height: 6, cursor: "ns-resize" },
  },
  {
    dir: "s",
    style: { bottom: 0, left: 14, right: 14, height: 6, cursor: "ns-resize" },
  },
  {
    dir: "e",
    style: { top: 14, bottom: 14, right: 0, width: 6, cursor: "ew-resize" },
  },
  {
    dir: "w",
    style: { top: 14, bottom: 14, left: 0, width: 6, cursor: "ew-resize" },
  },
  {
    dir: "nw",
    style: { top: 0, left: 0, width: 14, height: 14, cursor: "nwse-resize" },
  },
  {
    dir: "ne",
    style: { top: 0, right: 0, width: 14, height: 14, cursor: "nesw-resize" },
  },
  {
    dir: "sw",
    style: { bottom: 0, left: 0, width: 14, height: 14, cursor: "nesw-resize" },
  },
  {
    dir: "se",
    style: {
      bottom: 0,
      right: 0,
      width: 14,
      height: 14,
      cursor: "nwse-resize",
    },
  },
];
