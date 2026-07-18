import styles from "./CalendarWidget.module.css";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function CalendarContent() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  const monthLabel = now.toLocaleDateString([], { month: "long" });
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build a flat list of cells: leading blanks + day numbers.
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className={styles.wgtCal}>
      <div className={styles.wgtCalHead}>
        <span className={styles.wgtCalMonth}>{monthLabel}</span>
        <span className={styles.wgtCalYear}>{year}</span>
      </div>

      <div className={styles.wgtCalGrid}>
        {WEEKDAYS.map((w, i) => (
          <div
            key={`h${i}`}
            className={`${styles.wgtCalDow}${i === 0 || i === 6 ? " " + styles.wgtCalWeekend : ""}`}
          >
            {w}
          </div>
        ))}

        {cells.map((d, i) => {
          const dow = i % 7;
          const weekend = dow === 0 || dow === 6;
          const isToday = d === today;
          return (
            <div
              key={i}
              className={
                styles.wgtCalCell +
                (d === null ? " " + styles.wgtCalEmpty : "") +
                (weekend ? " " + styles.wgtCalWeekend : "") +
                (isToday ? " " + styles.wgtCalToday : "")
              }
            >
              {d ?? ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}
