/** Dock / launcher icon for the Puyo app — glossy aqua puyo blobs in a
 * recessed well on a magenta-navy squircle. Signature-compatible with the
 * previous Icon: <Icon size={n} />. */
export function Icon({ size = 44 }: { size?: number }) {
  const uid = "puyo-aqua-icon";
  const COLORS: Record<string, [string, string]> = {
    aqua: ["#9df6ff", "#33c9e6"],
    teal: ["#7ff0d4", "#25b89b"],
    blue: ["#7fc0ff", "#3f78e8"],
    cyan: ["#a6fbff", "#39d3d8"],
    deep: ["#7fa8ff", "#3f5ee0"],
  };
  const BLOBS: { x: number; y: number; c: keyof typeof COLORS }[] = [
    { x: 47, y: 44, c: "aqua" },
    { x: 40, y: 64, c: "teal" },
    { x: 60, y: 64, c: "blue" },
    { x: 47, y: 84, c: "cyan" },
    { x: 67, y: 84, c: "deep" },
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
          <stop offset="0" stopColor="#1e2f68" />
          <stop offset="0.55" stopColor="#152047" />
          <stop offset="1" stopColor="#0d1330" />
        </linearGradient>
        <linearGradient id={`${uid}-well`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f1a3c" />
          <stop offset="1" stopColor="#070d24" />
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
          stroke="#4bd0e0"
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
              stroke="rgba(0,0,0,0.3)"
              strokeWidth="0.8"
            />
            <ellipse
              cx={x - R * 0.32}
              cy={y - R * 0.4}
              rx={R * 0.32}
              ry={R * 0.2}
              fill="#ffffff"
              opacity="0.7"
            />
          </g>
        ))}
      </g>
    </svg>
  );
}
