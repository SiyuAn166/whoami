import { useWeather } from "./use-weather";
import { WeatherIcon } from "./WeatherIcons";
import { conditionForCode, gradientFor } from "./wmo";

import styles from "./WeatherWidget.module.css";

/** macOS "large" weather tile: current conditions, a 6-hour strip and a
 *  5-day outlook, painted on a condition-driven sky gradient. */
export function WeatherContent() {
  const fc = useWeather();
  const cond = conditionForCode(fc.current.code);
  const background = gradientFor(cond.key, fc.current.isDay);
  const span = Math.max(1, fc.rangeMax - fc.rangeMin);

  return (
    <div className={styles.wxRoot} style={{ background }}>
      <div className={styles.wxHead}>
        <div className={styles.wxHeadText}>
          <div className={styles.wxLoc}>{fc.city}</div>
          <div className={styles.wxTemp}>{fc.current.temp}°</div>
          <div className={styles.wxCond}>{cond.label}</div>
          <div className={styles.wxHilo}>
            H:{fc.todayHi}° L:{fc.todayLo}°
          </div>
        </div>
        <WeatherIcon condition={cond.key} isDay={fc.current.isDay} size={46} />
      </div>

      <div className={styles.wxHours}>
        {fc.hours.map((h, i) => (
          <div className={styles.wxHour} key={i}>
            <span className={styles.wxHourLabel}>{h.label}</span>
            <WeatherIcon
              condition={conditionForCode(h.code).key}
              isDay={h.isDay}
              size={20}
            />
            <span className={styles.wxHourTemp}>{h.temp}°</span>
          </div>
        ))}
      </div>

      <div className={styles.wxDays}>
        {fc.days.map((d, i) => {
          const left = ((d.lo - fc.rangeMin) / span) * 100;
          const width = Math.max(8, ((d.hi - d.lo) / span) * 100);
          return (
            <div className={styles.wxDay} key={i}>
              <span className={styles.wxDayName}>{d.label}</span>
              <WeatherIcon
                condition={conditionForCode(d.code).key}
                isDay
                size={18}
              />
              <span className={styles.wxLo}>{d.lo}°</span>
              <span className={styles.wxBar}>
                <span
                  className={styles.wxBarFill}
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              </span>
              <span className={styles.wxHi}>{d.hi}°</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
