// src/os/widget/useActiveWidgets.ts
// Runtime set of widgets currently on the desktop. This is the ONE new piece of
// state that "Add Widgets" needs; it lives in the widget domain so the widget
// layer never has to depend on desktop/clickmenu. Persists to localStorage.
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "whoami:active-widgets";

function load(fallback: string[]): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as string[]) : fallback;
  } catch {
    return fallback;
  }
}

export function useActiveWidgets(defaults: string[]) {
  const [activeIds, setActiveIds] = useState<string[]>(() => load(defaults));

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activeIds));
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, [activeIds]);

  const addWidget = useCallback((id: string) => {
    setActiveIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const removeWidget = useCallback((id: string) => {
    setActiveIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const toggleWidget = useCallback((id: string) => {
    setActiveIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  return { activeIds, addWidget, removeWidget, toggleWidget };
}
