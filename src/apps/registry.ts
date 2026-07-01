import { finderApp } from './finder/FinderApp';
import { terminalApp } from './terminal/TerminalApp';
import type { AppDefinition } from './types';

/** Single source of truth for every app the desktop knows about. */
export const APPS: AppDefinition[] = [finderApp, terminalApp];

export function getApp(id: string): AppDefinition | undefined {
    return APPS.find(a => a.id === id);
}
