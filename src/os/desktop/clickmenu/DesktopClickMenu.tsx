// src/os/desktop/clickmenu/DesktopClickMenu.tsx
// Becomes the `.mac-desktop` container itself (pass className/style through), so
// the contextmenu handler covers the WHOLE desktop — including empty wallpaper
// area — not just the widgets. It owns the right-click menu + the "Add Widgets"
// gallery (a real <Window>), and delegates adding to the widget domain.
import {
  useCallback,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { CATALOG } from "../../widget/registry";
import type { WidgetRenderContext } from "../../widget/types";
import { ClickMenu, type ClickMenuItem } from "./ClickMenu";
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
  /** toggle light/dark, for the menu item */
  onToggleTheme?: () => void;
  children: ReactNode;
}

type MenuPos = { x: number; y: number };

export function DesktopClickMenu({
  className,
  style,
  ctx,
  activeIds,
  onAddWidget,
  onToggleTheme,
  children,
}: Props) {
  const [menu, setMenu] = useState<MenuPos | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    // Always suppress the browser menu on the desktop…
    e.preventDefault();
    // …but leave app windows to their own behaviour.
    if ((e.target as HTMLElement).closest(".mac-window")) return;
    setMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const items: ClickMenuItem[] = [
    { label: "Add Widgets\u2026", onSelect: () => setGalleryOpen(true) },
    { label: "---" }, // separator (ClickMenu convention)
    {
      label: "Toggle Appearance",
      onSelect: () => onToggleTheme?.(),
      disabled: !onToggleTheme,
    },
  ];

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
