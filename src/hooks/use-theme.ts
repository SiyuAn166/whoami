import { useCallback, useEffect, useRef, useState } from "react";

type Theme = "dark" | "light";

interface UseThemeResult {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const STORAGE_KEY = "whoami:theme";

function savedTheme(): Theme | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "dark" || saved === "light" ? saved : null;
  } catch {
    return null;
  }
}

/** Saved choice → OS preference → dark. Runs once, before first paint. */
function initialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const saved = savedTheme();
  if (saved) return saved;
  return window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function useTheme(): UseThemeResult {
  const [theme, applyTheme] = useState<Theme>(initialTheme);
  // Only an explicit user choice is persisted. Auto-applying the OS theme must
  // NOT write storage, or the follow-OS listener below would disarm itself.
  const explicitRef = useRef(savedTheme() !== null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    explicitRef.current = true;
    applyTheme(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* storage unavailable */
    }
  }, []);

  // Follow OS changes until the user picks a theme themselves.
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: light)");
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => {
      if (!explicitRef.current) applyTheme(e.matches ? "light" : "dark");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggleTheme = useCallback(
    () => setTheme(theme === "dark" ? "light" : "dark"),
    [theme, setTheme],
  );

  return { theme, toggleTheme, setTheme };
}
