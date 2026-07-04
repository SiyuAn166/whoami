// src/os/desktop/clickmenu/WidgetGallery.tsx
// "Add Widgets" panel that slides up from above the dock (NO traffic lights /
// NO <Window>). Content is unchanged: category pills + search + a grid of the
// REAL WidgetFrame previews (w.render(ctx)). A blue "Done" button (bottom-right)
// and clicking the empty desktop (scrim) both slide the panel out.
import { useEffect, useMemo, useState } from "react";
import type {
  WidgetDefinition,
  WidgetRenderContext,
  WidgetVariant,
} from "../types";
import { WidgetFrame } from "../WidgetFrame";
import "./WidgetGallery.css";

const VARIANT_LABEL: Record<WidgetVariant, string> = {
  glass: "Glass",
  note: "Sticky Notes",
  terminal: "Terminal",
};

interface Props {
  /** all available widgets — pass CATALOG from registry.ts */
  catalog: WidgetDefinition[];
  /** the same render context WidgetLayer feeds widgets (data / theme / openApp) */
  ctx: WidgetRenderContext;
  /** ids already on the desktop, for the "ON DESKTOP" badge */
  activeIds: string[];
  onAdd: (id: string) => void;
  onClose: () => void;
}

export function WidgetGallery({
  catalog,
  ctx,
  activeIds,
  onAdd,
  onClose,
}: Props) {
  // drive the slide-in / slide-out transition
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(r);
  }, []);

  // slide out, then unmount after the transition
  const close = () => {
    setOpen(false);
    window.setTimeout(onClose, 460);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Respect each def's enabled() — only show widgets whose data exists.
  const available = useMemo(
    () => catalog.filter((w) => (w.enabled ? w.enabled(ctx) : true)),
    [catalog, ctx],
  );

  // Category pills = real variants present (no invented categories).
  const variants = useMemo(() => {
    const present: WidgetVariant[] = [];
    for (const v of ["glass", "note", "terminal"] as WidgetVariant[]) {
      if (available.some((w) => (w.variant ?? "glass") === v)) present.push(v);
    }
    return present;
  }, [available]);

  const [group, setGroup] = useState<WidgetVariant | "all">("all");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return available.filter((w) => {
      const okGroup = group === "all" || (w.variant ?? "glass") === group;
      const okQ =
        !needle ||
        (w.title ?? w.id).toLowerCase().includes(needle) ||
        w.id.includes(needle);
      return okGroup && okQ;
    });
  }, [available, group, q]);

  return (
    <>
      {/* click the empty desktop (scrim) to slide out */}
      <div
        className={`widgetgallery__scrim${open ? " is-open" : ""}`}
        onClick={close}
      />
      <div
        className={`widgetgallery__panel${open ? " is-open" : ""}`}
        role="dialog"
        aria-label="Add widgets"
      >
        <div className="widgetgallery__grip" />

        <div className="widgetgallery__head">
          <div className="widgetgallery__title">Widgets</div>
          <div className="widgetgallery__pills">
            <button
              className={`widgetgallery__pill${group === "all" ? " is-active" : ""}`}
              onClick={() => setGroup("all")}
            >
              All
            </button>
            {variants.map((v) => (
              <button
                key={v}
                className={`widgetgallery__pill${group === v ? " is-active" : ""}`}
                onClick={() => setGroup(v)}
              >
                {VARIANT_LABEL[v]}
              </button>
            ))}
          </div>
          <div className="widgetgallery__search">
            <span className="widgetgallery__mag">{"\u2315"}</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search widgets"
              autoFocus
            />
          </div>
        </div>

        <div className="widgetgallery__grid">
          {list.map((w) => {
            const active = activeIds.includes(w.id);
            return (
              <div
                className="widgetgallery__card"
                key={w.id}
                onClick={() => {
                  onAdd(w.id);
                  close();
                }}
              >
                <div className="widgetgallery__tile" data-size={w.size}>
                  {active && (
                    <span className="widgetgallery__badge">ON DESKTOP</span>
                  )}
                  <div className="widgetgallery__preview" aria-hidden>
                    <div className="widgetgallery__preview-scale">
                      {/* the exact widget shown on the desktop — not a copy */}
                      <WidgetFrame
                        size={w.size}
                        variant={w.variant}
                        title={w.title}
                        ariaLabel={w.title ?? w.id}
                      >
                        {w.render(ctx)}
                      </WidgetFrame>
                    </div>
                  </div>
                  <div className="widgetgallery__plus">
                    {/* plus sign */}
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M7 2.4V11.6M2.4 7H11.6"
                        stroke="#fff"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
                <div className="widgetgallery__caption">
                  <b>{w.title ?? w.id}</b>
                  <span>{w.size}</span>
                </div>
              </div>
            );
          })}
          {list.length === 0 && (
            <div className="widgetgallery__empty">No widgets match “{q}”.</div>
          )}
        </div>

        <div className="widgetgallery__foot">
          <button className="widgetgallery__done" onClick={close}>
            Done
          </button>
        </div>
      </div>
    </>
  );
}
