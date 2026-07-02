import { useCallback, useState, type ReactNode } from 'react';
import { getApp } from '../apps/registry';
import type { AppRenderContext } from '../apps/types';
import { Window } from './Window';
import { defaultRect, type Rect, type WindowInstance } from './windowTypes';

interface UseWindowManagerResult {
  instances: WindowInstance[];
  openApp: (appId: string) => void;
  isOpen: (appId: string) => boolean;
  focusedId: string | null;
  render: () => ReactNode;
}

let nextInstanceId = 1;

export function useWindowManager(ctx: AppRenderContext): UseWindowManagerResult {
  const [instances, setInstances] = useState<WindowInstance[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [openCount, setOpenCount] = useState(0);

  const topZ = () => (instances.length ? Math.max(...instances.map(w => w.zIndex)) : 0);

  const focus = useCallback((id: string) => {
    setFocusedId(id);
    setInstances(list => {
      const z = list.length ? Math.max(...list.map(w => w.zIndex)) + 1 : 1;
      return list.map(w => (w.id === id ? { ...w, zIndex: z } : w));
    });
  }, []);

  const openApp = useCallback((appId: string) => {
    const app = getApp(appId);
    if (!app) return;
    const singleton = app.singleton ?? true;
    if (singleton) {
      const existing = instances.find(w => w.appId === appId);
      if (existing) {
        if (existing.state === 'minimized' || existing.state === 'closed') {
          setInstances(list => list.map(w => (w.id === existing.id ? { ...w, state: 'normal' } : w)));
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
      state: 'normal',
      zIndex: topZ() + 1,
      minSize: app.minSize,
      resizable: app.resizable,
    };
    setInstances(list => [...list, instance]);
    setFocusedId(id);
    setOpenCount(c => c + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instances, openCount, focus]);

  const updateInstance = (id: string, patch: Partial<WindowInstance>) =>
    setInstances(list => list.map(w => (w.id === id ? { ...w, ...patch } : w)));
  const close = (id: string) => updateInstance(id, { state: 'closed' });
  const minimize = (id: string) => updateInstance(id, { state: 'minimized' });
  const toggleMax = (id: string) =>
    setInstances(list => list.map(w => (w.id === id ? { ...w, state: w.state === 'maximized' ? 'normal' : 'maximized' } : w)));
  const setRect = (id: string, rect: Rect) => updateInstance(id, { rect });

  const isOpen = (appId: string) =>
    instances.some(w => w.appId === appId && w.state !== 'closed');

  const render = () => instances
    .filter(w => w.state !== 'closed')
    .map(w => {
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
          onRectChange={rect => setRect(w.id, rect)}
          toolbar={app.renderToolbar?.(ctx)}
          footer={app.renderFooter?.(ctx)}
        >
          {app.render(ctx)}
        </Window>
      );
    });

  return { instances, openApp, isOpen, focusedId, render };
}
