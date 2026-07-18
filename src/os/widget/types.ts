import type { AppRenderContext } from "../../apps/types";
import type { ReactNode } from "react";

/** Widget size tiers — mirror macOS small / medium / large tiles. */
export type WidgetSize = "small" | "medium" | "wide" | "large";

/** Frame skin.
 *  `glass` = liquid glass (default), `note` = sticky note,
 *  `terminal` = near-black + phosphor-green monospace.
 */
export type WidgetVariant = "glass" | "note" | "terminal";

/**
 * Context every widget receives. Extends the app render context (data / theme)
 * and adds `openApp` so a widget can act as a launcher into an app window.
 */
export interface WidgetRenderContext extends AppRenderContext {
  openApp: (appId: string) => void;
}

/**
 * A widget declaration. Add a new widget by writing its content component and
 * one entry in `WIDGETS` — WidgetLayer / WidgetFrame / Desktop need no changes.
 * This is the widget analogue of `AppDefinition`.
 */
export interface WidgetDefinition {
  id: string;
  size: WidgetSize;
  /** Frame skin; defaults to 'glass'. */
  variant?: WidgetVariant;
  /** Optional heading shown in the frame header. */
  title?: string;
  /** Lower numbers render first (top of the column). */
  order?: number;
  /** Optional precise initial desktop position in px (relative to the desktop
   *  top-left). Falls back to the auto left-column stack when omitted.
   *  Priority: saved localStorage position > defaultPos > auto column.
   */
  defaultPos?: { x: number; y: number };
  /** Anchor the initial position to an edge / center instead of x from defaultPos.
   *  The real size is measured after render, so no hard-coded widget dimensions.
   *  - "right"  → pinned to the right edge (x measured)
   *  - "center" → centered horizontally & vertically (x + y measured)
   */
  defaultAnchor?: "left" | "right" | "center";
  /** Hide the widget dynamically (e.g. when the backing data is missing). */
  enabled?: (ctx: WidgetRenderContext) => boolean;
  /** Optional click handler — makes the whole card an activatable button. */
  onActivate?: (ctx: WidgetRenderContext) => void;
  /** Optional external link — opened in a new tab when the card is clicked.
   *  Takes precedence over onActivate. Return undefined to disable.
   */
  href?: (ctx: WidgetRenderContext) => string | undefined;
  /** Content only — the liquid-glass shell is provided by WidgetFrame. */
  render: (ctx: WidgetRenderContext) => ReactNode;
}
