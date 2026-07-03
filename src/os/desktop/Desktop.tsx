import { getApp } from "../../apps/registry";
import { usePortfolioData } from "../../hooks/usePortfolioData";
import { useTheme } from "../../hooks/useTheme";
import { WidgetLayer } from "../widget/WidgetLayer";
import { useWindowManager } from "../window/WindowManager";
import "./Desktop.css";
import "./DesktopIcons.css";
import { Dock } from "./dock/Dock";
import { MenuBar } from "./menubar/MenuBar";
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
        <MenuBar appName="Finder" theme={theme} onToggleTheme={toggleTheme} />
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
  const focusedApp = wm.instances.find((w) => w.id === wm.focusedId);
  const menuBarAppName =
    (focusedApp && getApp(focusedApp.appId)?.name) ?? "Finder";
  return (
    <div
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
    >
      {data.meta.wallpaper && <div className="wallpaper-tint" aria-hidden />}
      <MenuBar
        appName={menuBarAppName}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      {/* {<DesktopIcons openApp={wm.openApp} />} */}
      <WidgetLayer
        data={data}
        theme={theme}
        setTheme={setTheme}
        openApp={wm.openApp}
      />
      {wm.render()}
      <Dock isOpen={wm.isOpen} openApp={wm.openApp} />
    </div>
  );
}
