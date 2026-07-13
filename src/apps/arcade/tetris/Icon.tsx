/** Dock / launcher icon for the Tetris app — style 04: glossy block stack in a recessed well on a navy squircle. */
export function Icon({ size = 44 }: { size?: number }) {
  const uid = "tetris-icon";

  // Tetromino palette: [base, highlight, shadow]
  const COLORS: Record<string, [string, string, string]> = {
    blue: ["#2e6fe0", "#6c9ae9", "#1b4082"],
    green: ["#4cbf3b", "#81d276", "#2c6f22"],
    purple: ["#a34ade", "#be80e8", "#5e2b81"],
    red: ["#e23b3b", "#ea7676", "#832222"],
    orange: ["#f5921f", "#f8b362", "#8e5512"],
    yellow: ["#f5c518", "#f8d65d", "#8e720e"],
    cyan: ["#26c4e6", "#67d6ed", "#167285"],
  };

  // Stacked cells inside the well (5 columns, resting on the floor)
  const BLOCKS: { x: number; y: number; c: keyof typeof COLORS }[] = [
    { x: 35.6, y: 85.6, c: "blue" },
    { x: 35.6, y: 74.0, c: "blue" },
    { x: 47.2, y: 85.6, c: "green" },
    { x: 47.2, y: 74.0, c: "green" },
    { x: 47.2, y: 62.4, c: "purple" },
    { x: 58.8, y: 85.6, c: "red" },
    { x: 58.8, y: 74.0, c: "red" },
    { x: 70.4, y: 85.6, c: "orange" },
    { x: 70.4, y: 74.0, c: "orange" },
    { x: 70.4, y: 62.4, c: "yellow" },
    { x: 82.0, y: 85.6, c: "cyan" },
  ];
  const CELL = 10.4;
  const RX = 2.2;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      role="img"
      aria-label="Tetris"
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#2e3668" />
          <stop offset="0.55" stopColor="#1a1f45" />
          <stop offset="1" stopColor="#12162f" />
        </linearGradient>
        <linearGradient id={`${uid}-well`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141636" />
          <stop offset="1" stopColor="#090b22" />
        </linearGradient>
        <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${uid}-inner`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000000" stopOpacity="0.55" />
          <stop offset="0.42" stopColor="#000000" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="0.5" cy="0.1" r="0.7">
          <stop offset="0" stopColor="#4a63c8" stopOpacity="0.35" />
          <stop offset="1" stopColor="#4a63c8" stopOpacity="0" />
        </radialGradient>
        {Object.entries(COLORS).map(([k, [base, light]]) => (
          <linearGradient
            key={k}
            id={`${uid}-${k}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0" stopColor={light} />
            <stop offset="1" stopColor={base} />
          </linearGradient>
        ))}
        <clipPath id={`${uid}-clip`}>
          <rect x="0" y="0" width="128" height="128" rx="28.8" />
        </clipPath>
        <clipPath id={`${uid}-wellclip`}>
          <rect x="28" y="26" width="72" height="76" rx="7" />
        </clipPath>
      </defs>

      {/* squircle background */}
      <rect
        x="0"
        y="0"
        width="128"
        height="128"
        rx="28.8"
        fill={`url(#${uid}-bg)`}
      />

      <g clipPath={`url(#${uid}-clip)`}>
        {/* ambient top glow + material sheen */}
        <rect x="0" y="0" width="128" height="128" fill={`url(#${uid}-glow)`} />
        <rect
          x="1"
          y="1"
          width="126"
          height="60"
          rx="27.8"
          fill={`url(#${uid}-sheen)`}
        />

        {/* recessed play-field well */}
        <rect
          x="28"
          y="26"
          width="72"
          height="76"
          rx="7"
          fill={`url(#${uid}-well)`}
          stroke="#3f63c0"
          strokeOpacity="0.45"
          strokeWidth="1"
        />

        <g clipPath={`url(#${uid}-wellclip)`}>
          {/* inner top shadow (recess depth) */}
          <rect
            x="28"
            y="26"
            width="72"
            height="40"
            fill={`url(#${uid}-inner)`}
          />

          {/* stacked tetromino cells */}
          {BLOCKS.map(({ x, y, c }, i) => {
            const [, , shadow] = COLORS[c];
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={CELL}
                  height={CELL}
                  rx={RX}
                  fill={`url(#${uid}-${c})`}
                  stroke={shadow}
                  strokeWidth="0.6"
                />
                <rect
                  x={x + 1.1}
                  y={y + 1.0}
                  width={CELL - 2.2}
                  height={CELL * 0.42}
                  rx="1.4"
                  fill="#ffffff"
                  opacity="0.28"
                />
              </g>
            );
          })}
        </g>

        {/* bright bottom lip of the well */}
        <rect
          x="28.5"
          y="99.5"
          width="71"
          height="2"
          rx="1"
          fill="#5b7bd8"
          opacity="0.35"
        />
      </g>
    </svg>
  );
}
