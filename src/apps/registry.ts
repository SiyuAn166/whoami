import { finderApp } from "./finder/FinderApp";
import { previewApp } from "./preview/PreviewApp";
import { terminalApp } from "./terminal/TerminalApp";
import { tetrisApp } from "./tetris";
import type { AppDefinition } from "./types";

/** Single source of truth for every app the desktop knows about. */
export const APPS: AppDefinition[] = [
  finderApp,
  terminalApp,
  previewApp,
  tetrisApp,
];

export function getApp(id: string): AppDefinition | undefined {
  return APPS.find((a) => a.id === id);
}
