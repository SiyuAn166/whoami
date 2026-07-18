import {
  type CSSProperties,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { WidgetRenderContext } from "../types";
import styles from "./ClockWidget.module.css";

/** Polar → cartesian on a clock face. angleDeg: 0 = 12 o'clock, clockwise. */
function hand(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/** A tapered hand as a slim quadrilateral, drawn pointing straight up (12 o'clock).
 *  It is rotated to the current time purely via CSS transform, so the geometry
 *  is computed exactly once — never per frame. */
function taperedHand(
  cx: number,
  cy: number,
  len: number,
  tail: number,
  half: number,
) {
  const tip = hand(cx, cy, len, 0);
  const back = hand(cx, cy, tail, 180);
  const perp = hand(0, 0, half, 90);
  return [
    `${back.x - perp.x},${back.y - perp.y}`,
    `${tip.x - perp.x * 0.35},${tip.y - perp.y * 0.35}`,
    `${tip.x + perp.x * 0.35},${tip.y + perp.y * 0.35}`,
    `${back.x + perp.x},${back.y + perp.y}`,
  ].join(" ");
}

const CX = 100;
const CY = 100;

/* ── Static geometry — built once at module load, never re-rendered ───────── */
const TICKS = Array.from({ length: 60 }, (_, i) => {
  const major = i % 5 === 0;
  const outer = hand(CX, CY, 90, i * 6);
  const inner = hand(CX, CY, major ? 80 : 85, i * 6);
  return { i, major, x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y };
});
const NUMS = Array.from({ length: 12 }, (_, k) => {
  const n = k + 1;
  const p = hand(CX, CY, 62, n * 30);
  return { n, x: p.x, y: p.y };
});
const HOUR_PTS = taperedHand(CX, CY, 50, 14, 3.4);
const MIN_PTS = taperedHand(CX, CY, 72, 18, 2.4);
const SEC_TIP = hand(CX, CY, 78, 0); // (100, 22)
const SEC_TAIL = hand(CX, CY, 20, 180); // (100, 120)

/** Turn an elapsed-seconds value + full-cycle length into the CSS variables that
 *  position a hand: a negative delay "fast-forwards" the 0→360° spin to now. */
function spinVars(elapsedSec: number, cycleSec: number): CSSProperties {
  return {
    "--dur": `${cycleSec}s`,
    "--delay": `${-elapsedSec}s`,
    "--angle": `${(elapsedSec / cycleSec) * 360}deg`, // static fallback (reduced-motion)
  } as CSSProperties;
}

/* ── The DIAL: everything static. Painted exactly once, then memoized so it is
 *    never rebuilt or repainted again — not even when the date label ticks.
 *    The hands are NOT in here (see below), so this raster stays frozen. ───── */
const ClockDial = memo(function ClockDial() {
  return (
    <svg
      className={styles.wgtClockLayer}
      viewBox="0 0 200 200"
      role="img"
      aria-label="Analog clock"
    >
      <defs>
        <radialGradient id="clkFace" cx="50%" cy="38%" r="72%">
          <stop offset="0%" stopColor="var(--info)" stopOpacity="0.14" />
          <stop offset="55%" stopColor="var(--fg)" stopOpacity="0.02" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.18" />
        </radialGradient>
      </defs>

      <circle cx={CX} cy={CY} r="94" className={styles.wgtClockBezel} />
      <circle cx={CX} cy={CY} r="90" fill="url(#clkFace)" />
      <circle cx={CX} cy={CY} r="90" className={styles.wgtClockRing} />

      {TICKS.map((t) => (
        <line
          key={t.i}
          x1={t.x1}
          y1={t.y1}
          x2={t.x2}
          y2={t.y2}
          className={t.major ? styles.wgtClockTickMajor : styles.wgtClockTick}
        />
      ))}

      {NUMS.map(({ n, x, y }) => (
        <text
          key={n}
          x={x}
          y={y}
          className={styles.wgtClockNum}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {n}
        </text>
      ))}
    </svg>
  );
});

/* ── The CAP: hub + glass sheen. Static, sits on TOP of the hands so the
 *    z-order (dial → hour → min → sec → hub → glass) matches the original. ── */
const ClockCap = memo(function ClockCap() {
  return (
    <svg
      className={`${styles.wgtClockLayer} wgt-clock-cap`}
      viewBox="0 0 200 200"
      aria-hidden
    >
      <defs>
        <linearGradient id="clkGlass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="42%" stopColor="#fff" stopOpacity="0.03" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx={CX} cy={CY} r="5.5" className={styles.wgtClockHub} />
      <circle cx={CX} cy={CY} r="2.2" className={styles.wgtClockHubIn} />
      <ellipse cx={CX} cy="72" rx="72" ry="46" fill="url(#clkGlass)" />
    </svg>
  );
});

/** A single hand lives in its OWN <svg> overlay → its own GPU compositor layer.
 *  Rotating it is a composite-only op: no paint, and the dial never repaints. */
function Hand({
  vars,
  children,
}: {
  vars: CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <svg
      className={`${styles.wgtClockLayer} ${styles.wgtClockHand}`}
      viewBox="0 0 200 200"
      style={vars}
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** The moving parts. Rebuilt only when `start` changes (i.e. never in practice),
 *  so the three overlay layers are set up once and then animate on their own. */
const ClockHands = memo(function ClockHands({ start }: { start: Date }) {
  const spin = useMemo(() => {
    const sec = start.getSeconds() + start.getMilliseconds() / 1000;
    const minElapsed = start.getMinutes() * 60 + sec; // within the 3600s cycle
    const hrElapsed = (start.getHours() % 12) * 3600 + minElapsed; // within 43200s
    return {
      hour: spinVars(hrElapsed, 43200),
      min: spinVars(minElapsed, 3600),
      sec: spinVars(sec, 60),
    };
  }, [start]);

  return (
    <>
      <Hand vars={spin.hour}>
        <polygon points={HOUR_PTS} className={styles.wgtClockHour} />
      </Hand>
      <Hand vars={spin.min}>
        <polygon points={MIN_PTS} className={styles.wgtClockMin} />
      </Hand>
      <Hand vars={spin.sec}>
        <line
          x1={SEC_TAIL.x}
          y1={SEC_TAIL.y}
          x2={SEC_TIP.x}
          y2={SEC_TIP.y}
          className={styles.wgtClockSec}
        />
        <circle
          cx={SEC_TIP.x}
          cy={SEC_TIP.y}
          r="2.4"
          className={styles.wgtClockSecDot}
        />
      </Hand>
    </>
  );
});

export function ClockContent({ ctx }: { ctx: WidgetRenderContext }) {
  // Frozen at mount: the hands are driven entirely by CSS and stay accurate in
  // real time, so this never needs to change.
  const startRef = useRef<Date>(new Date());

  // The ONLY thing React updates now is the date label — once every 30s, not 60fps.
  const [dateNow, setDateNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setDateNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  let place = (ctx.data.meta.location || "").split("·")[0].trim();
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz.includes("/")) {
      place = tz.split("/").pop()!.replace(/_/g, " ");
    }
  } catch {
    /* keep meta.location fallback */
  }
  if (!place) place = "Local";

  const date = dateNow.toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className={styles.wgtClock}>
      <div className={styles.wgtClockDial}>
        <ClockDial />
        <ClockHands start={startRef.current} />
        <ClockCap />
      </div>
      <div className={styles.wgtClockMeta}>
        <div className={styles.wgtClockDate}>{date}</div>
        <div className={styles.wgtClockLoc}>
          <span className="wgt-pin" aria-hidden>
            ◉
          </span>{" "}
          {place}
        </div>
      </div>
    </div>
  );
}
