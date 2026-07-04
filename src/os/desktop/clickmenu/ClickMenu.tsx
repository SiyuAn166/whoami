// src/os/desktop/clickmenu/ClickMenu.tsx
// Generic, presentational macOS-style context menu. No widget knowledge here.
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import "./ClickMenu.css";

export interface ClickMenuItem {
  /** use '---' for a separator */
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  onSelect?: () => void;
}

interface Props {
  x: number;
  y: number;
  items: ClickMenuItem[];
  onClose: () => void;
}

export function ClickMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // Start off-screen invisible, then clamp to the real measured size on mount.
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPos({
      left: Math.min(x, window.innerWidth - width - 8),
      top: Math.min(y, window.innerHeight - height - 8),
    });
  }, [x, y, items.length]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="clickmenu"
      style={{
        left: pos?.left ?? x,
        top: pos?.top ?? y,
        visibility: pos ? "visible" : "hidden",
      }}
      role="menu"
    >
      {items.map((it, i) =>
        it.label === "---" ? (
          <div className="clickmenu__sep" key={i} />
        ) : (
          <div
            key={i}
            role="menuitem"
            className={`clickmenu__item${it.disabled ? " is-disabled" : ""}`}
            onClick={() => {
              if (it.disabled) return;
              it.onSelect?.();
              onClose();
            }}
          >
            <span className="clickmenu__icon">{it.icon}</span>
            <span className="clickmenu__label">{it.label}</span>
            {it.shortcut && (
              <span className="clickmenu__shortcut">{it.shortcut}</span>
            )}
          </div>
        ),
      )}
    </div>
  );
}
