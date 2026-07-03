import { useEffect, useRef, useState } from 'react';
import type { WidgetDefinition, WidgetRenderContext } from '../types';

/** Polar → cartesian on a clock face. angleDeg: 0 = 12 o'clock, clockwise. */
function hand(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/** A tapered hand as a slim quadrilateral from a back-tail to the tip. */
function taperedHand(cx: number, cy: number, len: number, tail: number, half: number, angleDeg: number) {
  const tip = hand(cx, cy, len, angleDeg);
  const back = hand(cx, cy, tail, angleDeg + 180);
  const perp = hand(0, 0, half, angleDeg + 90);
  return [
    `${back.x - perp.x},${back.y - perp.y}`,
    `${tip.x - perp.x * 0.35},${tip.y - perp.y * 0.35}`,
    `${tip.x + perp.x * 0.35},${tip.y + perp.y * 0.35}`,
    `${back.x + perp.x},${back.y + perp.y}`,
  ].join(' ');
}

function ClockFace({ now }: { now: Date }) {
  const cx = 100, cy = 100;
  const s = now.getSeconds() + now.getMilliseconds() / 1000;
  const m = now.getMinutes() + s / 60;
  const h = (now.getHours() % 12) + m / 60;

  const secA = s * 6;
  const minA = m * 6;
  const hourA = h * 30;

  // ticks: minor (minutes) + major long ticks at each hour
  const ticks = [];
  for (let i = 0; i < 60; i++) {
    const major = i % 5 === 0;
    const outer = hand(cx, cy, 90, i * 6);
    const inner = hand(cx, cy, major ? 80 : 85, i * 6); // majors are longer
    ticks.push(
      <line
        key={i}
        x1={inner.x} y1={inner.y}
        x2={outer.x} y2={outer.y}
        className={major ? 'wgt-clock-tick--major' : 'wgt-clock-tick'}
      />,
    );
  }

  // hour numerals (1–12) placed by polar coords → always aligned
  const nums = [];
  for (let n = 1; n <= 12; n++) {
    const p = hand(cx, cy, 62, n * 30);
    nums.push(
      <text
        key={n}
        x={p.x}
        y={p.y}
        className="wgt-clock-num"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {n}
      </text>,
    );
  }

  const secTip = hand(cx, cy, 78, secA);
  const secTail = hand(cx, cy, 20, secA + 180);

  return (
    <svg className="wgt-clock-face" viewBox="0 0 200 200" role="img" aria-label="Analog clock">
      <defs>
        <radialGradient id="clkFace" cx="50%" cy="38%" r="72%">
          <stop offset="0%" stopColor="var(--info)" stopOpacity="0.14" />
          <stop offset="55%" stopColor="var(--fg)" stopOpacity="0.02" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.18" />
        </radialGradient>
        <linearGradient id="clkGlass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="42%" stopColor="#fff" stopOpacity="0.03" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id="clkShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1.6" floodColor="#000" floodOpacity="0.45" />
        </filter>
      </defs>

      {/* bezel + face */}
      <circle cx={cx} cy={cy} r="94" className="wgt-clock-bezel" />
      <circle cx={cx} cy={cy} r="90" fill="url(#clkFace)" />
      <circle cx={cx} cy={cy} r="90" className="wgt-clock-ring" />

      {ticks}
      {nums}

      {/* hands */}
      <g filter="url(#clkShadow)">
        <polygon points={taperedHand(cx, cy, 50, 14, 3.4, hourA)} className="wgt-clock-hour" />
        <polygon points={taperedHand(cx, cy, 72, 18, 2.4, minA)} className="wgt-clock-min" />
      </g>
      {/* second hand */}
      <line x1={secTail.x} y1={secTail.y} x2={secTip.x} y2={secTip.y} className="wgt-clock-sec" />
      <circle cx={secTip.x} cy={secTip.y} r="2.4" className="wgt-clock-sec-dot" />

      {/* hub */}
      <circle cx={cx} cy={cy} r="5.5" className="wgt-clock-hub" />
      <circle cx={cx} cy={cy} r="2.2" className="wgt-clock-hub-in" />

      {/* glass sheen */}
      <ellipse cx={cx} cy="72" rx="72" ry="46" fill="url(#clkGlass)" pointerEvents="none" />
    </svg>
  );
}

function ClockContent({ ctx }: { ctx: WidgetRenderContext }) {
  const [now, setNow] = useState(() => new Date());
  const raf = useRef<number>(0);

  useEffect(() => {
    const tick = () => {
      setNow(new Date());
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  // Derive the city from the browser's IANA timezone (e.g. "America/Vancouver" → "Vancouver").
  // Accurate, needs no network/IP lookup and no permission, and matches the local time shown.
  let place = (ctx.data.meta.location || '').split('·')[0].trim();
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz.includes('/')) {
      place = tz.split('/').pop()!.replace(/_/g, ' ');
    }
  } catch {
    /* keep meta.location fallback */
  }
  if (!place) place = 'Local';
  const date = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="wgt-clock">
      <ClockFace now={now} />
      <div className="wgt-clock-meta">
        <div className="wgt-clock-date">{date}</div>
        <div className="wgt-clock-loc">
          <span className="wgt-pin" aria-hidden>◉</span> {place}
        </div>
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
