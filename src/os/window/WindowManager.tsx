import { useCallback, useState, type ReactNode } from "react";
import { getApp } from "../../apps/registry";
import type { AppRenderContext } from "../../apps/types";
import { Window } from "./Window";
import {
  defaultRect,
  type Rect,
  type WindowInstance,
  type WindowState,
} from "./types";

/** Options accepted when opening an app from a launcher. */
export interface OpenOptions {
  /** Open (or, if already open, toggle) the window at "full size" — filling
   * the space between the menu bar and the dock. Used by the dock. */
  maximized?: boolean;
}

interface UseWindowManagerResult {
  instances: WindowInstance[];
  openApp: (appId: string, opts?: OpenOptions) => void;
  isOpen: (appId: string) => boolean;
  focusedId: string | null;
  render: (opts?: {
    chromeRevealed?: boolean;
    onRevealChange?: (revealed: boolean) => void;
  }) => ReactNode;
}

let nextInstanceId = 1;

export function useWindowManager(
  ctx: AppRenderContext,
): UseWindowManagerResult {
  const [instances, setInstances] = useState<WindowInstance[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [openCount, setOpenCount] = useState(0);

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
          if (existing.state === "minimized" || existing.state === "closed") {
            // Restore a hidden window, honoring the requested state.
            setInstances((list) =>
              list.map((w) =>
                w.id === existing.id ? { ...w, state: initialState } : w,
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
      const rect = defaultRect(app.defaultSize, app.minSize, openCount);
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
      setOpenCount((c) => c + 1);
    },
    [instances, openCount, focus, topZ],
  );

  const updateInstance = (id: string, patch: Partial<WindowInstance>) =>
    setInstances((list) =>
      list.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    );

  const close = (id: string) => updateInstance(id, { state: "closed" });
  const minimize = (id: string) => updateInstance(id, { state: "minimized" });

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

  const isOpen = (appId: string) =>
    instances.some((w) => w.appId === appId && w.state !== "closed");

  const render = (opts?: {
    chromeRevealed?: boolean;
    onRevealChange?: (revealed: boolean) => void;
  }) =>
    instances
      .filter((w) => w.state !== "closed")
      .map((w) => {
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

  return { instances, openApp, isOpen, focusedId, render };
}
