// ============================================================================
// Arcade hub — a console-style home screen. A horizontal cover carousel: the
// focused game's cover sits large and lit in the center, neighbors flank it
// smaller and dimmed. Keyboard-driven: ArrowLeft / ArrowRight move selection,
// Enter launches, Esc backs out. Games come from the registry in games.ts, so
// the hub is generic — register a game there and its cover shows up here.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { GAMES } from "./games";
import "./style.css";

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
// smoothstep — softens the linear proximity ramp into a dock-like curve
const smooth = (t: number) => {
  t = clamp01(t);
  return t * t * (3 - 2 * t);
};

export function Hub({ onClose }: { onClose?: () => void }) {
  const [view, setView] = useState<string>("hub");
  const [sel, setSel] = useState(0);
  const [booting, setBooting] = useState(false);

  // Live drag state: while a finger is down we translate the rail by dragPx so
  // the carousel follows the finger, and every card's scale/glow interpolates
  // from its live distance to centre (macOS-dock magnification). On release we
  // snap to the nearest card.
  const [dragPx, setDragPx] = useState(0);
  // drag offset expressed in card-units (fractional), computed in the touch
  // handler where reading stepRef is allowed; render uses this so it never
  // touches a ref during render.
  const [dragUnits, setDragUnits] = useState(0);
  const [dragging, setDragging] = useState(false);

  const launch = useCallback((id: string) => {
    setBooting(true);
    window.setTimeout(() => {
      setView(id);
      setBooting(false);
    }, 460);
  }, []);

  // Touch: horizontal swipe moves selection. During the drag the rail tracks
  // the finger (with rubber-banding at the ends); a short, still touch is
  // treated as a tap (neighbour selects, focused launches) via the cards'
  // onClick, so we only take over once the finger clearly moves horizontally.
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const stepRef = useRef(1);
  const axisRef = useRef<"none" | "x" | "y">("none");
  const didDragRef = useRef(false); // a real horizontal drag happened this touch

  const onTouchStart = (e: React.TouchEvent) => {
    if (booting) return;
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
    axisRef.current = "none";
    didDragRef.current = false;
    // one card + gap in px, read live so it works across breakpoints
    const rail = e.currentTarget.querySelector(
      ".arc-rail",
    ) as HTMLElement | null;
    const card = rail?.querySelector(".arc-card") as HTMLElement | null;
    const cw = card?.offsetWidth ?? 300;
    const gap = rail ? parseFloat(getComputedStyle(rail).gap || "0") : 0;
    stepRef.current = cw + gap;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current || booting) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;

    // lock the gesture axis once movement is decisive
    if (axisRef.current === "none") {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8)
        axisRef.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (axisRef.current !== "x") return; // let vertical scroll pass through
    // NOTE: no preventDefault here — `.arc-stage { touch-action: pan-y }` already
    // reserves horizontal gestures for us, so React's passive listener is fine.

    if (Math.abs(dx) > 6) didDragRef.current = true;
    const step = stepRef.current || 1;
    // clamp: never drag more than one card away, so a cover can't slide
    // off-screen. At the first/last card, rubber-band and cap tighter.
    const atStart = sel === 0 && dx > 0;
    const atEnd = sel === GAMES.length - 1 && dx < 0;
    let eff = dx;
    if (atStart || atEnd) {
      eff = Math.sign(dx) * Math.min(Math.abs(dx) * 0.35, step * 0.35);
    } else {
      eff = Math.sign(dx) * Math.min(Math.abs(dx), step);
    }
    if (!dragging) setDragging(true);
    setDragPx(eff);
    setDragUnits(eff / step);
  };

  const onTouchEnd = () => {
    if (!touchStart.current || booting) {
      touchStart.current = null;
      return;
    }
    const step = stepRef.current || 1;
    // commit a move once the finger has crossed ~35% of a card (or a card+)
    const moved = -Math.round(dragPx / step);
    const threshold =
      dragPx !== 0 && Math.abs(dragPx) > step * 0.35 ? Math.sign(-dragPx) : 0;
    const delta = moved !== 0 ? moved : threshold;
    if (delta !== 0)
      setSel((s) => Math.max(0, Math.min(GAMES.length - 1, s + delta)));

    // reset drag → the rail's transform transition snaps to the target
    setDragging(false);
    setDragPx(0);
    setDragUnits(0);
    touchStart.current = null;
    axisRef.current = "none";
  };

  useEffect(() => {
    if (view !== "hub") return;
    const onKey = (e: KeyboardEvent) => {
      if (booting) return;
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          setSel((s) => Math.min(GAMES.length - 1, s + 1));
          break;
        case "ArrowLeft":
          e.preventDefault();
          setSel((s) => Math.max(0, s - 1));
          break;
        case "Enter":
          e.preventDefault();
          launch(GAMES[sel].id);
          break;
        case "Escape":
          e.preventDefault();
          onClose?.();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, sel, booting, launch, onClose]);

  const active = GAMES.find((g) => g.id === view);
  if (active) {
    const Game = active.Game;
    return <Game onQuit={() => setView("hub")} />;
  }

  const focused = GAMES[sel];

  // Continuous magnification: the fractional centre index shifts with the drag,
  // so each card's proximity (and thus its scale/glow, driven by --p in CSS)
  // interpolates live as the finger moves — the macOS-dock feel. dragUnits is
  // maintained in the touch handler, so render stays ref-free.
  const center = sel - dragUnits;

  return (
    <div
      className="arc-home"
      style={{ ["--accent" as string]: focused.accent }}
    >
      <div className="arc-ambient" aria-hidden />

      <main
        className="arc-stage"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className={`arc-rail ${dragging ? "dragging" : ""}`}
          style={{
            ["--sel" as string]: sel,
            ["--n" as string]: GAMES.length,
            ["--drag" as string]: `${dragPx}px`,
          }}
        >
          {GAMES.map((g, i) => {
            const p = smooth(1 - Math.abs(i - center));
            return (
              <button
                key={g.id}
                className={`arc-card ${i === sel ? "on" : "off"} ${
                  booting && i === sel ? "booting" : ""
                }`}
                style={{
                  ["--p" as string]: p,
                  ["--card-accent" as string]: g.accent,
                }}
                onMouseEnter={() => !booting && setSel(i)}
                onClick={() => {
                  // a drag just happened → ignore the synthetic click
                  if (didDragRef.current) return;
                  if (i === sel) launch(g.id);
                  else setSel(i);
                }}
                aria-label={g.name}
              >
                <img
                  className="arc-cover"
                  src={g.cover}
                  alt={g.name}
                  draggable={false}
                />
                <span className="arc-gloss" aria-hidden />
              </button>
            );
          })}
        </div>

        <div className="arc-meta">
          <h1 className="arc-title">{focused.name}</h1>
          <p className="arc-tag">{focused.tagline}</p>
        </div>
      </main>

      <footer className="arc-hints">
        <span className="arc-hint-key">
          <kbd>&#8592;</kbd>
          <kbd>&#8594;</kbd> Select
        </span>
        <span className="arc-hint-key">
          <kbd>&#8629;</kbd> Start
        </span>
        <span className="arc-hint-key">
          <kbd>Esc</kbd> Exit
        </span>
      </footer>
    </div>
  );
}
