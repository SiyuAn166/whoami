import "./CalendarWidget.css";

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
    <div className="wgt-cal">
      <div className="wgt-cal-head">
        <span className="wgt-cal-month">{monthLabel}</span>
        <span className="wgt-cal-year">{year}</span>
      </div>

      <div className="wgt-cal-grid">
        {WEEKDAYS.map((w, i) => (
          <div
            key={`h${i}`}
            className={`wgt-cal-dow${i === 0 || i === 6 ? " wgt-cal-weekend" : ""}`}
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
                "wgt-cal-cell" +
                (d === null ? " wgt-cal-empty" : "") +
                (weekend ? " wgt-cal-weekend" : "") +
                (isToday ? " wgt-cal-today" : "")
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
