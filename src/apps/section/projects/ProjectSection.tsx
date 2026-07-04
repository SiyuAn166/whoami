import { useState } from "react";
import type { Project } from "../../../types/portfolio";
import "./ProjectSection.css";

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
      className="reveal-content"
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
function statusClass(status: string): string {
  return "pj-st-" + status.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function ChevronIcon() {
  return (
    <svg
      className="pj-chev"
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
    <section className="pj-root">
      <ul className="pj-stack">
        {projects.map((p) => {
          const row = (
            <>
              <div className={`pj-ico ${statusClass(p.status)}`}>
                {monogram(p.name)}
              </div>
              <div className="pj-mid">
                <div className="pj-name">
                  {clean(p.name)}
                  <span className="pj-ver">{p.version}</span>
                  <span className={`pj-pill ${statusClass(p.status)}`}>
                    {p.status}
                  </span>
                </div>
                <div className="pj-desc">{p.description}</div>
                {p.tags?.length ? (
                  <div className="pj-tags">
                    {p.tags.map((t) => (
                      <span className="pj-tag" key={t}>
                        {clean(t)}
                      </span>
                    ))}
                  </div>
                ) : null}
                {p.license && (
                  <div className="pj-foot">
                    <span className="pj-lic">{clean(p.license)}</span>
                  </div>
                )}
              </div>
              {p.url ? <ChevronIcon /> : <span className="pj-chev-spacer" />}
            </>
          );
          return (
            <li key={p.name} className="pj-row">
              {p.url ? (
                <a
                  className="pj-link"
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${clean(p.name)}`}
                >
                  {row}
                </a>
              ) : (
                <div className="pj-link pj-link--static">{row}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
