/** Dock / desktop icon for the Arcade app — a glowing neon "A" cabinet marquee
 *  on a dark squircle, tying the Tetris (cyan) and Puyo (magenta) accents. */
export function Icon({ size = 44 }: { size?: number }) {
  const uid = "arcade-icon";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      role="img"
      aria-label="Arcade"
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#221a4a" />
          <stop offset="0.55" stopColor="#141033" />
          <stop offset="1" stopColor="#0a0820" />
        </linearGradient>
        <linearGradient id={`${uid}-a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3fd0ff" />
          <stop offset="1" stopColor="#ff5cc8" />
        </linearGradient>
      </defs>
      <rect
        x="0"
        y="0"
        width="128"
        height="128"
        rx="28.8"
        fill={`url(#${uid}-bg)`}
      />
      <text
        x="64"
        y="90"
        textAnchor="middle"
        fontFamily="Orbitron, system-ui, sans-serif"
        fontWeight="800"
        fontSize="78"
        fill={`url(#${uid}-a)`}
        style={{ filter: "drop-shadow(0 0 8px rgba(120,190,255,0.6))" }}
      >
        A
      </text>
      <rect
        x="26"
        y="30"
        width="76"
        height="18"
        rx="9"
        fill="none"
        stroke="#3fd0ff"
        strokeOpacity="0.6"
        strokeWidth="2"
      />
    </svg>
  );
}
