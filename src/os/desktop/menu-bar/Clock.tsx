import { useEffect, useState } from "react";

export function MenuClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");

    const tick = () => {
      const now = new Date();
      const clock = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      if (mq.matches) {
        setTime(clock);
      } else {
        const day = now.toLocaleDateString("en-US", { weekday: "short" });
        const date = now.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        setTime(`${day} ${date}  ${clock}`);
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    mq.addEventListener("change", tick);
    return () => {
      clearInterval(id);
      mq.removeEventListener("change", tick);
    };
  }, []);

  return (
    <span
      className="font-semibold"
      style={{
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {time}
    </span>
  );
}
