import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { AppRenderContext } from "../../apps/types";
import "./WidgetLayer.css";
import { WidgetFrame } from "./WidgetFrame";
import { WIDGETS } from "./registry";
import type { WidgetRenderContext, WidgetSize } from "./types";

interface WidgetLayerProps extends AppRenderContext {
  openApp: (appId: string) => void;
}

/** Invisible grid the widgets snap to on release, so they line up with each
 *  other. Smaller = finer alignment; 20px matches macOS-ish feel. */
const GRID = 20;
/** Pointer travel (px) below which a gesture counts as a click, not a drag. */
const CLICK_SLOP = 4;
/** Minimum empty space kept between two cards when resolving overlaps. */
const GAP = 12;
/** Keep-out margins so cards never sit under the menu bar / screen edges. */
const MARGIN = { top: 46, left: 18, right: 12, bottom: 12 };
const STORAGE_KEY = "whoami:widget-positions";

type Pos = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };
type PosMap = Record<string, Pos>;

/** Default heights per size tier — used only to stack the initial left column. */
const TIER_H: Record<WidgetSize, number> = {
  small: 190,
  medium: 210,
  wide: 150,
  large: 380,
};

const snap = (v: number) => Math.round(v / GRID) * GRID;

/** Do two rects overlap, allowing for a required gap between them? */
function overlaps(a: Rect, b: Rect, gap = GAP): boolean {
  return (
    a.x < b.x + b.w + gap &&
    a.x + a.w + gap > b.x &&
    a.y < b.y + b.h + gap &&
    a.y + a.h + gap > b.y
  );
}

function loadSaved(): PosMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PosMap) : {};
  } catch {
    return {};
  }
}

/**
 * Renders the desktop widgets as free-floating, draggable cards. Cards default
 * to a left-side column, can be dragged anywhere, and snap to an invisible grid
 * on release (so they align with one another). Dropped cards that would overlap
 * a neighbour are pushed to the nearest free grid cell, so widgets never cover
 * one another. Positions persist per-widget in localStorage. Adding a widget
 * still requires no change here.
 */
export function WidgetLayer(props: WidgetLayerProps) {
  const ctx: WidgetRenderContext = props;

  const visible = WIDGETS.filter((w) =>
    w.enabled ? w.enabled(ctx) : true,
  ).sort((a, b) => (a.order ?? 100) - (b.order ?? 100));

  // Compute the default left-column layout, then let saved positions override.
  const [positions, setPositions] = useState<PosMap>(() => {
    const saved = loadSaved();
    const out: PosMap = {};
    let y = MARGIN.top;
    for (const w of visible) {
      out[w.id] = saved[w.id] ?? w.defaultPos ?? { x: MARGIN.left, y };
      y += TIER_H[w.size] + 16;
    }
    return out;
  });

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const drag = useRef<{
    id: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
    pointerId: number;
  } | null>(null);
  const suppressClick = useRef(false);
  const layerRef = useRef<HTMLDivElement>(null);

  // Right-anchored widgets: measure real width after first layout and pin to the
  // right edge — avoids hard-coding any widget width. Skips ones already saved.
  useLayoutEffect(() => {
    const saved = loadSaved();
    setPositions((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const w of visible) {
        if (w.defaultAnchor !== "right" || saved[w.id]) continue;
        const { w: width } = sizeOf(w.id);
        const x = window.innerWidth - width - MARGIN.right;
        const p = clampXY(
          width,
          sizeOf(w.id).h,
          x,
          prev[w.id]?.y ?? MARGIN.top,
        );
        if (prev[w.id]?.x !== p.x) {
          next[w.id] = { ...next[w.id], ...p };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sizeOf = useCallback((id: string): { w: number; h: number } => {
    const el = layerRef.current?.querySelector<HTMLElement>(
      `[data-wid="${id}"]`,
    );
    return { w: el?.offsetWidth ?? 200, h: el?.offsetHeight ?? 200 };
  }, []);

  const clampXY = useCallback(
    (w: number, h: number, x: number, y: number): Pos => {
      const maxX = window.innerWidth - w - MARGIN.right;
      const maxY = window.innerHeight - h - MARGIN.bottom;
      return {
        x: Math.max(MARGIN.left, Math.min(x, Math.max(MARGIN.left, maxX))),
        y: Math.max(MARGIN.top, Math.min(y, Math.max(MARGIN.top, maxY))),
      };
    },
    [],
  );

  const clamp = useCallback(
    (id: string, x: number, y: number): Pos => {
      const { w, h } = sizeOf(id);
      return clampXY(w, h, x, y);
    },
    [sizeOf, clampXY],
  );

  /**
   * Given a desired (already-snapped) position for `id`, return the nearest
   * grid position that doesn't overlap any other card. Searches outward in
   * expanding square rings, so the card lands as close as possible to where
   * it was dropped.
   */
  const resolveCollision = useCallback(
    (id: string, desired: Pos, all: PosMap): Pos => {
      const { w, h } = sizeOf(id);
      const others: Rect[] = [];
      for (const w2 of visible) {
        if (w2.id === id) continue;
        const p = all[w2.id];
        if (!p) continue;
        const s = sizeOf(w2.id);
        others.push({ x: p.x, y: p.y, w: s.w, h: s.h });
      }
      const free = (x: number, y: number): boolean => {
        const c = clampXY(w, h, x, y);
        // Reject if the clamp had to move it (would push off-screen) is fine —
        // we test the clamped rect for overlaps.
        const rect: Rect = { x: c.x, y: c.y, w, h };
        return !others.some((o) => overlaps(rect, o));
      };
      if (free(desired.x, desired.y))
        return clampXY(w, h, desired.x, desired.y);

      // Expanding-ring search on the grid around the desired cell.
      const maxRing = Math.ceil(
        Math.max(window.innerWidth, window.innerHeight) / GRID,
      );
      for (let r = 1; r <= maxRing; r++) {
        const step = r * GRID;
        // Candidates ordered roughly by proximity: the 4 axis points first, then corners.
        const ring: Pos[] = [];
        for (let d = -r; d <= r; d++) {
          ring.push({ x: desired.x + d * GRID, y: desired.y - step }); // top edge
          ring.push({ x: desired.x + d * GRID, y: desired.y + step }); // bottom edge
          ring.push({ x: desired.x - step, y: desired.y + d * GRID }); // left edge
          ring.push({ x: desired.x + step, y: desired.y + d * GRID }); // right edge
        }
        // Prefer candidates closest to the desired point.
        ring.sort(
          (a, b) =>
            Math.hypot(a.x - desired.x, a.y - desired.y) -
            Math.hypot(b.x - desired.x, b.y - desired.y),
        );
        for (const cand of ring) {
          if (free(cand.x, cand.y)) return clampXY(w, h, cand.x, cand.y);
        }
      }
      // Fallback: nowhere free (shouldn't happen) — keep desired, clamped.
      return clampXY(w, h, desired.x, desired.y);
    },
    [visible, sizeOf, clampXY],
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, id: string) => {
      if (e.button !== 0) return;
      // Don't capture the pointer or flag a drag yet — a plain click must reach
      // the inner links/buttons natively. We only take over once the pointer
      // actually travels past CLICK_SLOP (see onPointerMove).
      const cur = positions[id] ?? { x: MARGIN.left, y: MARGIN.top };
      drag.current = {
        id,
        startX: e.clientX,
        startY: e.clientY,
        originX: cur.x,
        originY: cur.y,
        moved: false,
        pointerId: e.pointerId,
      };
      suppressClick.current = false;
    },
    [positions],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (!d.moved) {
        if (Math.hypot(dx, dy) <= CLICK_SLOP) return; // still a potential click
        // Crossed the threshold: NOW it's a real drag. Take over the pointer so
        // moving fast outside the card keeps tracking, and flag the drag.
        d.moved = true;
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(d.pointerId);
        } catch {
          /* noop */
        }
        setDraggingId(d.id);
      }
      const next = clamp(d.id, d.originX + dx, d.originY + dy);
      setPositions((p) => ({ ...p, [d.id]: next }));
    },
    [clamp],
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      drag.current = null;
      setDraggingId(null);
      if (!d) return;
      // We only ever captured the pointer once a real drag started.
      if (d.moved) {
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture?.(d.pointerId);
        } catch {
          /* noop */
        }
      }
      if (d.moved) {
        suppressClick.current = true; // swallow the click that follows a drag
        const cur = positions[d.id] ?? { x: MARGIN.left, y: MARGIN.top };
        const snapped = clamp(d.id, snap(cur.x), snap(cur.y));
        const resolved = resolveCollision(d.id, snapped, positions);
        const next = { ...positions, [d.id]: resolved };
        setPositions(next);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* ignore quota / privacy-mode errors */
        }
      }
    },
    [positions, clamp, resolveCollision],
  );

  // Re-clamp everything if the window shrinks below a card's position.
  useLayoutEffect(() => {
    const onResize = () =>
      setPositions((p) => {
        const out: PosMap = {};
        for (const id of Object.keys(p)) out[id] = clamp(id, p[id].x, p[id].y);
        return out;
      });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clamp]);

  return (
    <div className="wgt-layer" ref={layerRef} aria-label="Desktop widgets">
      {visible.map((w) => {
        const link = w.href?.(ctx);
        const onActivate = link
          ? () => window.open(link, "_blank", "noopener")
          : w.onActivate
            ? () => w.onActivate!(ctx)
            : undefined;
        const pos = positions[w.id] ?? { x: MARGIN.left, y: MARGIN.top };
        const isDragging = draggingId === w.id;
        return (
          <div
            key={w.id}
            data-wid={w.id}
            className={`wgt-drag${isDragging ? " dragging" : ""}`}
            style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
            onPointerDown={(e) => onPointerDown(e, w.id)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onClickCapture={(e) => {
              if (suppressClick.current) {
                e.stopPropagation();
                e.preventDefault();
                suppressClick.current = false;
              }
            }}
          >
            <WidgetFrame
              size={w.size}
              variant={w.variant}
              title={w.title}
              onActivate={onActivate}
              ariaLabel={w.title ?? w.id}
            >
              {w.render(ctx)}
            </WidgetFrame>
          </div>
        );
      })}
    </div>
  );
}
