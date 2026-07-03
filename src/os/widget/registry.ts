import { clockWidget } from "./clock/ClockWidget";
import { contactWidget } from "./contact/ContactWidget";
import { featuredProjectWidget } from "./featured/FeaturedProjectWidget";
import { skillsWidget } from "./skills/SkillsWidget";
import type { WidgetDefinition } from "./types";
// Optional extras — uncomment to place on the desktop:
// import { calendarWidget } from './calendar/CalendarWidget';
// import { stickyNoteWidget } from './sticky/StickyNoteWidget';
// import { terminalTipWidget } from './terminal/TerminalTipWidget';

/** Single source of truth for every desktop widget. Mirrors apps/registry. */
export const WIDGETS: WidgetDefinition[] = [
  clockWidget,
  skillsWidget,
  featuredProjectWidget,
  contactWidget,
  // calendarWidget,
  // stickyNoteWidget,
  // terminalTipWidget,
];

export function getWidget(id: string): WidgetDefinition | undefined {
  return WIDGETS.find((w) => w.id === id);
}
