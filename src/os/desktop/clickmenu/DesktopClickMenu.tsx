// src/os/desktop/clickmenu/DesktopClickMenu.tsx
// Becomes the `.mac-desktop` container itself (pass className/style through), so
// the contextmenu handler covers the WHOLE desktop — including empty wallpaper
// area — not just the widgets. It owns the right-click menu + the "Add Widgets"
// gallery (a real <Window>), and delegates add/remove to the widget domain.
import {
  useCallback,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { CATALOG, getWidget } from "../../widget/registry";
import type { WidgetRenderContext } from "../../widget/types";
import { ClickMenu, type ClickMenuItem } from "./ClickMenu";
import { AddWidgetsIcon, AppearanceIcon, RemoveIcon } from "./ClickMenuIcons";
import { WidgetGallery } from "./WidgetGallery";

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

/** Menu position, plus the widget id it was opened on (null = empty desktop). */
type MenuState = { x: number; y: number; widgetId: string | null };

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
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    // Always suppress the browser menu on the desktop…
    e.preventDefault();
    const target = e.target as HTMLElement;
    // …but leave app windows AND the menu bar to their own behaviour.
    if (target.closest(".mac-window, .menu-bar")) return;
    // Did the right-click land on a widget? If so, remember which one.
    const widgetEl = target.closest<HTMLElement>("[data-wid]");
    setMenu({
      x: e.clientX,
      y: e.clientY,
      widgetId: widgetEl?.dataset.wid ?? null,
    });
  }, []);

  // Build items — prepend "Remove …" when the menu was opened on a widget.
  const items: ClickMenuItem[] = [];
  if (menu?.widgetId) {
    const name = getWidget(menu.widgetId)?.title ?? menu.widgetId;
    const id = menu.widgetId;
    items.push(
      {
        label: `Remove \u201C${name}\u201D`,
        icon: <RemoveIcon />,
        onSelect: () => onRemoveWidget?.(id),
        disabled: !onRemoveWidget,
      },
      { label: "---" }, // separator (ClickMenu convention)
    );
  }
  items.push(
    {
      label: "Add Widgets\u2026",
      icon: <AddWidgetsIcon />,
      onSelect: () => setGalleryOpen(true),
    },
    { label: "---" }, // separator (ClickMenu convention)
    {
      label: "Toggle Appearance",
      icon: <AppearanceIcon />,
      onSelect: () => onToggleTheme?.(),
      disabled: !onToggleTheme,
    },
  );

  return (
    <div className={className} style={style} onContextMenu={onContextMenu}>
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
