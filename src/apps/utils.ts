export function resolveAsset(url?: string): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${import.meta.env.BASE_URL}${url.replace(/^\/+/, "")}`;
}

/** Quote a remote-sourced image URL for CSS. Returns null when the value could
 * break out of `url(...)` and inject further declarations. */
export function cssUrl(url?: string): string | null {
  const resolved = resolveAsset(url);
  if (!resolved || /["'()\\\s]/.test(resolved)) return null;
  return `url("${resolved}")`;
}
