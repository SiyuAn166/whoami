import { clockWidget } from './item/ClockWidget';
import { contactWidget } from './item/ContactWidget';
import { featuredProjectWidget } from './item/FeaturedProjectWidget';
import { skillsWidget } from './item/SkillsWidget';
import type { WidgetDefinition } from './types';
// Optional extras — uncomment to place on the desktop:
// import { calendarWidget } from './item/CalendarWidget';
// import { stickyNoteWidget } from './item/StickyNoteWidget';
// import { terminalTipWidget } from './item/TerminalTipWidget';

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
  return WIDGETS.find(w => w.id === id);
}
