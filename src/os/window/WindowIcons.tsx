/** Close icon — the × shown inside the red traffic light on hover */
export function CloseIcon({ size = 8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" aria-hidden>
      <path
        d="M2.5 2.5L7.5 7.5M7.5 2.5L2.5 7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Minimize icon — the – shown inside the yellow traffic light on hover */
export function MinimizeIcon({ size = 8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" aria-hidden>
      <path
        d="M2 5H8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Zoom icon — the two diagonal corner arrows shown inside the green traffic light on hover */
export function ZoomIcon({ size = 8, maximized = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" aria-hidden>
      {maximized ? (
        <>
          <polygon points="0,5 5,0 5,5" fill="currentColor" />
          <polygon points="10,5 5,10 5,5" fill="currentColor" />
        </>
      ) : (
        <>
          <polygon points="1.5,1.5 6.5,1.5 1.5,6.5" fill="currentColor" />
          <polygon points="8,8 3,8 8,3" fill="currentColor" />
        </>
      )}
    </svg>
  );
}
