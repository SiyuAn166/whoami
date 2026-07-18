// src/os/desktop/clickmenu/DesktopClickMenu.tsx
// Becomes the `.mac-desktop` container itself (pass className/style through), so
// the contextmenu handler covers the WHOLE desktop — including empty wallpaper
// area — not just the widgets. It owns the right-click menu + the "Add Widgets"
// panel (slide-up gallery) + the "Change Wallpaper" gallery, and delegates
// add/remove to the widget domain.
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useState,
} from "react";

import { WidgetGallery } from "../../widget/gallery";
import { CATALOG, getWidget } from "../../widget/registry";
import { WallpaperGallery } from "../wallpaper/WallpaperGallery";
import { ClickMenu, type ClickMenuItem } from "./ClickMenu";
import { AddWidgetsIcon, AppearanceIcon, RemoveIcon } from "./ClickMenuIcons";

import type { WidgetRenderContext } from "../../widget/types";

import widgetGalleryStyles from "../../widget/gallery/WidgetGallery.module.css";
import windowStyles from "../../window/Window.module.css";
import dockStyles from "../dock/Dock.module.css";
import menuBarStyles from "../menu-bar/MenuBar.module.css";
import wallpaperStyles from "../wallpaper/Wallpaper.module.css";

// Elements whose own click/context-menu behavior should not be pre-empted by
// the desktop's custom menu. Built from each owner's scoped CSS Modules class
// (not a global string) since every element below has been converted off
// :global — clicking any of these should fall through to its own handling.
const CHROME_SELECTOR = [
  windowStyles.macWindow,
  menuBarStyles.menuBar,
  dockStyles.dock,
]
  .map((c) => `.${c}`)
  .join(", ");
const IGNORED_SELECTOR = [
  windowStyles.macWindow,
  menuBarStyles.menuBar,
  dockStyles.dock,
  widgetGalleryStyles.widgetgalleryPanel,
  widgetGalleryStyles.widgetgalleryScrim,
  wallpaperStyles.wallpaperGalleryPanel,
  wallpaperStyles.wallpaperGalleryScrim,
]
  .map((c) => `.${c}`)
  .join(", ");

// Local icon (kept here so this feature needs no edit to ClickMenuIcons).
function WallpaperIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="4"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="8.5" cy="9" r="1.6" fill="currentColor" />
      <path
        d="M4 16l4.5-4 3 2.5L15 11l5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface Props {
  /** applied to the desktop root element (this component RENDERS it) */
  className?: string;
  style?: CSSProperties;
  /** current wallpaper id — used only to mark the active tile in the gallery
      (the wallpaper itself is painted by the <Wallpaper> child in Desktop.tsx) */
  wallpaper?: string;
  /** the render context WidgetLayer uses: { data, theme, setTheme, openApp } */
  ctx: WidgetRenderContext;
  /** ids currently on the desktop */
  activeIds: string[];
  /** add a widget to the desktop (from useActiveWidgets) */
  onAddWidget: (id: string) => void;
  /** remove a widget from the desktop (from useActiveWidgets) */
  onRemoveWidget?: (id: string) => void;
  /** toggle light/dark, for the menu item */
  onToggleTheme?: () => void;
  /** change the desktop wallpaper (persisted by the caller) */
  onChangeWallpaper?: (id: string) => void;
  children: ReactNode;
}

type MenuPos = { x: number; y: number; widgetId: string | null };

export function DesktopClickMenu({
  className,
  style,
  wallpaper,
  ctx,
  activeIds,
  onAddWidget,
  onRemoveWidget,
  onToggleTheme,
  onChangeWallpaper,
  children,
}: Props) {
  const [menu, setMenu] = useState<MenuPos | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [wallpaperOpen, setWallpaperOpen] = useState(false);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    // Always suppress the browser menu on the desktop…
    e.preventDefault();
    const target = e.target as HTMLElement;
    // …but leave app windows, the menu bar and the dock to their own behaviour.
    if (target.closest(IGNORED_SELECTOR)) return;
    // did we right-click a widget? (WidgetLayer renders data-wid on each)
    const widgetEl = target.closest<HTMLElement>("[data-wid]");
    setMenu({
      x: e.clientX,
      y: e.clientY,
      widgetId: widgetEl?.dataset.wid ?? null,
    });
  }, []);

  // left-click on the empty desktop closes the menu (the galleries close via
  // their own scrim / Done).
  const onClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(CHROME_SELECTOR)) return;
    setMenu(null);
  }, []);

  const wid = menu?.widgetId ?? null;

  const items: ClickMenuItem[] = [];
  if (wid) {
    const name = getWidget(wid)?.title ?? wid;
    items.push({
      label: `Remove \u201C${name}\u201D`,
      icon: <RemoveIcon />,
      onSelect: () => onRemoveWidget?.(wid),
      disabled: !onRemoveWidget,
    });
    items.push({ label: "---" });
  }
  items.push({
    label: "Add Widgets\u2026",
    icon: <AddWidgetsIcon />,
    onSelect: () => setGalleryOpen(true),
  });
  items.push({
    label: "Change Wallpaper\u2026",
    icon: <WallpaperIcon />,
    onSelect: () => setWallpaperOpen(true),
    disabled: !onChangeWallpaper,
  });
  items.push({ label: "---" });
  items.push({
    label: "Toggle Appearance",
    icon: <AppearanceIcon />,
    onSelect: () => onToggleTheme?.(),
    disabled: !onToggleTheme,
  });

  return (
    <div
      className={className}
      style={style}
      onContextMenu={onContextMenu}
      onClick={onClick}
    >
      {children}
      {menu && (
        <ClickMenu
          x={menu.x}
          y={menu.y}
          items={items}
          onClose={() => setMenu(null)}
        />
      )}
      {galleryOpen && (
        <WidgetGallery
          catalog={CATALOG}
          ctx={ctx}
          activeIds={activeIds}
          onAdd={onAddWidget}
          onClose={() => setGalleryOpen(false)}
        />
      )}
      {wallpaperOpen && onChangeWallpaper && (
        <WallpaperGallery
          current={wallpaper ?? "aurora-grid"}
          onSelect={onChangeWallpaper}
          onClose={() => setWallpaperOpen(false)}
        />
      )}
    </div>
  );
}
