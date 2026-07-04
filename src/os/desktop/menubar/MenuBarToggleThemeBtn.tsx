import { MoonGlyph, SunGlyph } from "./MenuBarGlyphs";

interface MenuBarToggleThemeBtnProps {
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export function MenuBarToggleThemeBtn({
  theme,
  onToggleTheme,
}: MenuBarToggleThemeBtnProps) {
  const isDark = theme === "dark";

  return (
    <button
      className="appearance-toggle"
      onClick={onToggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} appearance`}
      title={`Switch to ${isDark ? "light" : "dark"} appearance`}
    >
      <span className="font-semibold" aria-hidden>
        {isDark ? <SunGlyph /> : <MoonGlyph />}
      </span>
    </button>
  );
}
