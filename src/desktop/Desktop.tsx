import { getApp } from '../apps/registry';
import { usePortfolioData } from '../hooks/usePortfolioData';
import { useTheme } from '../hooks/useTheme';
import { useWindowManager } from '../windows/WindowManager';
import { Dock } from './Dock';
import { MenuBar } from './MenuBar';

/** The main view of the site: menu bar, desktop icons, windows, and dock. */
export function Desktop() {
    const { theme, toggleTheme, setTheme } = useTheme();
    const { data } = usePortfolioData();

    const wm = useWindowManager(data ? { data, theme, setTheme } : { data: data!, theme, setTheme });

    const focusedApp = wm.instances.find(w => w.id === wm.focusedId);
    const menuBarAppName = (focusedApp && getApp(focusedApp.appId)?.name) ?? 'Finder';

    return (
        <div
            className="mac-desktop"
            style={data?.meta.wallpaper ? { backgroundImage: `url(${data.meta.wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        >
            {data?.meta.wallpaper && <div className="wallpaper-tint" aria-hidden />}

            <MenuBar appName={menuBarAppName} theme={theme} onToggleTheme={toggleTheme} />

            {/* {data && <DesktopIcons openApp={wm.openApp} />} */}

            {data && wm.render()}

            {data && <Dock isOpen={wm.isOpen} openApp={wm.openApp} />}
        </div>
    );
}
