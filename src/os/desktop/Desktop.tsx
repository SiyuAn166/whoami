import { useState } from "react";
import { getApp } from "../../apps/registry";
import { usePortfolioData } from "../../hooks/usePortfolioData";
import { useTheme } from "../../hooks/useTheme";
import { DEFAULT_ACTIVE_WIDGET_IDS } from "../widget/registry";
import { useActiveWidgets } from "../widget/useActiveWidgets";
import { WidgetLayer } from "../widget/WidgetLayer";
import { useWindowManager } from "../window/WindowManager";
import { DesktopClickMenu } from "./clickmenu/DesktopClickMenu";
import { Dock } from "./dock/Dock";
import { MenuBar } from "./menubar/MenuBar";
import "./Desktop.css";

/** The main view of the site: menu bar, desktop icons, windows, and dock.
 */
export function Desktop() {
  const { theme, toggleTheme, setTheme } = useTheme();
  const { data, loading, error } = usePortfolioData();
  // The window manager is only meaningful once data has loaded; until then we
  // render a boot/error screen and never construct app windows with null data.
  if (!data) {
    return (
      <div className="mac-desktop">
        <MenuBar appName="Finder" />
        <div className="boot-screen" role="status" aria-live="polite">
          {error ? (
            <div className="boot-error">
              <div className="boot-error-title">Failed to load data</div>
              <div className="boot-error-msg">{error}</div>
              <button
                className="boot-retry"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="boot-loading">
              <span className="boot-spinner" aria-hidden />
              <span>{loading ? "Booting…" : "Starting up…"}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <DesktopReady
      data={data}
      theme={theme}
      toggleTheme={toggleTheme}
      setTheme={setTheme}
    />
  );
}

interface DesktopReadyProps {
  data: NonNullable<ReturnType<typeof usePortfolioData>["data"]>;
  theme: "dark" | "light";
  toggleTheme: () => void;
  setTheme: (t: "dark" | "light") => void;
}

/** Rendered only once `data` is guaranteed non-null, so the window manager gets a real context.
 */
function DesktopReady({
  data,
  theme,
  toggleTheme,
  setTheme,
}: DesktopReadyProps) {
  const wm = useWindowManager({ data, theme, setTheme });
  const { activeIds, addWidget, removeWidget } = useActiveWidgets(
    DEFAULT_ACTIVE_WIDGET_IDS,
  );
  // Which widget (if any) is currently being placed on the desktop.
  const [placingId, setPlacingId] = useState<string | null>(null);
  // When a window is fullscreen, the menu bar auto-hides and slides back down
  // only while the cursor is at the very top edge (macOS behavior).
  const [menuRevealed, setMenuRevealed] = useState(false);
  const widgetCtx = { data, theme, setTheme, openApp: wm.openApp };
  const focusedApp = wm.instances.find((w) => w.id === wm.focusedId);
  const menuBarAppName =
    (focusedApp && getApp(focusedApp.appId)?.name) ?? "Finder";
  const hasFullscreen = wm.instances.some((w) => w.state === "fullscreen");

  return (
    <DesktopClickMenu
      className="mac-desktop"
      style={
        data.meta.wallpaper
          ? {
              backgroundImage: `url(${data.meta.wallpaper})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
      ctx={widgetCtx}
      activeIds={activeIds}
      onAddWidget={(id) => setPlacingId(id)}
      onRemoveWidget={removeWidget}
      onToggleTheme={toggleTheme}
    >
      {data.meta.wallpaper && <div className="wallpaper-tint" aria-hidden />}
      {/* Thin hotspot at the top edge that reveals the menu bar in fullscreen. */}
      {hasFullscreen && (
        <div
          className="menu-reveal-zone"
          onPointerEnter={() => setMenuRevealed(true)}
          aria-hidden
        />
      )}
      <MenuBar
        appName={menuBarAppName}
        hidden={hasFullscreen && !menuRevealed}
        onPointerEnter={() => setMenuRevealed(true)}
        onPointerLeave={() => setMenuRevealed(false)}
      />
      {/* {<DesktopIcons openApp={wm.openApp} />} */}
      <WidgetLayer
        data={data}
        theme={theme}
        setTheme={setTheme}
        openApp={wm.openApp}
        activeIds={activeIds}
        placingId={placingId}
        onPlaced={(id) => {
          addWidget(id);
          setPlacingId(null);
        }}
        onCancelPlacing={() => setPlacingId(null)}
      />
      {wm.render({
        chromeRevealed: menuRevealed,
        onRevealChange: setMenuRevealed,
      })}
      <Dock hidden={hasFullscreen} isOpen={wm.isOpen} openApp={wm.openApp} />
    </DesktopClickMenu>
  );
}
