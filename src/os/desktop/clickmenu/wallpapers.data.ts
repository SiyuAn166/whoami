// src/os/desktop/clickmenu/wallpapers.data.ts
// Wallpaper option list, kept separate from the component so the gallery file
// only exports components (react-refresh/only-export-components).

export interface WallpaperOption {
  id: string;
  name: string;
}

export const WALLPAPERS: WallpaperOption[] = [
  { id: "aurora-grid", name: "Aurora Grid" },
  { id: "neon-grid", name: "Neon Grid" },
  { id: "sunset-waves", name: "Sunset Waves" },
  { id: "twilight-aurora", name: "Twilight Aurora" },
  { id: "pastel-mesh", name: "Pastel Mesh" },
];
