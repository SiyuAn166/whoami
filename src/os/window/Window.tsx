import { useEffect, useState, type ReactNode } from "react";
import {
  clamp,
  clampRect,
  COARSE,
  DOCK_H,
  fullscreenRect,
  HANDLES,
  maxedRect,
  MENUBAR_H,
  MIN_H,
  MIN_W,
  vp,
  type Rect,
  type WindowInstance,
} from "./types";
import "./Window.css";
import { CloseIcon, MinimizeIcon, ZoomIcon } from "./WindowIcons";

interface WindowProps {
  instance: WindowInstance;
  focused: boolean;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMax: () => void;
  /** Titlebar double-click: maximize (fill between menu bar and dock),
   * without hiding the desktop chrome. */
  onToggleMaximize: () => void;
  onRectChange: (rect: Rect) => void;
  /** True when the desktop chrome (menu bar) is revealed; in fullscreen
   * this slides the auto-hidden titlebar back down. */
  chromeRevealed?: boolean;
  /** Called on fullscreen titlebar hover so the shared reveal stays open
   * while the cursor is on the titlebar. */
  onRevealChange?: (revealed: boolean) => void;
  /** Rendered in the titlebar, next to the traffic lights (e.g. a Finder-style
   * navigation toolbar). Optional — when present it replaces the centered title.
   */
  toolbar?: ReactNode;
  /** Rendered below the content area, inside the window (e.g. a status bar). Optional.
   */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Generic macOS-style window chrome: titlebar, traffic lights, drag, resize,
 * minimize/maximize/close. Knows nothing about what it contains — `children`
 * is opaque app content. Any new app plugs into this unchanged. An app may
 * optionally inject a `toolbar` into the titlebar row and a `footer` below.
 */
export function Window({
  instance,
  focused,
  onFocus,
  onClose,
  onMinimize,
  onToggleMax,
  onToggleMaximize,
  onRectChange,
  chromeRevealed,
  onRevealChange,
  toolbar,
  footer,
  children,
}: WindowProps) {
  const [interacting, setInteracting] = useState(false);
  const { state, rect, minSize, resizable = true } = instance;
  const maximized = state === "maximized";
  const fullscreen = state === "fullscreen";
  // Both maximized and fullscreen pin the window — no drag/resize.
  const locked = maximized || fullscreen;
  const visible =
    state === "normal" || state === "maximized" || state === "fullscreen";
  const geo = fullscreen ? fullscreenRect() : maximized ? maxedRect() : rect;

  // Keep the window within the viewport when the browser is resized.
  useEffect(() => {
    const onResize = () => onRectChange(clampRect(rect, minSize));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rect.w, rect.h]);

  // Drag the window by its title bar.
  const onTitlePointerDown = (e: React.PointerEvent) => {
    if (locked || COARSE) return;
    // Never start a drag from an interactive control in the titlebar
    // (traffic lights, toolbar buttons, etc).
    if (
      (e.target as HTMLElement).closest(
        ".traffic-lights, button, a, input, select, textarea",
      )
    )
      return;
    onFocus();
    const sx = e.clientX,
      sy = e.clientY,
      r0 = { ...rect };
    setInteracting(true);
    const move = (ev: PointerEvent) => {
      const { vw, vh } = vp();
      onRectChange({
        ...r0,
        x: clamp(r0.x + ev.clientX - sx, 0, vw - r0.w),
        y: clamp(r0.y + ev.clientY - sy, MENUBAR_H, vh - DOCK_H - r0.h),
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      document.body.style.userSelect = "";
      setInteracting(false);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    document.body.style.userSelect = "none";
    e.preventDefault();
  };

  // Resize the window from an edge/corner handle.
  const startResize = (dir: string) => (e: React.PointerEvent) => {
    if (locked || COARSE) return;
    e.stopPropagation();
    e.preventDefault();
    onFocus();
    const sx = e.clientX,
      sy = e.clientY,
      r0 = { ...rect };
    const L = dir.includes("w"),
      R = dir.includes("e"),
      T = dir.includes("n"),
      B = dir.includes("s");
    setInteracting(true);
    const move = (ev: PointerEvent) => {
      const { vw, vh } = vp();
      const minW = Math.min(minSize?.w ?? MIN_W, vw - 16),
        minH = Math.min(minSize?.h ?? MIN_H, vh - MENUBAR_H - DOCK_H);
      const dx = ev.clientX - sx,
        dy = ev.clientY - sy;
      let { x, y, w, h } = r0;
      if (R) w = clamp(r0.w + dx, minW, vw - r0.x);
      if (B) h = clamp(r0.h + dy, minH, vh - DOCK_H - r0.y);
      if (L) {
        const right = r0.x + r0.w;
        x = clamp(r0.x + dx, 0, right - minW);
        w = right - x;
      }
      if (T) {
        const bottom = r0.y + r0.h;
        y = clamp(r0.y + dy, MENUBAR_H, bottom - minH);
        h = bottom - y;
      }
      onRectChange({ x, y, w, h });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      document.body.style.userSelect = "";
      setInteracting(false);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    document.body.style.userSelect = "none";
  };

  return (
    <div
      className={`mac-window${maximized ? " is-maximized" : ""}${
        fullscreen ? " is-fullscreen" : ""
      }${fullscreen && chromeRevealed ? " chrome-revealed" : ""}${
        state === "minimized" ? " is-minimized" : ""
      }${state === "closed" ? " is-closed" : ""}`}
      inert={!visible}
      aria-hidden={!visible}
      onPointerDownCapture={onFocus}
      style={{
        position: "fixed",
        left: geo.x,
        top: geo.y,
        width: geo.w,
        height: geo.h,
        zIndex: instance.zIndex,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        boxShadow: focused
          ? "var(--window-shadow)"
          : "var(--window-shadow-unfocused, var(--window-shadow))",
        transition: interacting
          ? "none"
          : "left 0.2s ease, top 0.2s ease, width 0.2s ease, height 0.2s ease, transform 0.3s cubic-bezier(0.2,0.8,0.2,1), opacity 0.25s",
      }}
    >
      <div
        className="titlebar"
        onPointerDown={onTitlePointerDown}
        onDoubleClick={(e) => {
          // A button is a button — never let a double-click on the traffic
          // lights or any titlebar control trigger maximize/fullscreen.
          if (
            (e.target as HTMLElement).closest(
              ".traffic-lights, button, a, input, select, textarea",
            )
          )
            return;
          onToggleMaximize();
        }}
        onPointerEnter={() => fullscreen && onRevealChange?.(true)}
        onPointerLeave={() => fullscreen && onRevealChange?.(false)}
        style={{ cursor: locked || COARSE ? "default" : "grab" }}
      >
        <div className="traffic-lights">
          <button
            className="traffic-light tl-close"
            onClick={onClose}
            aria-label="Close window"
            title="Close"
          >
            <CloseIcon />
          </button>
          <button
            className="traffic-light tl-min"
            onClick={onMinimize}
            aria-label="Minimize window"
            title="Minimize"
          >
            <MinimizeIcon />
          </button>
          <button
            className="traffic-light tl-max"
            onClick={onToggleMax}
            aria-label={fullscreen ? "Exit full screen" : "Enter full screen"}
            title={fullscreen ? "Exit Full Screen" : "Full Screen"}
          >
            <ZoomIcon maximized={locked} />
          </button>
        </div>
        {toolbar}
        {!toolbar && <span className="titlebar-title">{instance.title}</span>}
      </div>
      <main
        className="window-body"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          background: "var(--bg)",
        }}
      >
        {children}
      </main>
      {footer}
      {state === "normal" &&
        resizable &&
        !COARSE &&
        HANDLES.map((hd) => (
          <div
            key={hd.dir}
            data-dir={hd.dir}
            onPointerDown={startResize(hd.dir)}
            aria-hidden
            style={{ position: "absolute", zIndex: 1, ...hd.style }}
          />
        ))}
    </div>
  );
}
