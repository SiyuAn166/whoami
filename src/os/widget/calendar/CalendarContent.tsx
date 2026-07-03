import "./CalendarWidget.css";

export function CalendarContent() {
  const now = new Date();
  const month = now.toLocaleDateString([], { month: "long" }).toUpperCase();
  const weekday = now.toLocaleDateString([], { weekday: "long" });
  return (
    <div className="wgt-cal">
      <div className="wgt-cal-month">{month}</div>
      <div className="wgt-cal-day">{now.getDate()}</div>
      <div className="wgt-cal-weekday">{weekday}</div>
    </div>
  );
}
