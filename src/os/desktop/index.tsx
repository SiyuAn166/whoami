import { useState } from "react";

import { getApp } from "../../apps/registry";
import { usePortfolioData } from "../../hooks/use-portfolio-data";
import { useTheme } from "../../hooks/use-theme";
import { DEFAULT_ACTIVE_WIDGET_IDS } from "../widget/registry";
import { useActiveWidgets } from "../widget/use-active-widgets";
import { WidgetLayer } from "../widget/WidgetLayer";
import { useWindowManager } from "../window/WindowManager";
import { DesktopClickMenu } from "./click-menu/DesktopClickMenu";
import { Dock } from "./dock";
import { MenuBar } from "./menu-bar";
import { Wallpaper } from "./wallpaper";

import styles from "./Desktop.module.css";
import menuBarStyles from "./menu-bar/MenuBar.module.css";
import wallpaperStyles from "./wallpaper/Wallpaper.module.css";

/** The main view of the site: menu bar, desktop icons, windows, and dock. */
export function Desktop() {
  const { theme, toggleTheme, setTheme } = useTheme();
  const { data, loading, error } = usePortfolioData();

  // The window manager is only meaningful once data has loaded; until then we
  // render a boot/error screen and never construct app windows with null data.
  if (!data) {
    return (
      <div className={styles.macDesktop}>
        <Wallpaper id="aurora-grid" greeting={false} />
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

const WALLPAPER_KEY = "wallpaper";
const DEFAULT_WALLPAPER = "aurora-grid";

/** Rendered only once `data` is guaranteed non-null, so the window manager gets a real context. */
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

  // Pure-CSS wallpaper (right-click → Change Wallpaper…), persisted locally.
  const [wallpaper, setWallpaper] = useState<string>(() => {
    try {
      return localStorage.getItem(WALLPAPER_KEY) ?? DEFAULT_WALLPAPER;
    } catch {
      return DEFAULT_WALLPAPER;
    }
  });
  const changeWallpaper = (id: string) => {
    setWallpaper(id);
    try {
      localStorage.setItem(WALLPAPER_KEY, id);
    } catch {
      /* ignore storage failures */
    }
  };

  // ---- Fullscreen chrome hide/reveal ------------------------------------
  // When any window is fullscreen, the menu bar + dock slide off-screen; the
  // menu bar (and the fullscreen window's auto-hidden titlebar) slide back in
  // while the top-edge hotspot / bar is hovered. This orchestration lives here
  // because only the desktop shell knows about BOTH the windows and the chrome.
  const anyFullscreen = wm.instances.some((w) => w.state === "fullscreen");
  const [chromeRevealed, setChromeRevealed] = useState(false);
  // Clear a stale reveal the instant we leave fullscreen. Done during render
  // (React's supported "adjust state when a prop changes" pattern) rather than
  // in an effect, which would trip react-hooks/set-state-in-effect and cause a
  // cascading render. The guarded condition settles in one extra render.
  if (!anyFullscreen && chromeRevealed) setChromeRevealed(false);
  const chromeHidden = anyFullscreen && !chromeRevealed;

  const widgetCtx = { data, theme, setTheme, openApp: wm.openApp };
  const focusedApp = wm.instances.find((w) => w.id === wm.focusedId);
  const menuBarAppName =
    (focusedApp && getApp(focusedApp.appId)?.name) ?? "Finder";

  return (
    <DesktopClickMenu
      className={styles.macDesktop}
      wallpaper={data.meta.wallpaper ? undefined : wallpaper}
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
      onChangeWallpaper={changeWallpaper}
    >
      {/* The wallpaper IS a component now: the greeting is baked into it (see
          Wallpaper.tsx / wallpapers.css) so it renders as one unified picture
          here and in the Change-Wallpaper gallery. A user PHOTO wallpaper
          instead paints on the root + a tint overlay. */}
      {data.meta.wallpaper ? (
        <div className={wallpaperStyles.wallpaperTint} aria-hidden />
      ) : (
        <Wallpaper id={wallpaper} />
      )}
      <MenuBar
        appName={menuBarAppName}
        hidden={chromeHidden}
        onPointerEnter={() => anyFullscreen && setChromeRevealed(true)}
        onPointerLeave={() => anyFullscreen && setChromeRevealed(false)}
      />
      {/* Top-edge hotspot that reveals the hidden bar while in fullscreen. */}
      {anyFullscreen && (
        <div
          className={menuBarStyles.menuRevealZone}
          onPointerEnter={() => setChromeRevealed(true)}
          aria-hidden
        />
      )}
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
        chromeRevealed,
        onRevealChange: setChromeRevealed,
      })}
      <Dock isOpen={wm.isOpen} openApp={wm.openApp} hidden={anyFullscreen} />
    </DesktopClickMenu>
  );
}
