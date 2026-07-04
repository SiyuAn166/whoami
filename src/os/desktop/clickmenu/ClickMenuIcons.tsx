// src/os/desktop/clickmenu/ClickMenuIcons.tsx
// SF-Symbols-style stroke icons for the desktop right-click menu.
// All use currentColor so they follow the menu text colour (light/dark).

export function AddWidgetsIcon() {
  // three rounded squares (top-left, top-right, bottom-left) + a "+" in the
  // bottom-right cell.
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect
        x="2"
        y="2"
        width="5"
        height="5"
        rx="1.4"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <rect
        x="9"
        y="2"
        width="5"
        height="5"
        rx="1.4"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <rect
        x="2"
        y="9"
        width="5"
        height="5"
        rx="1.4"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M11.5 9.6v3.8M9.6 11.5h3.8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AppearanceIcon() {
  // half-filled circle (◐) — the classic macOS appearance / dark-mode toggle.
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 2 A6 6 0 0 0 8 14 Z" fill="currentColor" />
    </svg>
  );
}

export function RemoveIcon() {
  // minus inside a circle.
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M5.2 8h5.6"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
