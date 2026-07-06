import type { ReactNode } from "react";
import type { Size } from "../os/window/types";
import type { PortfolioData } from "../types/portfolio";

export type Theme = "dark" | "light";

export interface AppRenderContext {
  data: PortfolioData;
  theme: Theme;
  setTheme: (t: Theme) => void;
}

/**
 * Everything the desktop shell needs to know about an app, without knowing
 * anything about what the app actually does. Add a new app by writing its
 * content component and one entry here — Dock, DesktopIcons, and
 * WindowManager need no changes.
 */
export interface AppDefinition {
  id: string;
  name: string;
  icon: ReactNode;
  /** Whether this app also gets a Desktop shortcut icon (in addition to the Dock). */
  showOnDesktop?: boolean;
  defaultSize?: Size;
  minSize?: Size;
  /** Default true — window chrome shows resize handles. */
  resizable?: boolean;
  /** Default true — reopening focuses the existing instance instead of spawning a new one. */
  singleton?: boolean;
  /** Static titlebar text; falls back to `name` if omitted. */
  title?: string;
  render: (ctx: AppRenderContext, onClose?: () => void) => ReactNode;
  /** Optional chrome rendered in the titlebar row, next to the traffic lights
   * (e.g. a Finder-style navigation toolbar). When present it replaces the
   * centered titlebar title. */
  renderToolbar?: (ctx: AppRenderContext) => ReactNode;
  /** Optional chrome rendered below the content area, inside the window (e.g. a status bar). */
  renderFooter?: (ctx: AppRenderContext) => ReactNode;
}
