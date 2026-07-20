import { useEffect, useState } from "react";

import { FALLBACK_WEATHER } from "./wmo";

import type { DayEntry, Forecast, HourEntry } from "./wmo";

// Keyless, CORS-enabled endpoints — no API keys, no data.json changes.
const GEO_URL = "https://ipwho.is/";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";
const REFRESH_MS = 15 * 60 * 1000; // re-fetch every 15 minutes

interface Geo {
  city: string;
  lat: number;
  lon: number;
}

interface OpenMeteoResponse {
  current: {
    time: string;
    temperature_2m: number;
    is_day: number;
    weather_code: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    is_day: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

/** Resolve the viewer's approximate city + coordinates from their IP. */
async function fetchGeo(signal: AbortSignal): Promise<Geo> {
  const res = await fetch(GEO_URL, { signal });
  if (!res.ok) throw new Error(`geo http ${res.status}`);
  const j = (await res.json()) as {
    success?: boolean;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  if (
    j.success === false ||
    typeof j.latitude !== "number" ||
    typeof j.longitude !== "number"
  ) {
    throw new Error("geo payload invalid");
  }
  return {
    city: j.city || "Current Location",
    lat: j.latitude,
    lon: j.longitude,
  };
}

function shortHour(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric" });
}

/** Parse a YYYY-MM-DD string as a *local* date to avoid UTC weekday drift. */
function shortWeekday(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: "short" });
}

function normalize(city: string, j: OpenMeteoResponse): Forecast {
  const current = {
    temp: Math.round(j.current.temperature_2m),
    code: j.current.weather_code,
    isDay: j.current.is_day === 1,
  };

  // Snap to the hourly bucket that CONTAINS now (the last hour <= now), so a
  // 4:30 reading shows the 4 PM cell as "Now" instead of jumping to 5 PM.
  const nowMs = new Date(j.current.time).getTime();
  let start = -1;
  for (let i = 0; i < j.hourly.time.length; i++) {
    if (new Date(j.hourly.time[i]).getTime() <= nowMs) start = i;
    else break;
  }
  if (start < 0) start = 0;

  const hours: HourEntry[] = [];
  for (let i = start; i < j.hourly.time.length && hours.length < 6; i++) {
    hours.push({
      label: hours.length === 0 ? "Now" : shortHour(j.hourly.time[i]),
      temp: Math.round(j.hourly.temperature_2m[i]),
      code: j.hourly.weather_code[i],
      isDay: j.hourly.is_day[i] === 1,
    });
  }

  const days: DayEntry[] = [];
  for (let i = 0; i < j.daily.time.length && days.length < 5; i++) {
    days.push({
      label: i === 0 ? "Today" : shortWeekday(j.daily.time[i]),
      code: j.daily.weather_code[i],
      hi: Math.round(j.daily.temperature_2m_max[i]),
      lo: Math.round(j.daily.temperature_2m_min[i]),
    });
  }

  return {
    city,
    current,
    todayHi: Math.round(j.daily.temperature_2m_max[0]),
    todayLo: Math.round(j.daily.temperature_2m_min[0]),
    hours,
    days,
    rangeMin: Math.round(Math.min(...j.daily.temperature_2m_min)),
    rangeMax: Math.round(Math.max(...j.daily.temperature_2m_max)),
  };
}

async function fetchForecast(geo: Geo, signal: AbortSignal): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: String(geo.lat),
    longitude: String(geo.lon),
    current: "temperature_2m,is_day,weather_code",
    hourly: "temperature_2m,weather_code,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    timezone: "auto",
    forecast_days: "6",
  });
  const res = await fetch(`${WEATHER_URL}?${params.toString()}`, { signal });
  if (!res.ok) throw new Error(`weather http ${res.status}`);
  const j = (await res.json()) as OpenMeteoResponse;
  return normalize(geo.city, j);
}

/**
 * Returns a live forecast for the viewer's IP location, refreshed every 15 min.
 * Initialises with (and always falls back to) FALLBACK_WEATHER, so the widget
 * never shows a blank/broken state.
 */
export function useWeather(): Forecast {
  const [forecast, setForecast] = useState<Forecast>(FALLBACK_WEATHER);

  useEffect(() => {
    let cancelled = false;
    let controller: AbortController | null = null;

    const load = async () => {
      controller?.abort();
      controller = new AbortController();
      const { signal } = controller;
      try {
        const geo = await fetchGeo(signal);
        const next = await fetchForecast(geo, signal);
        if (!cancelled) setForecast(next);
      } catch {
        /* keep last good data (fallback) on any network/geo failure */
      }
    };

    void load();
    const id = window.setInterval(() => void load(), REFRESH_MS);
    return () => {
      cancelled = true;
      controller?.abort();
      window.clearInterval(id);
    };
  }, []);

  return forecast;
}
