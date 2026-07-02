import { clockWidget } from './items/ClockWidget';
import { contactWidget } from './items/ContactWidget';
import { featuredProjectWidget } from './items/FeaturedProjectWidget';
import { skillsWidget } from './items/SkillsWidget';
import type { WidgetDefinition } from './types';
// Optional extras — uncomment to place on the desktop:
// import { calendarWidget } from './items/CalendarWidget';
// import { stickyNoteWidget } from './items/StickyNoteWidget';
// import { terminalTipWidget } from './items/TerminalTipWidget';

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
