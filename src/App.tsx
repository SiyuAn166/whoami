import { useEffect, useState } from 'react';
import { StatusBar } from './components/Footer';
import { Shell } from './components/Shell';
import { usePortfolioData } from './hooks/usePortfolioData';
import { useTheme } from './hooks/useTheme';
import './index.css';

const SHELL_USER = 'siyu';
const SHELL_HOST = 'portfolio';

const MENUBAR_H = 28;
const TOP_GAP = 12;
const EDGE = 8;            // viewport margin the window can't cross
const MIN_W = 440;
const MIN_H = 300;
const DEFAULT_MAX_W = 1152; // 72rem

type WinState = 'normal' | 'maximized' | 'minimized' | 'closed';
interface Rect { x: number; y: number; w: number; h: number }

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
const vp = () => ({ vw: window.innerWidth, vh: window.innerHeight });
const COARSE = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

function defaultRect(): Rect {
  const { vw, vh } = vp();
  const w = Math.min(DEFAULT_MAX_W, vw - 2 * EDGE);
  const h = Math.max(MIN_H, vh - (MENUBAR_H + TOP_GAP) - EDGE);
  return { x: Math.round((vw - w) / 2), y: MENUBAR_H + TOP_GAP, w, h };
}

function maxedRect(): Rect {
  const { vw, vh } = vp();
  return { x: EDGE, y: MENUBAR_H + 4, w: vw - 2 * EDGE, h: vh - (MENUBAR_H + 4) - EDGE };
}

/** Keep a rect within the viewport and above the minimum size. */
function clampRect(r: Rect): Rect {
  const { vw, vh } = vp();
  const w = clamp(r.w, Math.min(MIN_W, vw - 2 * EDGE), vw - 2 * EDGE);
  const h = clamp(r.h, Math.min(MIN_H, vh - (MENUBAR_H + 4) - EDGE), vh - (MENUBAR_H + 4) - EDGE);
  return {
    w, h,
    x: clamp(r.x, EDGE, vw - EDGE - w),
    y: clamp(r.y, MENUBAR_H + 4, vh - EDGE - h),
  };
}

/** Resize handles: edges (inset from corners) + corners. */
const HANDLES: { dir: string; style: React.CSSProperties }[] = [
  { dir: 'n', style: { top: 0, left: 14, right: 14, height: 6, cursor: 'ns-resize' } },
  { dir: 's', style: { bottom: 0, left: 14, right: 14, height: 6, cursor: 'ns-resize' } },
  { dir: 'e', style: { top: 14, bottom: 14, right: 0, width: 6, cursor: 'ew-resize' } },
  { dir: 'w', style: { top: 14, bottom: 14, left: 0, width: 6, cursor: 'ew-resize' } },
  { dir: 'nw', style: { top: 0, left: 0, width: 14, height: 14, cursor: 'nwse-resize' } },
  { dir: 'ne', style: { top: 0, right: 0, width: 14, height: 14, cursor: 'nesw-resize' } },
  { dir: 'sw', style: { bottom: 0, left: 0, width: 14, height: 14, cursor: 'nesw-resize' } },
  { dir: 'se', style: { bottom: 0, right: 0, width: 14, height: 14, cursor: 'nwse-resize' } },
];

function MenuClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const day = now.toLocaleDateString('en-US', { weekday: 'short' });
      const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const clock = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      setTime(`${day} ${date}  ${clock}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{time}</span>;
}

function MenuBar({ theme, onToggle }: { theme: 'dark' | 'light'; onToggle: () => void }) {
  const isDark = theme === 'dark';
  return (
    <div className="menu-bar">
      <div className="flex items-center gap-0.5">
        <span className="menu-item" style={{ fontSize: '14px' }} aria-hidden>⌘</span>
        <span className="menu-item font-semibold">Terminal</span>
        <span className="menu-item hidden sm:inline">Shell</span>
        <span className="menu-item hidden sm:inline">Edit</span>
        <span className="menu-item hidden md:inline">View</span>
        <span className="menu-item hidden md:inline">Window</span>
        <span className="menu-item hidden md:inline">Help</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="appearance-toggle"
          onClick={onToggle}
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} appearance`}
          title={`Switch to ${isDark ? 'light' : 'dark'} appearance`}
        >
          <span aria-hidden>{isDark ? '☀' : '☾'}</span>
        </button>
        <MenuClock />
      </div>
    </div>
  );
}

/** Full-bleed Terminal.app-style icon used by the Dock. */
function TermGlyph() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 48 48" aria-hidden>
      <rect x="0.5" y="0.5" width="47" height="47" rx="11" fill="#1d1d1f" stroke="rgba(255,255,255,0.14)" />
      <circle cx="9" cy="9" r="2" fill="#ff5f57" />
      <circle cx="16" cy="9" r="2" fill="#febc2e" />
      <circle cx="23" cy="9" r="2" fill="#28c840" />
      <polyline points="11,21 18,28 11,35" fill="none" stroke="#28c840" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="22" y1="35" x2="34" y2="35" stroke="#e6e6e6" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function App() {
  const { theme, toggleTheme, setTheme } = useTheme();
  const { data } = usePortfolioData();

  const [win, setWin] = useState<WinState>('normal');
  const [rect, setRect] = useState<Rect>(defaultRect);
  const [interacting, setInteracting] = useState(false);

  const maximized = win === 'maximized';
  const visible = win === 'normal' || win === 'maximized';
  const geo = maximized ? maxedRect() : rect;
  const windowTitle = `${SHELL_USER}@${SHELL_HOST} — zsh — 92×30`;

  // Keep the window within the viewport when it is resized.
  useEffect(() => {
    const onResize = () => setRect(r => clampRect(r));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Drag the window by its title bar.
  const onTitlePointerDown = (e: React.PointerEvent) => {
    if (maximized || COARSE) return;
    if ((e.target as HTMLElement).closest('.traffic-lights')) return;
    const sx = e.clientX, sy = e.clientY, r0 = { ...rect };
    setInteracting(true);
    const move = (ev: PointerEvent) => {
      const { vw, vh } = vp();
      setRect(r => ({
        ...r,
        x: clamp(r0.x + ev.clientX - sx, EDGE, vw - EDGE - r0.w),
        y: clamp(r0.y + ev.clientY - sy, MENUBAR_H + 4, vh - EDGE - r0.h),
      }));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      document.body.style.userSelect = '';
      setInteracting(false);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    document.body.style.userSelect = 'none';
    e.preventDefault();
  };

  // Resize the window from an edge/corner handle.
  const startResize = (dir: string) => (e: React.PointerEvent) => {
    if (maximized || COARSE) return;
    e.stopPropagation();
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, r0 = { ...rect };
    const L = dir.includes('w'), R = dir.includes('e'), T = dir.includes('n'), B = dir.includes('s');
    setInteracting(true);
    const move = (ev: PointerEvent) => {
      const { vw, vh } = vp();
      const minW = Math.min(MIN_W, vw - 2 * EDGE), minH = Math.min(MIN_H, vh - (MENUBAR_H + 4) - EDGE);
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      let { x, y, w, h } = r0;
      if (R) w = clamp(r0.w + dx, minW, vw - EDGE - r0.x);
      if (B) h = clamp(r0.h + dy, minH, vh - EDGE - r0.y);
      if (L) { const right = r0.x + r0.w; x = clamp(r0.x + dx, EDGE, right - minW); w = right - x; }
      if (T) { const bottom = r0.y + r0.h; y = clamp(r0.y + dy, MENUBAR_H + 4, bottom - minH); h = bottom - y; }
      setRect({ x, y, w, h });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      document.body.style.userSelect = '';
      setInteracting(false);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    document.body.style.userSelect = 'none';
  };

  const toggleMax = () => setWin(w => (w === 'maximized' ? 'normal' : 'maximized'));

  return (
    <div
      className="mac-desktop"
      style={data?.meta.wallpaper ? { backgroundImage: `url(${data.meta.wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      {data?.meta.wallpaper && <div className="wallpaper-tint" aria-hidden />}

      <MenuBar theme={theme} onToggle={toggleTheme} />

      {/* The Terminal window — explicit geometry, draggable + resizable */}
      <div
        className={`mac-window${maximized ? ' is-maximized' : ''}${win === 'minimized' ? ' is-minimized' : ''}${win === 'closed' ? ' is-closed' : ''}`}
        inert={!visible}
        aria-hidden={!visible}
        style={{
          position: 'fixed',
          left: geo.x,
          top: geo.y,
          width: geo.w,
          height: geo.h,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          transition: interacting
            ? 'none'
            : 'left 0.2s ease, top 0.2s ease, width 0.2s ease, height 0.2s ease, transform 0.3s cubic-bezier(0.2,0.8,0.2,1), opacity 0.25s',
        }}
      >
        {/* Title bar (drag handle) */}
        <div
          className="titlebar"
          onPointerDown={onTitlePointerDown}
          onDoubleClick={toggleMax}
          style={{ cursor: maximized || COARSE ? 'default' : 'grab' }}
        >
          <div className="traffic-lights">
            <button className="traffic-light tl-close" onClick={() => setWin('closed')} aria-label="Close window" title="Close">✕</button>
            <button className="traffic-light tl-min" onClick={() => setWin('minimized')} aria-label="Minimize window" title="Minimize">‒</button>
            <button className="traffic-light tl-max" onClick={toggleMax} aria-label="Zoom window" title="Zoom">+</button>
          </div>
          <span className="titlebar-title">{windowTitle}</span>
        </div>

        {/* Window body */}
        <main
          className="window-body"
          style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 22px', background: 'var(--bg)' }}
        >
          {data && <Shell data={data} theme={theme} setTheme={setTheme} />}
        </main>

        {data && <StatusBar meta={data.meta} />}

        {/* Resize handles (desktop, normal state only) */}
        {win === 'normal' && !COARSE && HANDLES.map(hd => (
          <div
            key={hd.dir}
            data-dir={hd.dir}
            onPointerDown={startResize(hd.dir)}
            aria-hidden
            style={{ position: 'absolute', zIndex: 1, ...hd.style }}
          />
        ))}
      </div>

      {/* Dock — appears when the window is minimized or closed */}
      {data && !visible && (
        <div className="dock">
          <button
            className="dock-icon"
            onClick={() => setWin('normal')}
            aria-label="Reopen Terminal"
            title={`${SHELL_USER}@${SHELL_HOST} — zsh`}
          >
            <TermGlyph />
            <span className="dock-dot" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
