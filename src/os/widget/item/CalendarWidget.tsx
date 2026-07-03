import type { WidgetDefinition } from '../types';
import './CalendarWidget.css';

function CalendarContent() {
  const now = new Date();
  const month = now.toLocaleDateString([], { month: 'long' }).toUpperCase();
  const weekday = now.toLocaleDateString([], { weekday: 'long' });
  return (
    <div className="wgt-cal">
      <div className="wgt-cal-month">{month}</div>
      <div className="wgt-cal-day">{now.getDate()}</div>
      <div className="wgt-cal-weekday">{weekday}</div>
    </div>
  );
}

export const calendarWidget: WidgetDefinition = {
  id: 'calendar',
  size: 'small',
  variant: 'glass',
  order: 15,
  render: () => <CalendarContent />,
};
