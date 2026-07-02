export function PreviewGlyph() {
  return (
    <svg width="90%" height="90%" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" aria-label="Preview" role="img">
      <defs>
        <linearGradient id="pv-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#eaf1fb" />
          <stop offset="1" stopColor="#97cae6" />
        </linearGradient>
        <linearGradient id="pv-page" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f4f6f9" />
        </linearGradient>
        <linearGradient id="pv-header" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5ac8fa" />
          <stop offset="1" stopColor="#2a7fff" />
        </linearGradient>
        <linearGradient id="pv-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fdfdfe" />
          <stop offset="0.5" stopColor="#c7cdd8" />
          <stop offset="1" stopColor="#9aa2b1" />
        </linearGradient>
        <linearGradient id="pv-handle" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9aa2b1" />
          <stop offset="1" stopColor="#5b6472" />
        </linearGradient>
        <radialGradient id="pv-glass" cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#eaf6ff" stopOpacity="0.9" />
          <stop offset="0.6" stopColor="#bfe0ff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#7fb4ff" stopOpacity="0.35" />
        </radialGradient>
        <filter id="pv-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#1c2740" floodOpacity="0.22" />
        </filter>
        <filter id="pv-loupe-shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="4" dy="8" stdDeviation="10" floodColor="#1c2740" floodOpacity="0.30" />
        </filter>
        <filter id="pv-app-shadow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#1d51b9" floodOpacity="0.28" />
        </filter>
        <clipPath id="pv-squircle">
          <rect x="16" y="16" width="480" height="480" rx="112" ry="112" />
        </clipPath>
      </defs>

      {/* App squircle */}
      <g filter="url(#pv-app-shadow)">
        <rect x="16" y="16" width="480" height="480" rx="112" ry="112" fill="url(#pv-bg)" />
      </g>
      <rect x="16" y="16" width="480" height="480" rx="112" ry="112" fill="none" stroke="#7d90b3" strokeOpacity="0.45" strokeWidth="1.5" />
      <rect x="17.5" y="17.5" width="477" height="477" rx="110.5" ry="110.5" fill="none" stroke="#ffffff" strokeOpacity="0.65" strokeWidth="1.5" />

      <g clipPath="url(#pv-squircle)">
        {/* Résumé page */}
        <g filter="url(#pv-shadow)">
          <rect x="132" y="96" width="214" height="300" rx="16" fill="url(#pv-page)" stroke="#dfe3ea" strokeWidth="1.5" />
        </g>

        {/* Header band + avatar */}
        <path d="M132 112 a16 16 0 0 1 16 -16 h182 a16 16 0 0 1 16 16 v56 h-214 z" fill="url(#pv-header)" />
        <circle cx="176" cy="140" r="20" fill="#ffffff" fillOpacity="0.95" />
        <circle cx="176" cy="133" r="7" fill="#2a7fff" />
        <path d="M164 152 a12 10 0 0 1 24 0 z" fill="#2a7fff" />
        <rect x="210" y="128" width="104" height="9" rx="4.5" fill="#ffffff" fillOpacity="0.95" />
        <rect x="210" y="146" width="70" height="7" rx="3.5" fill="#ffffff" fillOpacity="0.7" />

        {/* Body text lines */}
        <g fill="#d7dce4">
          <rect x="156" y="196" width="166" height="8" rx="4" />
          <rect x="156" y="216" width="140" height="8" rx="4" />
          <rect x="156" y="236" width="166" height="8" rx="4" />
          <rect x="156" y="266" width="96" height="8" rx="4" />
        </g>
        {/* Skill bars */}
        <rect x="156" y="296" width="166" height="10" rx="5" fill="#eceff4" />
        <rect x="156" y="296" width="120" height="10" rx="5" fill="#34c759" />
        <rect x="156" y="318" width="166" height="10" rx="5" fill="#eceff4" />
        <rect x="156" y="318" width="86" height="10" rx="5" fill="#5ac8fa" />
        <rect x="156" y="340" width="166" height="10" rx="5" fill="#eceff4" />
        <rect x="156" y="340" width="150" height="10" rx="5" fill="#ff9f0a" />
      </g>

      {/* Magnifying loupe */}
      <g filter="url(#pv-loupe-shadow)">
        {/* Handle */}
        <rect x="356" y="356" width="44" height="150" rx="22" transform="rotate(-45 378 431)" fill="url(#pv-handle)" />
        {/* Ring */}
        <circle cx="322" cy="322" r="96" fill="url(#pv-ring)" />
        <circle cx="322" cy="322" r="72" fill="#f2f5f9" />
        <circle cx="322" cy="322" r="72" fill="url(#pv-glass)" />
        {/* Glass shine */}
        <path d="M280 292 a68 68 0 0 1 60 -34" fill="none" stroke="#ffffff" strokeOpacity="0.85" strokeWidth="10" strokeLinecap="round" />
      </g>
    </svg>
  );
}
