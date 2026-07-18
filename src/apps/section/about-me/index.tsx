import type { Identity, Meta } from "../../../types/portfolio";

import styles from "./AboutMeSection.module.css";

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
    <div className={styles.abRoot}>
      <div className={styles.abPanel}>
        <div className={styles.abHero}>
          <div className={styles.abAvatar} aria-hidden>
            {initials(identity.title)}
          </div>
          <h1 className={styles.abName}>{identity.title}</h1>
          {identity.headline && (
            <p className={styles.abHeadline}>{identity.headline}</p>
          )}
          {/* <span className={styles.abAvail}>
            <span className={styles.abAvailDot} aria-hidden />
            Open to opportunities
          </span> */}
        </div>

        {identity.tagline && <p className={styles.abBio}>{identity.tagline}</p>}

        <div className={styles.abList} role="table" aria-label="Details">
          {location && (
            <div className={styles.abRow} role="row">
              <span className={styles.abKey} role="cell">
                Location
              </span>
              <span className={styles.abVal} role="cell">
                {location}
              </span>
            </div>
          )}
          {links.map((link) => (
            <a
              key={link.label}
              className={`${styles.abRow} ${styles.abRowLink}`}
              role="row"
              href={hrefFor(link.label, link.value)}
              target={
                link.label.toLowerCase().includes("email")
                  ? undefined
                  : "_blank"
              }
              rel="noreferrer"
            >
              <span className={styles.abKey} role="cell">
                {link.label}
              </span>
              <span className={styles.abVal} role="cell">
                {link.value}
              </span>
              <ChevronIcon />
            </a>
          ))}
          {meta.resumeUrl && (
            <a
              className={`${styles.abRow} ${styles.abRowLink}`}
              role="row"
              href={meta.resumeUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span className={styles.abKey} role="cell">
                Résumé
              </span>
              <span className={styles.abVal} role="cell">
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
    <svg className={styles.abChev} viewBox="0 0 12 12" fill="none" aria-hidden>
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
    <div className={styles.abTerm}>
      <div className={styles.abTermHead}>
        <span className={styles.abTermPrompt}>siyu@portfolio</span>
        <span className={styles.abTermSep}>:</span>
        <span className={styles.abTermPath}>~</span>
        <span className={styles.abTermSep}>$</span>
        <span className={styles.abTermCmd}> whoami</span>
      </div>

      <div className={styles.abTermBody}>
        <pre className={styles.abTermMono}>{initials(identity.title)}</pre>
        <div className={styles.abTermInfo}>
          <div className={styles.abTermName}>{identity.title}</div>
          {identity.headline && (
            <div className={styles.abTermRole}>{identity.headline}</div>
          )}
          <div className={styles.abTermRule} />
          {location && (
            <div className={styles.abTermLine}>
              <span className={styles.abTermK}>Location</span>
              <span className={styles.abTermV}>{location}</span>
            </div>
          )}
          {links.map((link) => (
            <div className={styles.abTermLine} key={link.label}>
              <span className={styles.abTermK}>{link.label}</span>
              <span className={styles.abTermV}>{link.value}</span>
            </div>
          ))}
        </div>
      </div>

      {identity.tagline && (
        <p className={styles.abTermTag}>{identity.tagline}</p>
      )}
    </div>
  );
}
