import { finderApp } from "./finder";
import { previewApp } from "./preview";
import { terminalApp } from "./terminal";
import { arcadeApp } from "./arcade";
import type { AppDefinition } from "./types";

/** Single source of truth for every app the desktop knows about. */
export const APPS: AppDefinition[] = [
  finderApp,
  terminalApp,
  previewApp,
  arcadeApp,
];

export function getApp(id: string): AppDefinition | undefined {
  return APPS.find((a) => a.id === id);
}
