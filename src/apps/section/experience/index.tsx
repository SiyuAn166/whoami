import { useState } from "react";

import type { ExperienceEntry } from "../../../types/portfolio";

import revealStyles from "../reveal/RevealSection.module.css";
import styles from "./ExperienceSection.module.css";

/* ────────────────────── shared helpers ────────────────────── */
const NS = "siyu";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Human-readable label from a screaming-snake path, e.g.
 *  "/LEAD_ARCHITECT_LAB_01" -> "Lead Architect Lab 01" */
function humanize(name: string): string {
  return name
    .replace(/^\//, "")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseMY(s: string): { m: number; y: number } | null {
  const m = s.match(/(\d{1,2})\/(\d{4})/);
  return m ? { m: +m[1], y: +m[2] } : null;
}

/** kubectl-style AGE from a "MM/YYYY -> MM/YYYY|PRESENT" range, e.g. "1y10mo". */
function ageOf(range: string): string {
  const [a, b = ""] = range.split(/->|–|—/).map((s) => s.trim());
  const start = parseMY(a);
  if (!start) return "—";
  const now = new Date();
  const end =
    /present/i.test(b) || b === ""
      ? { m: now.getMonth() + 1, y: now.getFullYear() }
      : parseMY(b);
  if (!end) return "—";
  let months = (end.y - start.y) * 12 + (end.m - start.m);
  if (months < 1) months = 1;
  const y = Math.floor(months / 12),
    m = months % 12;
  return [y ? `${y}y` : "", m ? `${m}mo` : y ? "" : "0mo"].join("");
}

function fmtPeriod(d: string): string {
  return d.replace(/\s*->\s*/g, " — ").replace(/present/gi, "Present");
}

/* ────────────────────── public entry point ────────────────────── */
export type ExperienceVariant = "finder" | "terminal";

/**
 * Experience, rendered for whichever window it lives in.
 *  - variant="terminal" → `kubectl get roles -n siyu` + `kubectl describe` (default)
 *  - variant="finder"   → macOS Notes/Mail-style list + push-in detail view
 */
export function ExperienceSection({
  entries,
  variant = "terminal",
}: {
  entries: ExperienceEntry[];
  variant?: ExperienceVariant;
}) {
  return variant === "finder" ? (
    <FinderExperience entries={entries} />
  ) : (
    <TerminalExperience entries={entries} />
  );
}

/* ══════════════════════ TERMINAL — kubectl ══════════════════════ */
const KCOL = {
  status: { width: "12ch", flexShrink: 0 } as React.CSSProperties,
  role: {
    flex: 1,
    minWidth: "18ch",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  } as React.CSSProperties,
  age: { width: "8ch", flexShrink: 0 } as React.CSSProperties,
  chev: { width: "2ch", flexShrink: 0 } as React.CSSProperties,
};

function TerminalExperience({ entries }: { entries: ExperienceEntry[] }) {
  const nameCh = Math.max(8, ...entries.map((e) => slugify(e.name).length)) + 2;
  const nameStyle: React.CSSProperties = {
    width: `${nameCh}ch`,
    flexShrink: 0,
  };
  return (
    <section
      className="kube-exp"
      style={{
        fontFamily: "'Consolas', ui-monospace, SFMono-Regular, monospace",
        fontSize: 13,
        overflowX: "auto",
      }}
    >
      <div
        style={{
          color: "var(--fg-dim)",
          marginBottom: 8,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ color: "var(--prompt-user)" }}>➜</span>{" "}
        <span style={{ color: "var(--prompt-path)" }}>~</span>{" "}
        <span style={{ color: "var(--fg)" }}>kubectl get roles -n {NS}</span>
      </div>
      <div style={{ minWidth: "min-content" }}>
        <div
          className="flex"
          style={{
            gap: "2ch",
            padding: "2px 8px",
            color: "var(--fg-dim)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          <span style={nameStyle}>NAME</span>
          <span style={KCOL.status}>STATUS</span>
          <span style={KCOL.role}>ROLE</span>
          <span style={KCOL.age}>AGE</span>
          <span style={KCOL.chev} aria-hidden />
        </div>
        {entries.map((e) => (
          <PodRow key={e.name} entry={e} nameStyle={nameStyle} />
        ))}
      </div>
      <div style={{ color: "var(--fg-dim)", marginTop: 10 }}>
        {entries.length} roles · ▸ click a row to{" "}
        <span style={{ color: "var(--info)" }}>kubectl describe</span>
      </div>
    </section>
  );
}

function PodRow({
  entry,
  nameStyle,
}: {
  entry: ExperienceEntry;
  nameStyle: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const running = !!entry.current;
  const name = slugify(entry.name);
  const status = running ? "Running" : "Completed";
  const statusColor = running ? "var(--ok)" : "var(--fg-dim)";
  const age = ageOf(entry.dateRange ?? entry.timestamp);
  const toggle = () => setOpen((o) => !o);
  return (
    <div>
      <div
        className="flex kube-row"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        style={{ gap: "2ch", padding: "4px 8px", cursor: "pointer" }}
      >
        <span style={{ ...nameStyle, color: "var(--info)" }}>{name}</span>
        <span
          style={{
            ...KCOL.status,
            color: statusColor,
            display: "inline-flex",
            alignItems: "center",
            gap: "0.7ch",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: statusColor,
              display: "inline-block",
              flexShrink: 0,
            }}
            aria-hidden
          />
          {status}
        </span>
        <span style={{ ...KCOL.role, color: "var(--fg)" }}>
          {entry.title ?? "Engineer"}
        </span>
        <span style={{ ...KCOL.age, color: "var(--fg-dim)" }}>{age}</span>
        <span style={{ ...KCOL.chev, color: "var(--fg-dim)" }} aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </div>
      {open && (
        <Describe
          entry={entry}
          name={name}
          status={status}
          statusColor={statusColor}
          age={age}
        />
      )}
    </div>
  );
}

function Describe({
  entry,
  name,
  status,
  statusColor,
  age,
}: {
  entry: ExperienceEntry;
  name: string;
  status: string;
  statusColor: string;
  age: string;
}) {
  const running = !!entry.current;
  const rows: [string, string, string?][] = [
    ["Name", name],
    ["Namespace", NS],
    ["Status", status, statusColor],
    ["Role", entry.title ?? "Engineer"],
    ["Company", entry.company ?? humanize(entry.name)],
    ["Period", fmtPeriod(entry.dateRange ?? entry.timestamp)],
    ["Age", age],
    ["Labels", running ? "current=true,tier=senior" : `current=false`],
  ];
  return (
    <div
      className={revealStyles.revealContent}
      style={{
        margin: "4px 0 14px",
        marginLeft: 8,
        paddingLeft: "2ch",
        borderLeft: "2px solid var(--border-hi)",
      }}
    >
      <div style={{ color: "var(--fg-dim)", marginBottom: 6 }}>
        <span style={{ color: "var(--prompt-user)" }}>$</span> kubectl describe
        role/{name} -n {NS}
      </div>
      {rows.map(([k, v, c]) => (
        <div key={k} className="flex">
          <span
            style={{ width: "13ch", flexShrink: 0, color: "var(--fg-dim)" }}
          >
            {k}:
          </span>
          <span style={{ color: c ?? "var(--fg)", wordBreak: "break-word" }}>
            {v}
          </span>
        </div>
      ))}
      <div style={{ marginTop: 8 }}>
        <span style={{ color: "var(--fg-dim)" }}>Events:</span>
        {(entry.highlights ?? []).map((h, i) => (
          <div
            key={i}
            style={{
              paddingLeft: "2ch",
              color: "var(--fg-dim)",
              lineHeight: 1.6,
            }}
          >
            <span style={{ color: "var(--accent)" }}>• </span>
            {h}
          </div>
        ))}
      </div>
      {entry.researchUrl && (
        <div style={{ marginTop: 6 }}>
          <span
            style={{
              width: "13ch",
              display: "inline-block",
              color: "var(--fg-dim)",
            }}
          >
            Ref:
          </span>
          <a
            href={entry.researchUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{ color: "var(--info)" }}
          >
            publication ↗
          </a>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════ FINDER — Notes/Mail list + detail ══════════════════════ */

/** Two-letter monogram from a screaming-snake name.
 *  "INFOBLOX" -> "IN", "SFU_BIG_DATA_HUB" -> "SB". */
function monogram(name: string): string {
  const parts = name
    .replace(/^\//, "")
    .split(/[_\s-]+/)
    .filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

/** Deterministic hue (0-359) from a name, so each company gets its own
 *  identity color for the app-icon monogram tile. */
function hueOf(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % 360;
}

/** Semantic tone for the monogram tile + status accent:
 *  current role → live (green), has publication → pub (purple), else archived. */
function toneOf(e: ExperienceEntry): "live" | "pub" | "arch" {
  if (e.current) return "live";
  if (e.researchUrl) return "pub";
  return "arch";
}

const TONE_CLASS = {
  live: styles.expTLive,
  pub: styles.expTPub,
  arch: styles.expTArch,
};

function FinderExperience({ entries }: { entries: ExperienceEntry[] }) {
  const [selected, setSelected] = useState<number | null>(null);

  if (selected !== null && entries[selected]) {
    return (
      <ExperienceDetail
        entry={entries[selected]}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <section className={styles.expRoot}>
      <ul className={styles.expList}>
        {entries.map((e, i) => (
          <ExperienceRow key={e.name} entry={e} onOpen={() => setSelected(i)} />
        ))}
      </ul>
    </section>
  );
}

function ExperienceRow({
  entry,
  onOpen,
}: {
  entry: ExperienceEntry;
  onOpen: () => void;
}) {
  const tone = toneOf(entry);
  const title = entry.title ?? humanize(entry.name);
  const company = entry.company ?? humanize(entry.name);
  const period = fmtPeriod(entry.dateRange ?? entry.timestamp);
  const hls = entry.highlights ?? [];
  const summary = hls.slice(0, 2).join(" · ");
  const hlCount = hls.length;
  return (
    <li className={`${styles.expRow} ${TONE_CLASS[tone]}`}>
      <button type="button" className={styles.expRowBtn} onClick={onOpen}>
        <span
          className={styles.expIc}
          style={{ ["--exp-h" as string]: hueOf(entry.name) }}
          aria-hidden
        >
          {monogram(entry.name)}
        </span>
        <span className={styles.expRowMain}>
          <span className={styles.expRowTop}>
            <span className={styles.expRowTitle}>{title}</span>
            <span className={styles.expRowCo}>{company}</span>
            {entry.current && (
              <span className={`${styles.expPill} ${styles.live}`}>
                ● Active
              </span>
            )}
          </span>
          {summary && <span className={styles.expRowSub}>{summary}</span>}
          {hlCount > 0 && (
            <span className={styles.expRowTag}>
              {hlCount} highlight{hlCount > 1 ? "s" : ""}
            </span>
          )}
        </span>
        <span className={styles.expRowMeta}>
          <span className={styles.expRowDate}>{period}</span>
        </span>
        <span className={styles.expChev} aria-hidden>
          ›
        </span>
      </button>
    </li>
  );
}

function ExperienceDetail({
  entry,
  onBack,
}: {
  entry: ExperienceEntry;
  onBack: () => void;
}) {
  const tone = toneOf(entry);
  const title = entry.title ?? humanize(entry.name);
  const company = entry.company ?? humanize(entry.name);
  const period = fmtPeriod(entry.dateRange ?? entry.timestamp);
  const dur = ageOf(entry.dateRange ?? entry.timestamp);
  const pill =
    tone === "live"
      ? { cls: styles.live, label: "● Active" }
      : tone === "pub"
        ? { cls: styles.pub, label: "Publication" }
        : { cls: styles.past, label: "Past" };
  return (
    <section
      className={`${styles.expRoot} ${styles.expDetail} ${TONE_CLASS[tone]}`}
    >
      <button type="button" className={styles.expBack} onClick={onBack}>
        <span className={styles.expBackChev} aria-hidden>
          ‹
        </span>
        Experience
      </button>

      <header className={styles.expHero}>
        <span
          className={`${styles.expIc} ${styles.expHeroIc}`}
          style={{ ["--exp-h" as string]: hueOf(entry.name) }}
          aria-hidden
        >
          {monogram(entry.name)}
        </span>
        <div className={styles.expHeroMeta}>
          <div className={styles.expHeroTitleRow}>
            <h2 className={styles.expHeroTitle}>{title}</h2>
            <span className={`${styles.expPill} ${pill.cls}`}>
              {pill.label}
            </span>
          </div>
          <div className={styles.expHeroCo}>{company}</div>
          <div className={styles.expHeroSub}>
            <span>{period}</span>
            <span className={styles.expHeroDot} aria-hidden>
              ·
            </span>
            <span>{dur}</span>
          </div>
        </div>
      </header>

      {entry.highlights?.length ? (
        <div className={styles.expBlock}>
          <div className={styles.expSectLabel}>Highlights</div>
          <ul className={styles.expHlList}>
            {entry.highlights.map((h, i) => (
              <li key={i} className={styles.expHl}>
                <span className={styles.expHlB} aria-hidden />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {(entry.url || entry.researchUrl) && (
        <div className={styles.expActions}>
          {entry.url && (
            <a
              className={styles.expOpen}
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open ↗
            </a>
          )}
          {entry.researchUrl && (
            <a
              className={`${styles.expOpen} ${styles.ghost}`}
              href={entry.researchUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Publication ↗
            </a>
          )}
        </div>
      )}
    </section>
  );
}
