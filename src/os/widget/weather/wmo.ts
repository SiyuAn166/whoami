// WMO weather-code interpretation: the single source of truth that maps an
// Open-Meteo numeric weather_code into a display bucket (icon key + label) and
// the macOS-style sky gradient for that bucket. Also holds the hardcoded
// fallback forecast used when geolocation or the weather API is unavailable.
// This lives in the widget so nothing here depends on data.json.

export type ConditionKey =
  "clear" | "partly" | "overcast" | "fog" | "rain" | "snow" | "thunder";

export interface CurrentWeather {
  /** Rounded temperature in the configured unit (°C by default). */
  temp: number;
  /** Raw WMO weather code. */
  code: number;
  /** True when the sun is up at the location (drives day/night visuals). */
  isDay: boolean;
}

export interface HourEntry {
  /** "Now" for the first cell, otherwise a short hour label e.g. "3 PM". */
  label: string;
  temp: number;
  code: number;
  isDay: boolean;
}

export interface DayEntry {
  /** "Today" for the first row, otherwise a short weekday e.g. "Mon". */
  label: string;
  code: number;
  hi: number;
  lo: number;
}

export interface Forecast {
  city: string;
  current: CurrentWeather;
  todayHi: number;
  todayLo: number;
  hours: HourEntry[];
  days: DayEntry[];
  /** Min/max across all days — used to scale the daily hi/lo bars. */
  rangeMin: number;
  rangeMax: number;
}

/** Map a raw WMO code to a display bucket + human label. */
export function conditionForCode(code: number): {
  key: ConditionKey;
  label: string;
} {
  if (code <= 1)
    return { key: "clear", label: code === 0 ? "Clear" : "Mainly Clear" };
  if (code === 2) return { key: "partly", label: "Partly Cloudy" };
  if (code === 3) return { key: "overcast", label: "Overcast" };
  if (code === 45 || code === 48) return { key: "fog", label: "Fog" };
  if (code >= 71 && code <= 77) return { key: "snow", label: "Snow" };
  if (code === 85 || code === 86) return { key: "snow", label: "Snow Showers" };
  if (code >= 95) return { key: "thunder", label: "Thunderstorm" };
  if (code >= 80 && code <= 82) return { key: "rain", label: "Rain Showers" };
  if (code >= 51 && code <= 57) return { key: "rain", label: "Drizzle" };
  if (code >= 61 && code <= 67) return { key: "rain", label: "Rain" };
  // Unknown / unlisted precip codes fall through to the nearest bucket so the
  // widget never renders a blank icon.
  return { key: "overcast", label: "Cloudy" };
}

const GRADIENTS: Record<
  ConditionKey,
  { day: [string, string]; night: [string, string] }
> = {
  clear: { day: ["#3a8ee6", "#8fc4f5"], night: ["#1b2a4a", "#3f5a8a"] },
  partly: { day: ["#5b93cf", "#a9c3dc"], night: ["#24304d", "#41527a"] },
  overcast: { day: ["#6b7787", "#9aa6b4"], night: ["#2b3340", "#454e5e"] },
  fog: { day: ["#8b93a0", "#b6bcc6"], night: ["#333a44", "#525a66"] },
  rain: { day: ["#4a5a6e", "#78889a"], night: ["#232d3a", "#3d4a5c"] },
  snow: { day: ["#7f97b0", "#b9cadd"], night: ["#3a4658", "#5b6b80"] },
  thunder: { day: ["#3a3550", "#5c5677"], night: ["#241f38", "#3c3656"] },
};

/** CSS `linear-gradient(...)` for a bucket, dimmed at night. */
export function gradientFor(key: ConditionKey, isDay: boolean): string {
  const [top, bottom] = isDay ? GRADIENTS[key].day : GRADIENTS[key].night;
  return `linear-gradient(180deg, ${top}, ${bottom})`;
}

/**
 * Self-contained default forecast (a clear Vancouver afternoon). Rendered
 * instantly on mount and kept whenever geolocation or the weather API fails,
 * so the widget always looks correct — even offline. NOT sourced from data.json.
 */
export const FALLBACK_WEATHER: Forecast = {
  city: "Vancouver",
  current: { temp: 21, code: 1, isDay: true },
  todayHi: 24,
  todayLo: 14,
  rangeMin: 11,
  rangeMax: 24,
  hours: [
    { label: "Now", temp: 21, code: 1, isDay: true },
    { label: "3 PM", temp: 23, code: 0, isDay: true },
    { label: "4 PM", temp: 23, code: 2, isDay: true },
    { label: "5 PM", temp: 21, code: 2, isDay: true },
    { label: "6 PM", temp: 19, code: 3, isDay: true },
    { label: "7 PM", temp: 17, code: 3, isDay: false },
  ],
  days: [
    { label: "Today", code: 1, hi: 24, lo: 14 },
    { label: "Mon", code: 2, hi: 23, lo: 13 },
    { label: "Tue", code: 3, hi: 20, lo: 12 },
    { label: "Wed", code: 61, hi: 18, lo: 11 },
    { label: "Thu", code: 2, hi: 21, lo: 12 },
  ],
};
