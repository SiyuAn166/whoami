// src/os/widget/registry.ts
import { bootstrapWidget } from "./bootstrap/BootstrapWidget";
import { calendarWidget } from "./calendar/CalendarWidget";
import { clockWidget } from "./clock/ClockWidget";
import { contactWidget } from "./contact/ContactWidget";
import { featuredProjectWidget } from "./featured/FeaturedProjectWidget";
import { skillsWidget } from "./skills/SkillsWidget";
import { stickyNoteWidget } from "./sticky/StickyNoteWidget";
import { terminalTipWidget } from "./terminal/TerminalTipWidget";
import type { WidgetDefinition } from "./types";

/**
 * Single source of truth for every desktop widget — the full "Add Widgets"
 * catalog. Mirrors apps/registry. Which of these are actually on the desktop is
 * decided at runtime by `activeIds` (see useActiveWidgets), NOT by this array.
 */
export const CATALOG: WidgetDefinition[] = [
  bootstrapWidget,
  clockWidget,
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
  bootstrapWidget.id,
  contactWidget.id,
  // clockWidget.id,
  // skillsWidget.id,
  // featuredProjectWidget.id,
];

export function getWidget(id: string): WidgetDefinition | undefined {
  return CATALOG.find((w) => w.id === id);
}
