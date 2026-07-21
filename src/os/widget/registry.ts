// src/os/widget/registry.ts
import { bootstrapWidget } from "./bootstrap";
import { calendarWidget } from "./calendar";
import { clockWidget } from "./clock";
import { contactWidget } from "./contact";
import { featuredProjectWidget } from "./featured";
import { skillsWidget } from "./skills";
import { stickyNoteWidget } from "./sticky";
import { terminalTipWidget } from "./terminal";
import { weatherWidget } from "./weather";

import type { WidgetDefinition } from "./types";

/**
 * Single source of truth for every desktop widget — the full "Add Widgets"
 * catalog. Mirrors apps/registry. Which of these are actually on the desktop is
 * decided at runtime by `activeIds` (see useActiveWidgets), NOT by this array.
 */
export const CATALOG: WidgetDefinition[] = [
  bootstrapWidget,
  clockWidget,
  weatherWidget,
  skillsWidget,
  featuredProjectWidget,
  contactWidget,
  calendarWidget,
  stickyNoteWidget,
  terminalTipWidget,
];

/** Back-compat alias for existing imports. WidgetLayer now filters by activeIds. */
export const WIDGETS = CATALOG;

/** Widgets placed on the desktop on first load */
export const DEFAULT_ACTIVE_WIDGET_IDS: string[] = [
  // bootstrapWidget.id,
  // weatherWidget.id,
  contactWidget.id,
  // clockWidget.id,
  // skillsWidget.id,
  // featuredProjectWidget.id,
];

export function getWidget(id: string): WidgetDefinition | undefined {
  return CATALOG.find((w) => w.id === id);
}
