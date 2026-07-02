import { useEffect, useState } from 'react';
import type { WidgetDefinition, WidgetRenderContext } from '../types';

function ClockContent({ ctx }: { ctx: WidgetRenderContext }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // meta.location example: "Vancouver, BC · 49.28° N, 123.12° W" — take the place part.
  const place = (ctx.data.meta.location || '').split('·')[0].trim() || 'Local';
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const date = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="wgt-clock">
      <div className="wgt-clock-time">{time}</div>
      <div className="wgt-clock-date">{date}</div>
      <div className="wgt-clock-loc">
        <span className="wgt-pin" aria-hidden>◉</span> {place}
      </div>
      <div className="wgt-status">
        <span className="wgt-status-dot" aria-hidden /> Open to work
      </div>
    </div>
  );
}

export const clockWidget: WidgetDefinition = {
  id: 'clock',
  size: 'small',
  variant: 'glass',
  order: 10,
  defaultPos: { x: 18, y: 60 },
  render: ctx => <ClockContent ctx={ctx} />,
};
