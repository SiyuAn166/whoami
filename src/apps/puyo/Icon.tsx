/** Dock / launcher icon for the Puyo app — glossy puyo blobs in a recessed
 * well on a magenta-navy squircle, matching the Tetris icon's construction. */
export function Icon({ size = 44 }: { size?: number }) {
  const uid = "puyo-icon";
  const COLORS: Record<string, [string, string]> = {
    red: ["#ea7676", "#e23b3b"],
    green: ["#81d276", "#3fca4e"],
    blue: ["#6c9ae9", "#3f6ee8"],
    yellow: ["#f8d65d", "#f2c31a"],
    purple: ["#be80e8", "#a24be0"],
  };
  const BLOBS: { x: number; y: number; c: keyof typeof COLORS }[] = [
    { x: 47, y: 44, c: "red" },
    { x: 40, y: 64, c: "green" },
    { x: 60, y: 64, c: "blue" },
    { x: 47, y: 84, c: "yellow" },
    { x: 67, y: 84, c: "purple" },
  ];
  const R = 9.5;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      role="img"
      aria-label="Puyo"
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#3a2668" />
          <stop offset="0.55" stopColor="#231a45" />
          <stop offset="1" stopColor="#15122f" />
        </linearGradient>
        <linearGradient id={`${uid}-well`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a1236" />
          <stop offset="1" stopColor="#0b0922" />
        </linearGradient>
        {Object.entries(COLORS).map(([k, [light, base]]) => (
          <radialGradient key={k} id={`${uid}-${k}`} cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor={light} />
            <stop offset="1" stopColor={base} />
          </radialGradient>
        ))}
        <clipPath id={`${uid}-clip`}>
          <rect x="0" y="0" width="128" height="128" rx="28.8" />
        </clipPath>
      </defs>
      <rect
        x="0"
        y="0"
        width="128"
        height="128"
        rx="28.8"
        fill={`url(#${uid}-bg)`}
      />
      <g clipPath={`url(#${uid}-clip)`}>
        <rect
          x="28"
          y="26"
          width="72"
          height="76"
          rx="7"
          fill={`url(#${uid}-well)`}
          stroke="#c04bd0"
          strokeOpacity="0.45"
          strokeWidth="1"
        />
        {BLOBS.map(({ x, y, c }, i) => (
          <g key={i}>
            <circle
              cx={x}
              cy={y}
              r={R}
              fill={`url(#${uid}-${c})`}
              stroke="rgba(0,0,0,0.35)"
              strokeWidth="0.8"
            />
            <ellipse
              cx={x - R * 0.32}
              cy={y - R * 0.4}
              rx={R * 0.3}
              ry={R * 0.18}
              fill="#ffffff"
              opacity="0.6"
            />
          </g>
        ))}
      </g>
    </svg>
  );
}
