import type { Identity, Meta } from "../../../types/portfolio";
import "./AboutMeSection.css";

/* ───────────────────────── shared helpers ───────────────────────── */

/** Initials for the monogram avatar, e.g. "Siyu An" → "SA". */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Clean the location string: keep the human part before the coordinates.
 *  "Vancouver, BC · 49.28° N, 123.12° W" → "Vancouver, BC" */
function cleanLocation(loc: string): string {
  return loc.split(/\s+[·|]\s+/)[0].trim();
}

/** Turn a bare contact value into a real href. */
function hrefFor(label: string, value: string): string {
  const l = label.toLowerCase();
  if (l.includes("email") || value.includes("@")) return `mailto:${value}`;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

/* ───────────────────────── public entry point ───────────────────────── */

export type AboutVariant = "finder" | "terminal";

/**
 * About Me, rendered for whichever window it lives in.
 *  - variant="finder"   → macOS "About This Mac" panel (default)
 *  - variant="terminal" → `whoami` neofetch-style block
 */
export function AboutMeSection({
  identity,
  meta,
  variant = "finder",
}: {
  identity: Identity;
  meta: Meta;
  variant?: AboutVariant;
}) {
  return variant === "finder" ? (
    <FinderAbout identity={identity} meta={meta} />
  ) : (
    <TerminalAbout identity={identity} meta={meta} />
  );
}

/* ═════════════════════════ FINDER — About This Mac ═════════════════════════ */

function FinderAbout({ identity, meta }: { identity: Identity; meta: Meta }) {
  const links = meta.contactLinks ?? [];
  const location = meta.location ? cleanLocation(meta.location) : "";

  return (
    <div className="ab-root">
      <div className="ab-panel">
        <div className="ab-hero">
          <div className="ab-avatar" aria-hidden>
            {initials(identity.title)}
          </div>
          <h1 className="ab-name">{identity.title}</h1>
          {identity.headline && (
            <p className="ab-headline">{identity.headline}</p>
          )}
          {/* <span className="ab-avail">
            <span className="ab-avail-dot" aria-hidden />
            Open to opportunities
          </span> */}
        </div>

        {identity.tagline && <p className="ab-bio">{identity.tagline}</p>}

        <div className="ab-list" role="table" aria-label="Details">
          {location && (
            <div className="ab-row" role="row">
              <span className="ab-key" role="cell">
                Location
              </span>
              <span className="ab-val" role="cell">
                {location}
              </span>
            </div>
          )}
          {links.map((link) => (
            <a
              key={link.label}
              className="ab-row ab-row-link"
              role="row"
              href={hrefFor(link.label, link.value)}
              target={
                link.label.toLowerCase().includes("email")
                  ? undefined
                  : "_blank"
              }
              rel="noreferrer"
            >
              <span className="ab-key" role="cell">
                {link.label}
              </span>
              <span className="ab-val" role="cell">
                {link.value}
              </span>
              <ChevronIcon />
            </a>
          ))}
          {meta.resumeUrl && (
            <a
              className="ab-row ab-row-link"
              role="row"
              href={meta.resumeUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span className="ab-key" role="cell">
                Résumé
              </span>
              <span className="ab-val" role="cell">
                Open PDF
              </span>
              <ChevronIcon />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg className="ab-chev" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M4.5 2.5 8 6l-3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ═════════════════════════ TERMINAL — whoami ═════════════════════════ */

function TerminalAbout({ identity, meta }: { identity: Identity; meta: Meta }) {
  const links = meta.contactLinks ?? [];
  const location = meta.location ? cleanLocation(meta.location) : "";

  return (
    <div className="ab-term">
      <div className="ab-term-head">
        <span className="ab-term-prompt">siyu@portfolio</span>
        <span className="ab-term-sep">:</span>
        <span className="ab-term-path">~</span>
        <span className="ab-term-sep">$</span>
        <span className="ab-term-cmd"> whoami</span>
      </div>

      <div className="ab-term-body">
        <pre className="ab-term-mono">{initials(identity.title)}</pre>
        <div className="ab-term-info">
          <div className="ab-term-name">{identity.title}</div>
          {identity.headline && (
            <div className="ab-term-role">{identity.headline}</div>
          )}
          <div className="ab-term-rule" />
          {location && (
            <div className="ab-term-line">
              <span className="ab-term-k">Location</span>
              <span className="ab-term-v">{location}</span>
            </div>
          )}
          {links.map((link) => (
            <div className="ab-term-line" key={link.label}>
              <span className="ab-term-k">{link.label}</span>
              <span className="ab-term-v">{link.value}</span>
            </div>
          ))}
        </div>
      </div>

      {identity.tagline && <p className="ab-term-tag">{identity.tagline}</p>}
    </div>
  );
}
