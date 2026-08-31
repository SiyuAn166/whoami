import { useEffect, useState } from "react";

import { GIST_URL } from "../config";

import type { PortfolioData } from "../types/portfolio";

interface UsePortfolioDataResult {
  data: PortfolioData | null;
  loading: boolean;
  error: string | null;
}

// The payload is fetched from a remote gist and flows straight into hrefs,
// window.open and CSS url(). Strip script-bearing schemes once, at the
// boundary, rather than at every sink.
const DANGEROUS_SCHEME = /^\s*(javascript|data|vbscript|file|blob):/i;

function sanitize<T>(value: T): T {
  if (typeof value === "string")
    return (DANGEROUS_SCHEME.test(value) ? "" : value) as T;
  if (Array.isArray(value)) return value.map(sanitize) as T;
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, sanitize(v)]),
    ) as T;
  return value;
}

/** Minimum shape the desktop dereferences unguarded (`data.meta.wallpaper`,
 * `data.projects.map`, …). A drifted gist should show the retry screen, not a
 * blank page. */
function isPortfolioData(v: unknown): v is PortfolioData {
  if (!v || typeof v !== "object") return false;
  const d = v as Partial<PortfolioData>;
  return (
    !!d.meta &&
    typeof d.meta === "object" &&
    !!d.identity &&
    typeof d.identity === "object" &&
    Array.isArray(d.experience) &&
    Array.isArray(d.projects) &&
    Array.isArray(d.skills)
  );
}

export function usePortfolioData(): UsePortfolioDataResult {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(GIST_URL, { signal: ac.signal });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }
        const json: unknown = await res.json();
        if (!isPortfolioData(json)) {
          throw new Error("Unexpected data format");
        }
        if (!cancelled) {
          setData(sanitize(json));
          setError(null);
        }
      } catch (err) {
        if (!cancelled && !ac.signal.aborted) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          setError(errorMsg);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, []);

  return { data, loading, error };
}
