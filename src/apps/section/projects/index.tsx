import { useState } from "react";
import type { Project } from "../../../types/portfolio";
import revealStyles from "../reveal/RevealSection.module.css";
import styles from "./ProjectSection.module.css";

/* ───────────────────────── shared ───────────────────────── */

const NS = "siyu";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "var(--ok)",
  STABLE: "var(--info)",
  BETA: "var(--warn)",
  WIP: "var(--warn)",
  ARCHIVED: "var(--fg-dim)",
};
const statusColor = (s: string) => STATUS_COLORS[s] ?? "var(--fg-dim)";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type ProjectsVariant = "finder" | "terminal";

export function ProjectSection({
  projects,
  variant = "terminal",
}: {
  projects: Project[];
  variant?: ProjectsVariant;
}) {
  return variant === "finder" ? (
    <FinderProjects projects={projects} />
  ) : (
    <TerminalProjects projects={projects} />
  );
}

/* ═════════════════════════ TERMINAL — kubectl ═════════════════════════ */

const PCOL = {
  status: { width: "12ch", flexShrink: 0 } as React.CSSProperties,
  version: { width: "10ch", flexShrink: 0 } as React.CSSProperties,
  tags: {
    flex: 1,
    minWidth: "16ch",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  } as React.CSSProperties,
  chev: { width: "2ch", flexShrink: 0 } as React.CSSProperties,
};

function TerminalProjects({ projects }: { projects: Project[] }) {
  const nameCh =
    Math.max(8, ...projects.map((p) => slugify(p.name).length)) + 2;
  const nameStyle: React.CSSProperties = {
    width: `${nameCh}ch`,
    flexShrink: 0,
  };

  return (
    <section
      className="kube-exp"
      style={{
        fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
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
        <span style={{ color: "var(--fg)" }}>kubectl get projects -n {NS}</span>
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
          <span style={PCOL.status}>STATUS</span>
          <span style={PCOL.version}>VERSION</span>
          <span style={PCOL.tags}>TAGS</span>
          <span style={PCOL.chev} aria-hidden />
        </div>
        {projects.map((p) => (
          <ProjRow key={p.name} project={p} nameStyle={nameStyle} />
        ))}
      </div>

      <div style={{ color: "var(--fg-dim)", marginTop: 10 }}>
        {projects.length} projects · ▸ click a row to{" "}
        <span style={{ color: "var(--info)" }}>kubectl describe</span>
      </div>
    </section>
  );
}

function ProjRow({
  project,
  nameStyle,
}: {
  project: Project;
  nameStyle: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const name = slugify(project.name);
  const color = statusColor(project.status);
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
            ...PCOL.status,
            color,
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
              background: color,
              display: "inline-block",
              flexShrink: 0,
            }}
            aria-hidden
          />
          {project.status}
        </span>
        <span style={{ ...PCOL.version, color: "var(--fg-dim)" }}>
          {project.version}
        </span>
        <span style={{ ...PCOL.tags, color: "var(--fg)" }}>
          {project.tags.join(", ")}
        </span>
        <span style={{ ...PCOL.chev, color: "var(--fg-dim)" }} aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </div>
      {open && <ProjDescribe project={project} name={name} color={color} />}
    </div>
  );
}

function ProjDescribe({
  project,
  name,
  color,
}: {
  project: Project;
  name: string;
  color: string;
}) {
  const rows: [string, string, string?][] = [
    ["Name", name],
    ["Namespace", NS],
    ["Status", project.status, color],
    ["Version", project.version],
    ["License", project.license ?? "UNLICENSED"],
    ["Tags", project.tags.join(", ")],
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
        project/{name} -n {NS}
      </div>
      {rows.map(([k, v, c]) => (
        <div key={k} className="flex">
          <span
            style={{ width: "12ch", flexShrink: 0, color: "var(--fg-dim)" }}
          >
            {k}:
          </span>
          <span style={{ color: c ?? "var(--fg)", wordBreak: "break-word" }}>
            {v}
          </span>
        </div>
      ))}
      <div style={{ marginTop: 8 }}>
        <span style={{ color: "var(--fg-dim)" }}>Description:</span>
        <div
          style={{
            paddingLeft: "2ch",
            color: "var(--fg-dim)",
            lineHeight: 1.6,
          }}
        >
          {project.description}
        </div>
      </div>
      {project.url && (
        <div style={{ marginTop: 6 }}>
          <span
            style={{
              width: "12ch",
              display: "inline-block",
              color: "var(--fg-dim)",
            }}
          >
            URL:
          </span>
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{ color: "var(--info)" }}
          >
            {project.url} ↗
          </a>
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════ FINDER — stacked list ═════════════════════════ */

function clean(s: string): string {
  return s.replace(/_/g, " ");
}

/** Two-letter monogram from a project name, e.g. GOARC_MCP → GM */
function monogram(name: string): string {
  const parts = name.split(/[_\s]+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

/** map a project status to a scoped status class (macOS system colour) */
const STATUS_CLASS: Record<string, string | undefined> = {
  active: styles.pjStActive,
  stable: styles.pjStStable,
  beta: styles.pjStBeta,
  wip: styles.pjStWip,
  archived: styles.pjStArchived,
};
function statusClass(status: string): string {
  const key = status.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return STATUS_CLASS[key] ?? "";
}

function ChevronIcon() {
  return (
    <svg
      className={styles.pjChev}
      width="7"
      height="12"
      viewBox="0 0 7 12"
      fill="none"
      aria-hidden
    >
      <path
        d="M1 1l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FinderProjects({ projects }: { projects: Project[] }) {
  return (
    <section className={styles.pjRoot}>
      <ul className={styles.pjStack}>
        {projects.map((p) => {
          const row = (
            <>
              <div className={`${styles.pjIco} ${statusClass(p.status)}`}>
                {monogram(p.name)}
              </div>
              <div className={styles.pjMid}>
                <div className={styles.pjName}>
                  {clean(p.name)}
                  <span className={styles.pjVer}>{p.version}</span>
                  <span className={`${styles.pjPill} ${statusClass(p.status)}`}>
                    {p.status}
                  </span>
                </div>
                <div className={styles.pjDesc}>{p.description}</div>
                {p.tags?.length ? (
                  <div className={styles.pjTags}>
                    {p.tags.map((t) => (
                      <span className={styles.pjTag} key={t}>
                        {clean(t)}
                      </span>
                    ))}
                  </div>
                ) : null}
                {p.license && (
                  <div className={styles.pjFoot}>
                    <span className={styles.pjLic}>{clean(p.license)}</span>
                  </div>
                )}
              </div>
              {p.url ? (
                <ChevronIcon />
              ) : (
                <span className={styles.pjChevSpacer} />
              )}
            </>
          );
          return (
            <li key={p.name} className={styles.pjRow}>
              {p.url ? (
                <a
                  className={styles.pjLink}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${clean(p.name)}`}
                >
                  {row}
                </a>
              ) : (
                <div className={`${styles.pjLink} ${styles.pjLinkStatic}`}>
                  {row}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
