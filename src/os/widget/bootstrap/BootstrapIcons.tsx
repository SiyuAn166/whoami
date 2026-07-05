/** Cursor / arrow icon — "right click". */
export function CursorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 3.5 18 11l-5.4 1.3L15 18l-2.2 1-2.4-5.7L5 17V3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Dock / squares icon — "open apps". */
export function DockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="9"
        width="5"
        height="5"
        rx="1.4"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x="9.5"
        y="9"
        width="5"
        height="5"
        rx="1.4"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x="16"
        y="9"
        width="5"
        height="5"
        rx="1.4"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

/** Drag / move icon — "move & resize". */
export function DragIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4v16M4 12h16M12 4 9.4 6.6M12 4l2.6 2.6M12 20l-2.6-2.6M12 20l2.6-2.6M4 12l2.6-2.6M4 12l2.6 2.6M20 12l-2.6-2.6M20 12l-2.6 2.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
