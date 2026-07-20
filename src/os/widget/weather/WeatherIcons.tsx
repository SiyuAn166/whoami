import type { ConditionKey } from "./wmo";

interface Props {
  condition: ConditionKey;
  isDay: boolean;
  size?: number;
}

const SUN = "#ffe08a";
const CLOUD = "#f4f7fb";
const CLOUD_LINE = "#dfe7f0";

/** macOS-style weather glyphs. White/near-white on the colored sky gradient,
 *  with a warm sun/moon accent. Day/night swaps sun for moon on clear/partly. */
export function WeatherIcon({ condition, isDay, size = 24 }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true,
    style: {
      display: "block",
      filter: "drop-shadow(0 1px 2px rgba(0,0,0,.25))",
    },
  } as const;

  const sun = (
    <>
      <circle cx="12" cy="12" r="5" fill={SUN} />
      <g stroke={SUN} strokeWidth="1.6" strokeLinecap="round">
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
      </g>
    </>
  );

  const moon = (
    <path
      d="M15.5 13.5A6.5 6.5 0 0 1 8 5.2a6.5 6.5 0 1 0 8.8 8.6 6.6 6.6 0 0 1-1.3-.3Z"
      fill="#e9eef7"
    />
  );

  const cloud = (
    <path
      d="M7 18a3.6 3.6 0 0 1 .3-7.2 4.6 4.6 0 0 1 8.9 1 3.1 3.1 0 0 1-.7 6.2H7Z"
      fill={CLOUD}
      stroke={CLOUD_LINE}
      strokeWidth=".8"
    />
  );

  switch (condition) {
    case "clear":
      return <svg {...common}>{isDay ? sun : moon}</svg>;

    case "partly":
      return (
        <svg {...common}>
          {isDay ? (
            <>
              <circle cx="9" cy="9" r="3.4" fill={SUN} />
              <g stroke={SUN} strokeWidth="1.3" strokeLinecap="round">
                <path d="M9 3v2M3 9h2M4.6 4.6l1.4 1.4M13.4 4.6 12 6" />
              </g>
            </>
          ) : (
            <path
              d="M11 8.5A4.2 4.2 0 0 1 8.2 4a4.2 4.2 0 1 0 4.9 5.2A4.3 4.3 0 0 1 11 8.5Z"
              fill="#e9eef7"
            />
          )}
          <path
            d="M8 17.5a3.2 3.2 0 0 1 .3-6.4 4.2 4.2 0 0 1 8 .9 2.8 2.8 0 0 1-.6 5.5H8Z"
            fill={CLOUD}
            stroke={CLOUD_LINE}
            strokeWidth=".8"
          />
        </svg>
      );

    case "overcast":
      return <svg {...common}>{cloud}</svg>;

    case "fog":
      return (
        <svg
          {...common}
          stroke="#eef2f6"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <path d="M4 9h16M3 13h18M5 17h14" />
        </svg>
      );

    case "rain":
      return (
        <svg {...common}>
          <path
            d="M7 14a3.4 3.4 0 0 1 .3-6.8 4.4 4.4 0 0 1 8.5 1 2.9 2.9 0 0 1-.7 5.8H7Z"
            fill="#e9eef4"
            stroke="#d3dbe4"
            strokeWidth=".8"
          />
          <g stroke="#8fd0ff" strokeWidth="1.6" strokeLinecap="round">
            <path d="M9 17l-1 3M13 17l-1 3M17 17l-1 3" />
          </g>
        </svg>
      );

    case "snow":
      return (
        <svg {...common}>
          <path
            d="M7 13a3.4 3.4 0 0 1 .3-6.8 4.4 4.4 0 0 1 8.5 1 2.9 2.9 0 0 1-.7 5.8H7Z"
            fill="#fbfdff"
            stroke="#e2e9f1"
            strokeWidth=".8"
          />
          <g fill="#ffffff">
            <circle cx="9" cy="18" r="1.1" />
            <circle cx="13" cy="19.5" r="1.1" />
            <circle cx="16" cy="18" r="1.1" />
          </g>
        </svg>
      );

    case "thunder":
      return (
        <svg {...common}>
          <path
            d="M7 13a3.4 3.4 0 0 1 .3-6.8 4.4 4.4 0 0 1 8.5 1 2.9 2.9 0 0 1-.7 5.8H7Z"
            fill="#e4e2ee"
            stroke="#cfccdd"
            strokeWidth=".8"
          />
          <path d="M12 12l-2 4h2.4l-1.4 4 4-5h-2.4l1.4-3z" fill={SUN} />
        </svg>
      );

    default:
      return <svg {...common}>{cloud}</svg>;
  }
}
