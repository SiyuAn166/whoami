import { useState, useEffect } from 'react';
import type { Project } from '../types';

/* ───────────────────────── shared ───────────────────────── */

const NS = 'siyu';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'var(--ok)',
  STABLE: 'var(--info)',
  BETA: 'var(--warn)',
  WIP: 'var(--warn)',
  ARCHIVED: 'var(--fg-dim)',
};
const statusColor = (s: string) => STATUS_COLORS[s] ?? 'var(--fg-dim)';

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Deterministic hue from a string, for per-project icon tint. */
function hueOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

/** 1–2 letter monogram from a SCREAMING_SNAKE / spaced name. */
function initials(name: string): string {
  const parts = name.replace(/[^A-Za-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] ?? '?').slice(0, 2).toUpperCase();
}

export type ProjectsVariant = 'finder' | 'terminal';

export function ProjectsSection({
  projects,
  variant = 'terminal',
}: {
  projects: Project[];
  variant?: ProjectsVariant;
}) {
  return variant === 'finder'
    ? <FinderProjects projects={projects} />
    : <TerminalProjects projects={projects} />;
}

/* ═════════════════════════ TERMINAL — kubectl ═════════════════════════ */

const PCOL = {
  status: { width: '12ch', flexShrink: 0 } as React.CSSProperties,
  version: { width: '10ch', flexShrink: 0 } as React.CSSProperties,
  tags: { flex: 1, minWidth: '16ch', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as React.CSSProperties,
  chev: { width: '2ch', flexShrink: 0 } as React.CSSProperties,
};

function TerminalProjects({ projects }: { projects: Project[] }) {
  const nameCh = Math.max(8, ...projects.map(p => slugify(p.name).length)) + 2;
  const nameStyle: React.CSSProperties = { width: `${nameCh}ch`, flexShrink: 0 };

  return (
    <section
      className="kube-exp"
      style={{ fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace", fontSize: 13, overflowX: 'auto' }}
    >
      <div style={{ color: 'var(--fg-dim)', marginBottom: 8, whiteSpace: 'nowrap' }}>
        <span style={{ color: 'var(--prompt-user)' }}>➜</span>{' '}
        <span style={{ color: 'var(--prompt-path)' }}>~</span>{' '}
        <span style={{ color: 'var(--fg)' }}>kubectl get projects -n {NS}</span>
      </div>

      <div style={{ minWidth: 'min-content' }}>
        <div className="flex" style={{ gap: '2ch', padding: '2px 8px', color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span style={nameStyle}>NAME</span>
          <span style={PCOL.status}>STATUS</span>
          <span style={PCOL.version}>VERSION</span>
          <span style={PCOL.tags}>TAGS</span>
          <span style={PCOL.chev} aria-hidden />
        </div>
        {projects.map(p => <ProjRow key={p.name} project={p} nameStyle={nameStyle} />)}
      </div>

      <div style={{ color: 'var(--fg-dim)', marginTop: 10 }}>
        {projects.length} projects · ▸ click a row to <span style={{ color: 'var(--info)' }}>kubectl describe</span>
      </div>
    </section>
  );
}

function ProjRow({ project, nameStyle }: { project: Project; nameStyle: React.CSSProperties }) {
  const [open, setOpen] = useState(false);
  const name = slugify(project.name);
  const color = statusColor(project.status);
  const toggle = () => setOpen(o => !o);

  return (
    <div>
      <div
        className="flex kube-row"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}
        style={{ gap: '2ch', padding: '4px 8px', cursor: 'pointer' }}
      >
        <span style={{ ...nameStyle, color: 'var(--info)' }}>{name}</span>
        <span style={{ ...PCOL.status, color, display: 'inline-flex', alignItems: 'center', gap: '0.7ch' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} aria-hidden />
          {project.status}
        </span>
        <span style={{ ...PCOL.version, color: 'var(--fg-dim)' }}>{project.version}</span>
        <span style={{ ...PCOL.tags, color: 'var(--fg)' }}>{project.tags.join(', ')}</span>
        <span style={{ ...PCOL.chev, color: 'var(--fg-dim)' }} aria-hidden>{open ? '▾' : '▸'}</span>
      </div>
      {open && <ProjDescribe project={project} name={name} color={color} />}
    </div>
  );
}

function ProjDescribe({ project, name, color }: { project: Project; name: string; color: string }) {
  const rows: [string, string, string?][] = [
    ['Name', name],
    ['Namespace', NS],
    ['Status', project.status, color],
    ['Version', project.version],
    ['License', project.license ?? 'UNLICENSED'],
    ['Tags', project.tags.join(', ')],
  ];
  return (
    <div className="reveal-content" style={{ margin: '4px 0 14px', marginLeft: 8, paddingLeft: '2ch', borderLeft: '2px solid var(--border-hi)' }}>
      <div style={{ color: 'var(--fg-dim)', marginBottom: 6 }}>
        <span style={{ color: 'var(--prompt-user)' }}>$</span> kubectl describe project/{name} -n {NS}
      </div>
      {rows.map(([k, v, c]) => (
        <div key={k} className="flex">
          <span style={{ width: '12ch', flexShrink: 0, color: 'var(--fg-dim)' }}>{k}:</span>
          <span style={{ color: c ?? 'var(--fg)', wordBreak: 'break-word' }}>{v}</span>
        </div>
      ))}
      <div style={{ marginTop: 8 }}>
        <span style={{ color: 'var(--fg-dim)' }}>Description:</span>
        <div style={{ paddingLeft: '2ch', color: 'var(--fg-dim)', lineHeight: 1.6 }}>{project.description}</div>
      </div>
      {project.url && (
        <div style={{ marginTop: 6 }}>
          <span style={{ width: '12ch', display: 'inline-block', color: 'var(--fg-dim)' }}>URL:</span>
          <a href={project.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: 'var(--info)' }}>{project.url} ↗</a>
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════ FINDER — Launchpad + Quick Look ═════════════════════════ */

function AppIcon({ project, size = 60 }: { project: Project; size?: number }) {
  const h = hueOf(project.name);
  const bg = `linear-gradient(150deg, hsl(${h} 70% 58%), hsl(${(h + 40) % 360} 68% 46%))`;
  return (
    <span className="lp-icon" style={{ width: size, height: size, background: bg, borderRadius: size * 0.23, fontSize: size * 0.36 }}>
      {initials(project.name)}
      <span className="lp-icon-badge" style={{ background: statusColor(project.status) }} aria-hidden />
    </span>
  );
}

function FinderProjects({ projects }: { projects: Project[] }) {
  const [sel, setSel] = useState<Project | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSel(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <section className="lp-wrap">
      <div className="lp-grid">
        {projects.map(p => (
          <button key={p.name} type="button" className="lp-item" onClick={() => setSel(p)}>
            <AppIcon project={p} />
            <span className="lp-name">{p.name.replace(/_/g, ' ')}</span>
            <span className="lp-version">{p.version}</span>
          </button>
        ))}
      </div>

      {sel && <QuickLook project={sel} onClose={() => setSel(null)} />}
    </section>
  );
}

function QuickLook({ project, onClose }: { project: Project; onClose: () => void }) {
  return (
    <div className="ql-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={project.name}>
      <div className="ql-card" onClick={e => e.stopPropagation()}>
        <button className="ql-close" onClick={onClose} aria-label="Close">×</button>
        <div className="ql-hero">
          <AppIcon project={project} size={72} />
          <div>
            <div className="ql-title">{project.name.replace(/_/g, ' ')}</div>
            <div className="ql-sub">
              <span>{project.version}</span>
              <span className="ql-badge" style={{ color: statusColor(project.status), borderColor: statusColor(project.status) }}>
                ● {project.status}
              </span>
            </div>
          </div>
        </div>

        <p className="ql-desc">{project.description}</p>

        <div className="ql-tags">
          {project.tags.map(t => <span key={t} className="ql-tag">{t}</span>)}
          {project.license && <span className="ql-tag ql-tag-license">{project.license}</span>}
        </div>

        {project.url && (
          <div className="ql-actions">
            <a className="ql-open" href={project.url} target="_blank" rel="noopener noreferrer">Open ↗</a>
          </div>
        )}
      </div>
    </div>
  );
}
