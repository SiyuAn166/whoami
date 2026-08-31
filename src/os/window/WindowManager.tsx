import { type ReactNode, useCallback, useState } from "react";
import html2canvas from "html2canvas-pro";

import { getApp } from "../../apps/registry";
import {
  defaultRect,
  type Rect,
  type WindowInstance,
  type WindowState,
} from "./types";
import { Window } from "./Window";

import type { AppRenderContext } from "../../apps/types";

/** Options accepted when opening an app from a launcher. */
export interface OpenOptions {
  /** Open (or, if already open, toggle) the window at "full size" — filling
   * the space between the menu bar and the dock. Used by the dock. */
  maximized?: boolean;
}

interface UseWindowManagerResult {
  instances: WindowInstance[];
  /** Windows currently minimized to the dock tray, in the order they live in
   * the instance list. Rendered as thumbnails on the right side of the dock. */
  minimized: WindowInstance[];
  openApp: (appId: string, opts?: OpenOptions) => void;
  isOpen: (appId: string) => boolean;
  /** Un-minimize a window (from a dock thumbnail) and focus it, returning it to
   * whatever state it was in before being minimized. */
  restore: (id: string) => void;
  focusedId: string | null;
  render: (opts?: {
    chromeRevealed?: boolean;
    onRevealChange?: (revealed: boolean) => void;
  }) => ReactNode;
}

let nextInstanceId = 1;

/** Highest-stacked window still on screen — who gets focus when one closes. */
function topmostVisible(list: WindowInstance[]): string | null {
  const visible = list.filter((w) => w.state !== "minimized");
  if (!visible.length) return null;
  return visible.reduce((a, b) => (b.zIndex > a.zIndex ? b : a)).id;
}

export function useWindowManager(
  ctx: AppRenderContext,
): UseWindowManagerResult {
  const [instances, setInstances] = useState<WindowInstance[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const topZ = useCallback(
    () => (instances.length ? Math.max(...instances.map((w) => w.zIndex)) : 0),
    [instances],
  );

  const focus = useCallback((id: string) => {
    setFocusedId(id);
    setInstances((list) => {
      const z = list.length ? Math.max(...list.map((w) => w.zIndex)) + 1 : 1;
      return list.map((w) => (w.id === id ? { ...w, zIndex: z } : w));
    });
  }, []);

  const openApp = useCallback(
    (appId: string, opts?: OpenOptions) => {
      const app = getApp(appId);
      if (!app) return;
      const initialState: WindowState = opts?.maximized
        ? "maximized"
        : "normal";
      const singleton = app.singleton ?? true;
      if (singleton) {
        const existing = instances.find((w) => w.appId === appId);
        if (existing) {
          if (existing.state === "minimized") {
            // Restore a hidden window, honoring the requested state.
            setInstances((list) =>
              list.map((w) =>
                w.id === existing.id
                  ? { ...w, state: initialState, restoreState: undefined }
                  : w,
              ),
            );
          } else if (opts?.maximized) {
            // A dock click on an already-visible window toggles full size.
            setInstances((list) =>
              list.map((w) =>
                w.id === existing.id
                  ? {
                      ...w,
                      state: w.state === "maximized" ? "normal" : "maximized",
                    }
                  : w,
              ),
            );
          }
          focus(existing.id);
          return;
        }
      }
      const id = `${appId}-${nextInstanceId++}`;
      // Cascade offset counts live windows, so it resets as they are closed
      // instead of drifting new windows off the bottom-right corner forever.
      const rect = defaultRect(app.defaultSize, app.minSize, instances.length);
      const instance: WindowInstance = {
        id,
        appId,
        title: app.title ?? app.name,
        rect,
        state: initialState,
        zIndex: topZ() + 1,
        minSize: app.minSize,
        resizable: app.resizable,
      };
      setInstances((list) => [...list, instance]);
      setFocusedId(id);
    },
    [instances, focus, topZ],
  );

  const updateInstance = (id: string, patch: Partial<WindowInstance>) =>
    setInstances((list) =>
      list.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    );

  // Drop the instance outright — a kept-around "closed" record would retain its
  // PNG snapshot, and focus has to move on to the next window down.
  const close = (id: string) => {
    const rest = instances.filter((w) => w.id !== id);
    setInstances(rest);
    if (focusedId === id) setFocusedId(topmostVisible(rest));
  };

  // Minimize to the dock. We first snapshot the live window to a PNG so the
  // dock tray shows a real thumbnail of its contents (like macOS), THEN flip
  // it to the minimized state so the genie animation plays on the real window.
  const minimize = (id: string) => {
    if (focusedId === id)
      setFocusedId(topmostVisible(instances.filter((w) => w.id !== id)));
    const commit = (snapshot?: string) =>
      setInstances((list) =>
        list.map((w) =>
          w.id === id
            ? {
                ...w,
                // Keep the previous snapshot if a fresh capture failed.
                snapshot: snapshot ?? w.snapshot,
                // Remember where to come back to (don't overwrite if already min).
                restoreState:
                  w.state === "minimized" ? w.restoreState : w.state,
                state: "minimized",
              }
            : w,
        ),
      );

    const el =
      typeof document !== "undefined"
        ? (document.querySelector(
            `[data-window-id="${id}"]`,
          ) as HTMLElement | null)
        : null;

    if (!el) {
      commit();
      return;
    }
    html2canvas(el, {
      backgroundColor: null,
      scale: 0.5,
      logging: false,
      useCORS: true,
    })
      .then((canvas) => commit(canvas.toDataURL("image/png")))
      .catch(() => commit());
  };

  // Un-minimize from the dock tray: return to the remembered state and focus.
  const restore = useCallback((id: string) => {
    setInstances((list) => {
      const z = list.length ? Math.max(...list.map((w) => w.zIndex)) + 1 : 1;
      return list.map((w) =>
        w.id === id
          ? {
              ...w,
              state: w.restoreState ?? "normal",
              restoreState: undefined,
              zIndex: z,
            }
          : w,
      );
    });
    setFocusedId(id);
  }, []);

  // Green traffic light: toggle TRUE fullscreen (hides menu bar + dock).
  // From any state, enter fullscreen; from fullscreen, restore to normal.
  const toggleMax = (id: string) =>
    setInstances((list) =>
      list.map((w) =>
        w.id === id
          ? { ...w, state: w.state === "fullscreen" ? "normal" : "fullscreen" }
          : w,
      ),
    );

  // Titlebar double-click: toggle "maximize" — fill the space between the
  // menu bar and the dock, WITHOUT hiding either (not fullscreen).
  const toggleMaximize = (id: string) =>
    setInstances((list) =>
      list.map((w) =>
        w.id === id
          ? { ...w, state: w.state === "maximized" ? "normal" : "maximized" }
          : w,
      ),
    );

  const setRect = (id: string, rect: Rect) => updateInstance(id, { rect });

  const isOpen = (appId: string) => instances.some((w) => w.appId === appId);

  const render = (opts?: {
    chromeRevealed?: boolean;
    onRevealChange?: (revealed: boolean) => void;
  }) =>
    instances.map((w) => {
      const app = getApp(w.appId);
      if (!app) return null;
      return (
        <Window
          key={w.id}
          instance={w}
          focused={focusedId === w.id}
          onFocus={() => focus(w.id)}
          onClose={() => close(w.id)}
          onMinimize={() => minimize(w.id)}
          onToggleMax={() => toggleMax(w.id)}
          onToggleMaximize={() => toggleMaximize(w.id)}
          onRectChange={(rect) => setRect(w.id, rect)}
          chromeRevealed={opts?.chromeRevealed}
          onRevealChange={opts?.onRevealChange}
          toolbar={app.renderToolbar?.(ctx)}
          footer={app.renderFooter?.(ctx)}
        >
          {app.render(ctx, () => close(w.id))}
        </Window>
      );
    });

  const minimized = instances.filter((w) => w.state === "minimized");

  return { instances, minimized, openApp, isOpen, restore, focusedId, render };
}
