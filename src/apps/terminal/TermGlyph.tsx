/** Full-bleed Terminal.app-style icon used by the Dock and Desktop. */
export function TermGlyph() {
    return (
        <svg width="90%" height="90%" viewBox="0 0 48 48" aria-hidden>
            <rect x="0.5" y="0.5" width="47" height="47" rx="11" fill="#1d1d1f" stroke="rgba(255,255,255,0.14)" />
            <circle cx="9" cy="9" r="2" fill="#ff5f57" />
            <circle cx="16" cy="9" r="2" fill="#febc2e" />
            <circle cx="23" cy="9" r="2" fill="#28c840" />
            <polyline points="11,21 18,28 11,35" fill="none" stroke="#28c840" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="22" y1="35" x2="34" y2="35" stroke="#e6e6e6" strokeWidth="3" strokeLinecap="round" />
        </svg>
    );
}
