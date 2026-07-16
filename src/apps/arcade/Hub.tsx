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

export function Hub({ onClose }: { onClose?: () => void }) {
  const [view, setView] = useState<string>("hub");
  const [sel, setSel] = useState(0);
  const [booting, setBooting] = useState(false);

  const launch = useCallback((id: string) => {
    setBooting(true);
    window.setTimeout(() => {
      setView(id);
      setBooting(false);
    }, 460);
  }, []);

  // Touch: horizontal swipe moves selection (tap is handled by the cards'
  // onClick — tapping a neighbour selects it, tapping the focused one launches).
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current || booting) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) setSel((sn) => Math.min(GAMES.length - 1, sn + 1));
      else setSel((sn) => Math.max(0, sn - 1));
    }
    touchStart.current = null;
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

  return (
    <div
      className="arc-home"
      style={{ ["--accent" as string]: focused.accent }}
    >
      <div className="arc-ambient" aria-hidden />

      <main
        className="arc-stage"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="arc-rail"
          style={{
            ["--sel" as string]: sel,
            ["--n" as string]: GAMES.length,
          }}
        >
          {GAMES.map((g, i) => {
            const d = i - sel;
            return (
              <button
                key={g.id}
                className={`arc-card ${i === sel ? "on" : "off"} ${
                  booting && i === sel ? "booting" : ""
                }`}
                style={{
                  ["--d" as string]: d,
                  ["--card-accent" as string]: g.accent,
                }}
                onMouseEnter={() => !booting && setSel(i)}
                onClick={() => (i === sel ? launch(g.id) : setSel(i))}
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
        {/* <span className="arc-hint-touch">Swipe &middot; Tap to play</span> */}
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
