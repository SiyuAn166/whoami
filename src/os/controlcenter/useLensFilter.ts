import type { RefObject } from "react";
import { useEffect } from "react";

// ─── Liquid-glass lens filter ───────────────────────────────────────
// Builds a radial "convex lens" displacement map (flat in the center,
// refraction ramping up toward the rim) and installs an SVG filter that
// `backdrop-filter: url(#cc-lens)` references. This bends/magnifies the real
// desktop behind the panel at its edges — the L1 lens effect.
//
// Chromium/Edge render this fully; Safari supports it partially; Firefox does
// not yet support url() in backdrop-filter, so it gracefully falls back to the
// plain frosted look defined in ControlCenter.css (no crash, just no bending).

export const CC_LENS_FILTER_ID = "cc-lens";

const SVGNS = "http://www.w3.org/2000/svg";
const RIM_START = 0.55; // center stays flat until 55% out, then refraction ramps
const DISPLACE_SCALE = 9; // px of maximum edge displacement

function buildMapDataUrl(w: number, h: number): string {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = (x / (w - 1)) * 2 - 1;
      const ny = (y / (h - 1)) * 2 - 1;
      const rr = Math.min(1, Math.hypot(nx, ny) / Math.SQRT2);
      let d = (rr - RIM_START) / (1 - RIM_START);
      d = d < 0 ? 0 : Math.pow(d, 1.6);
      const len = Math.hypot(nx, ny) || 1;
      // push samples toward the center so the rim magnifies the backdrop
      const dx = -(nx / len) * d;
      const dy = -(ny / len) * d;
      const i = (y * w + x) * 4;
      img.data[i] = Math.max(0, Math.min(255, 128 + dx * 127)); // R -> x shift
      img.data[i + 1] = Math.max(0, Math.min(255, 128 + dy * 127)); // G -> y shift
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv.toDataURL();
}

/**
 * Installs (and keeps sized) the lens displacement filter for `ref`'s element.
 * Rebuilds the map whenever the element resizes so refraction always matches
 * the panel's real dimensions. Pass extra `deps` (e.g. `open`) so it re-runs
 * once the portal-mounted panel exists.
 */
export function useLensFilter(
  ref: RefObject<HTMLElement | null>,
  deps: unknown[] = [],
): void {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;

    const build = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(2, Math.round(rect.width));
      const h = Math.max(2, Math.round(rect.height));
      const url = buildMapDataUrl(w, h);
      if (!url) return;

      // Reuse a single shared <svg> host so only one filter node exists.
      let host = document.getElementById(
        `${CC_LENS_FILTER_ID}-host`,
      ) as SVGSVGElement | null;
      if (!host) {
        host = document.createElementNS(SVGNS, "svg");
        host.setAttribute("id", `${CC_LENS_FILTER_ID}-host`);
        host.setAttribute("width", "0");
        host.setAttribute("height", "0");
        host.setAttribute("aria-hidden", "true");
        host.style.position = "absolute";
        host.style.width = "0";
        host.style.height = "0";
        document.body.appendChild(host);
      }
      host.innerHTML = "";

      const filter = document.createElementNS(SVGNS, "filter");
      filter.setAttribute("id", CC_LENS_FILTER_ID);
      filter.setAttribute("filterUnits", "userSpaceOnUse");
      filter.setAttribute("x", "0");
      filter.setAttribute("y", "0");
      filter.setAttribute("width", String(w));
      filter.setAttribute("height", String(h));

      const feImage = document.createElementNS(SVGNS, "feImage");
      feImage.setAttribute("x", "0");
      feImage.setAttribute("y", "0");
      feImage.setAttribute("width", String(w));
      feImage.setAttribute("height", String(h));
      feImage.setAttribute("preserveAspectRatio", "none");
      feImage.setAttribute("href", url);
      feImage.setAttributeNS("http://www.w3.org/1999/xlink", "href", url);
      feImage.setAttribute("result", "map");

      const feDisp = document.createElementNS(SVGNS, "feDisplacementMap");
      feDisp.setAttribute("in", "SourceGraphic");
      feDisp.setAttribute("in2", "map");
      feDisp.setAttribute("scale", String(DISPLACE_SCALE));
      feDisp.setAttribute("xChannelSelector", "R");
      feDisp.setAttribute("yChannelSelector", "G");

      filter.appendChild(feImage);
      filter.appendChild(feDisp);
      host.appendChild(filter);

      // nudge a repaint so the backdrop re-samples through the new filter
      el.style.transform = "translateZ(0)";
    };

    build();
    const ro = new ResizeObserver(build);
    ro.observe(el);

    return () => {
      ro.disconnect();
      const host = document.getElementById(`${CC_LENS_FILTER_ID}-host`);
      host?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
