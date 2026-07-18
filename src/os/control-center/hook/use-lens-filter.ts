import type { RefObject } from "react";
import { useEffect } from "react";

// ─── Liquid-glass lens filter (macOS "Liquid Glass", SDF edge refraction) ──
// Builds a displacement map from a ROUNDED-RECT signed distance field: the
// center of the panel stays perfectly flat (neutral) and refraction is
// confined to a narrow band just inside the rounded edge, bending the desktop
// evenly along all four sides + corners — the way a real glass panel refracts,
// not a round "bowl". An SVG filter referenced by `backdrop-filter: url(#cc-lens)`
// applies it, with per-channel staggered displacement for subtle rim chromatic
// aberration (the glass "prism" fringe).
//
// Two details that make or break the look:
//   • color-interpolation-filters="sRGB" — without it SVG defaults to linearRGB
//     and remaps neutral gray 128, injecting a ghost displacement over the whole
//     panel (looks smeary/wrong). MUST be sRGB.
//   • refraction is smoothstepped into an edge BAND; the interior is neutral.
//
// Chromium/Edge render this fully; Safari partially; Firefox ignores url() in
// backdrop-filter and falls back to plain frosted glass (see ControlCenter.css).

export const CC_LENS_FILTER_ID = "cc-lens";

const SVGNS = "http://www.w3.org/2000/svg";

// Tuned to match the approved preview exactly.
const SCALE = 60; // edge bend strength (px of max displacement)
const BAND = 20; // width (px) of the refraction band just inside the edge
const CHROMA = 1; // per-channel offset for rim chromatic aberration (0 = off)
const BLUR = 2; // light frost inside the glass
const SATURATE = 150; // %
const FALLBACK_RADIUS = 20; // used if the element's radius can't be read

// rounded-rect signed distance field (px space, centered). <0 inside, 0 at edge.
function rrSDF(
  px: number,
  py: number,
  hw: number,
  hh: number,
  r: number,
): number {
  const qx = Math.abs(px) - (hw - r);
  const qy = Math.abs(py) - (hh - r);
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
}

function smoothstep(t: number): number {
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return t * t * (3 - 2 * t);
}

function buildMapDataUrl(w: number, h: number, radius: number): string {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(w, h);
  const hw = w / 2;
  const hh = h / 2;
  const r = Math.min(radius, hw, hh);
  const eps = 1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x - hw + 0.5;
      const py = y - hh + 0.5;
      const d = rrSDF(px, py, hw, hh, r); // <0 inside, 0 at edge

      // confine refraction to a band of width BAND just inside the edge:
      // t = 1 at the very edge, ramps to 0 by BAND inward, neutral in center.
      const t = smoothstep((d + BAND) / BAND);

      // outward normal via SDF gradient
      const gx =
        (rrSDF(px + eps, py, hw, hh, r) - rrSDF(px - eps, py, hw, hh, r)) /
        (2 * eps);
      const gy =
        (rrSDF(px, py + eps, hw, hh, r) - rrSDF(px, py - eps, hw, hh, r)) /
        (2 * eps);
      const gl = Math.hypot(gx, gy) || 1;

      // push backdrop sampling outward at the rim (magnify) -> displace along -normal
      const dx = -(gx / gl) * t;
      const dy = -(gy / gl) * t;

      const i = (y * w + x) * 4;
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      img.data[i] = edge ? 128 : Math.max(0, Math.min(255, 128 + dx * 127)); // R -> x shift
      img.data[i + 1] = edge ? 128 : Math.max(0, Math.min(255, 128 + dy * 127)); // G -> y shift
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv.toDataURL();
}

function appendDisplace(
  filter: SVGFilterElement,
  scale: number,
  matrix: string | null,
  result: string | null,
): void {
  const dm = document.createElementNS(SVGNS, "feDisplacementMap");
  dm.setAttribute("in", "SourceGraphic");
  dm.setAttribute("in2", "map");
  dm.setAttribute("scale", String(scale));
  dm.setAttribute("xChannelSelector", "R");
  dm.setAttribute("yChannelSelector", "G");
  if (matrix) {
    dm.setAttribute("result", `${result}_d`);
    filter.appendChild(dm);
    const cm = document.createElementNS(SVGNS, "feColorMatrix");
    cm.setAttribute("in", `${result}_d`);
    cm.setAttribute("type", "matrix");
    cm.setAttribute("values", matrix);
    if (result) cm.setAttribute("result", result);
    filter.appendChild(cm);
  } else {
    filter.appendChild(dm);
  }
}

function appendBlend(
  filter: SVGFilterElement,
  a: string,
  b: string,
  result: string | null,
): void {
  const fb = document.createElementNS(SVGNS, "feBlend");
  fb.setAttribute("in", a);
  fb.setAttribute("in2", b);
  fb.setAttribute("mode", "screen");
  if (result) fb.setAttribute("result", result);
  filter.appendChild(fb);
}

/**
 * Installs (and keeps sized) the liquid-glass lens filter for `ref`'s element.
 * Rebuilds the map whenever the element resizes so refraction always matches
 * the panel's real dimensions and corner radius. Pass extra `deps` (e.g. `open`)
 * so it re-runs once the portal-mounted panel exists.
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
      const w = Math.max(4, Math.round(rect.width));
      const h = Math.max(4, Math.round(rect.height));

      const cs = getComputedStyle(el);
      const parsedR = parseFloat(cs.borderTopLeftRadius);
      const radius =
        Number.isFinite(parsedR) && parsedR > 0 ? parsedR : FALLBACK_RADIUS;

      const url = buildMapDataUrl(w, h, radius);
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
      filter.setAttribute("color-interpolation-filters", "sRGB"); // CRITICAL

      const feImage = document.createElementNS(SVGNS, "feImage");
      feImage.setAttribute("x", "0");
      feImage.setAttribute("y", "0");
      feImage.setAttribute("width", String(w));
      feImage.setAttribute("height", String(h));
      feImage.setAttribute("preserveAspectRatio", "none");
      feImage.setAttribute("href", url);
      feImage.setAttributeNS("http://www.w3.org/1999/xlink", "href", url);
      feImage.setAttribute("result", "map");
      filter.appendChild(feImage);

      if (CHROMA > 0) {
        // per-channel staggered displacement -> chromatic aberration at rim
        appendDisplace(
          filter,
          SCALE + CHROMA,
          "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0",
          "R",
        );
        appendDisplace(
          filter,
          SCALE,
          "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0",
          "G",
        );
        appendDisplace(
          filter,
          SCALE - CHROMA,
          "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0",
          "B",
        );
        appendBlend(filter, "R", "G", "RG");
        appendBlend(filter, "RG", "B", null);
      } else {
        appendDisplace(filter, SCALE, null, null);
      }

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

// exported for reference / potential fine-tuning from callers
export const CC_LENS_BACKDROP = `url(#${CC_LENS_FILTER_ID}) blur(${BLUR}px) saturate(${SATURATE}%)`;
