// src/os/desktop/clickmenu/DesktopClickMenu.tsx
// Becomes the `.mac-desktop` container itself (pass className/style through), so
// the contextmenu handler covers the WHOLE desktop — including empty wallpaper
// area — not just the widgets. It owns the right-click menu + the "Add Widgets"
// panel (slide-up gallery), and delegates add/remove to the widget domain.
import {
  useCallback,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { WidgetGallery } from "../../widget/gallery/WidgetGallery";
import { CATALOG, getWidget } from "../../widget/registry";
import type { WidgetRenderContext } from "../../widget/types";
import { ClickMenu, type ClickMenuItem } from "./ClickMenu";
import { AddWidgetsIcon, AppearanceIcon, RemoveIcon } from "./ClickMenuIcons";

interface Props {
  /** applied to the desktop root element (this component RENDERS it) */
  className?: string;
  style?: CSSProperties;
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
  children: ReactNode;
}

type MenuPos = { x: number; y: number; widgetId: string | null };

export function DesktopClickMenu({
  className,
  style,
  ctx,
  activeIds,
  onAddWidget,
  onRemoveWidget,
  onToggleTheme,
  children,
}: Props) {
  const [menu, setMenu] = useState<MenuPos | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    // Always suppress the browser menu on the desktop…
    e.preventDefault();
    const target = e.target as HTMLElement;
    // …but leave app windows, the menu bar and the dock to their own behaviour.
    if (
      target.closest(
        ".mac-window, .menu-bar, .dock, .widgetgallery__panel, .widgetgallery__scrim",
      )
    )
      return;
    // did we right-click a widget? (WidgetLayer renders data-wid on each)
    const widgetEl = target.closest<HTMLElement>("[data-wid]");
    setMenu({
      x: e.clientX,
      y: e.clientY,
      widgetId: widgetEl?.dataset.wid ?? null,
    });
  }, []);

  // left-click on the empty desktop closes the menu (the gallery closes via its
  // own scrim / Done).
  const onClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".mac-window, .menu-bar, .dock"))
      return;
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
    </div>
  );
}
