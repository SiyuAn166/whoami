import { useEffect, useState } from "react";

export function MenuClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const day = now.toLocaleDateString("en-US", { weekday: "short" });
      const date = now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const clock = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      setTime(`${day} ${date}  ${clock}`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      className="font-semibold"
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {time}
    </span>
  );
}
