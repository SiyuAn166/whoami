// src/os/desktop/clickmenu/WidgetGallery.tsx
// "Add Widgets" gallery rendered inside the app's real <Window> chrome, so it
// gets the standard macOS traffic lights, drag and resize for free. It reads the
// widget CATALOG from the registry and renders each tile as the REAL WidgetFrame
// (w.render(ctx)) — no duplicated preview markup. Adding is delegated via onAdd.
import { useMemo, useState } from "react";
import type {
  WidgetDefinition,
  WidgetRenderContext,
  WidgetVariant,
} from "../../widget/types";
import { WidgetFrame } from "../../widget/WidgetFrame";
import { Window } from "../../window/Window";
import {
  defaultRect,
  type Rect,
  type WindowInstance,
} from "../../window/types";
import "./WidgetGallery.css";

const VARIANT_LABEL: Record<WidgetVariant, string> = {
  glass: "Glass",
  note: "Sticky Notes",
  terminal: "Terminal",
};

interface Props {
  /** all available widgets — pass WIDGETS from registry.ts */
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
  // Standalone window instance (not registered with the WindowManager — this is
  // a transient utility window that closes on the red traffic light).
  const [inst, setInst] = useState<WindowInstance>(() => ({
    id: "widget-gallery",
    appId: "widget-gallery",
    title: "Widgets",
    rect: defaultRect({ w: 760, h: 540 }, { w: 520, h: 380 }),
    state: "normal",
    zIndex: 9000,
    minSize: { w: 520, h: 380 },
    resizable: true,
  }));

  const onRectChange = (rect: Rect) => setInst((i) => ({ ...i, rect }));
  const onToggleMax = () =>
    setInst((i) => ({
      ...i,
      state: i.state === "maximized" ? "normal" : "maximized",
    }));

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
    <Window
      instance={inst}
      focused
      onFocus={() => {}}
      onClose={onClose}
      onMinimize={onClose}
      onToggleMax={onToggleMax}
      onRectChange={onRectChange}
    >
      <div className="widgetgallery">
        <div className="widgetgallery__controls">
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
                  onClose();
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
                  <div className="widgetgallery__plus">+</div>
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
      </div>
    </Window>
  );
}
