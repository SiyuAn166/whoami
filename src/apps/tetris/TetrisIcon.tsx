/** Dock / launcher icon for the Tetris app — white T-piece (pointing up) on brand-red. */
export function TetrisIcon({ size = 44 }: { size?: number }) {
  const uid = "tetris-icon";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      role="img"
      aria-label="Tetris"
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e53931" />
          <stop offset="1" stopColor="#be1d16" />
        </linearGradient>
        <filter id={`${uid}-sh`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow
            dx="0"
            dy="2.3"
            stdDeviation="2.82"
            floodColor="#000000"
            floodOpacity="0.28"
          />
        </filter>
      </defs>
      <rect
        x="0"
        y="0"
        width="128"
        height="128"
        rx="28.8"
        fill={`url(#${uid}-bg)`}
      />
      <g filter={`url(#${uid}-sh)`}>
        {/* top single (stem points up) */}
        <rect
          x="54.02"
          y="42.92"
          width="19.97"
          height="19.97"
          rx="4.44"
          fill="#fff"
        />
        {/* bottom row of three */}
        <rect
          x="31.83"
          y="65.11"
          width="19.97"
          height="19.97"
          rx="4.44"
          fill="#fff"
        />
        <rect
          x="54.02"
          y="65.11"
          width="19.97"
          height="19.97"
          rx="4.44"
          fill="#fff"
        />
        <rect
          x="76.20"
          y="65.11"
          width="19.97"
          height="19.97"
          rx="4.44"
          fill="#fff"
        />
      </g>
    </svg>
  );
}
