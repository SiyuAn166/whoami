import { useState } from 'react';
import type { ExperienceEntry } from '../types';

/* ───────────────────────── shared helpers ───────────────────────── */

const NS = 'siyu';

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Human-readable label from a screaming-snake path, e.g.
 *  "/LEAD_ARCHITECT_LAB_01" -> "Lead Architect Lab 01" */
function humanize(name: string): string {
  return name
    .replace(/^\//, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function parseMY(s: string): { m: number; y: number } | null {
  const m = s.match(/(\d{1,2})\/(\d{4})/);
  return m ? { m: +m[1], y: +m[2] } : null;
}

/** kubectl-style AGE from a "MM/YYYY -> MM/YYYY|PRESENT" range, e.g. "1y10mo". */
function ageOf(range: string): string {
  const [a, b = ''] = range.split(/->|–|—/).map(s => s.trim());
  const start = parseMY(a);
  if (!start) return '—';
  const now = new Date();
  const end = /present/i.test(b) || b === ''
    ? { m: now.getMonth() + 1, y: now.getFullYear() }
    : parseMY(b);
  if (!end) return '—';
  let months = (end.y - start.y) * 12 + (end.m - start.m);
  if (months < 1) months = 1;
  const y = Math.floor(months / 12), m = months % 12;
  return [y ? `${y}y` : '', m ? `${m}mo` : (y ? '' : '0mo')].join('');
}

function fmtPeriod(d: string): string {
  return d.replace(/\s*->\s*/g, ' — ').replace(/present/gi, 'Present');
}

/* ───────────────────────── public entry point ───────────────────────── */

export type ExperienceVariant = 'finder' | 'terminal';

/**
 * Experience, rendered for whichever window it lives in.
 *  - variant="terminal" → `kubectl get roles -n siyu` + `kubectl describe` (default)
 *  - variant="finder"   → macOS Finder column (Miller) view
 */
export function ExperienceSection({
  entries,
  variant = 'terminal',
}: {
  entries: ExperienceEntry[];
  variant?: ExperienceVariant;
}) {
  return variant === 'finder'
    ? <FinderExperience entries={entries} />
    : <TerminalExperience entries={entries} />;
}

/* ═════════════════════════ TERMINAL — kubectl ═════════════════════════ */

const KCOL = {
  status: { width: '12ch', flexShrink: 0 } as React.CSSProperties,
  role: { flex: 1, minWidth: '18ch', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as React.CSSProperties,
  age: { width: '8ch', flexShrink: 0 } as React.CSSProperties,
  chev: { width: '2ch', flexShrink: 0 } as React.CSSProperties,
};

function TerminalExperience({ entries }: { entries: ExperienceEntry[] }) {
  const nameCh = Math.max(8, ...entries.map(e => slugify(e.name).length)) + 2;
  const nameStyle: React.CSSProperties = { width: `${nameCh}ch`, flexShrink: 0 };

  return (
    <section
      className="kube-exp"
      style={{
        fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
        fontSize: 13,
        overflowX: 'auto',
      }}
    >
      <div style={{ color: 'var(--fg-dim)', marginBottom: 8, whiteSpace: 'nowrap' }}>
        <span style={{ color: 'var(--prompt-user)' }}>➜</span>{' '}
        <span style={{ color: 'var(--prompt-path)' }}>~</span>{' '}
        <span style={{ color: 'var(--fg)' }}>kubectl get roles -n {NS}</span>
      </div>

      <div style={{ minWidth: 'min-content' }}>
        {/* header row */}
        <div
          className="flex"
          style={{ gap: '2ch', padding: '2px 8px', color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}
        >
          <span style={nameStyle}>NAME</span>
          <span style={KCOL.status}>STATUS</span>
          <span style={KCOL.role}>ROLE</span>
          <span style={KCOL.age}>AGE</span>
          <span style={KCOL.chev} aria-hidden />
        </div>
        {entries.map(e => <PodRow key={e.name} entry={e} nameStyle={nameStyle} />)}
      </div>

      <div style={{ color: 'var(--fg-dim)', marginTop: 10 }}>
        {entries.length} roles · ▸ click a row to{' '}
        <span style={{ color: 'var(--info)' }}>kubectl describe</span>
      </div>
    </section>
  );
}

function PodRow({ entry, nameStyle }: { entry: ExperienceEntry; nameStyle: React.CSSProperties }) {
  const [open, setOpen] = useState(false);
  const running = !!entry.current;
  const name = slugify(entry.name);
  const status = running ? 'Running' : 'Completed';
  const statusColor = running ? 'var(--ok)' : 'var(--fg-dim)';
  const age = ageOf(entry.dateRange ?? entry.timestamp);
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
        <span style={{ ...KCOL.status, color: statusColor, display: 'inline-flex', alignItems: 'center', gap: '0.7ch' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, display: 'inline-block', flexShrink: 0 }} aria-hidden />
          {status}
        </span>
        <span style={{ ...KCOL.role, color: 'var(--fg)' }}>{entry.title ?? 'Engineer'}</span>
        <span style={{ ...KCOL.age, color: 'var(--fg-dim)' }}>{age}</span>
        <span style={{ ...KCOL.chev, color: 'var(--fg-dim)' }} aria-hidden>{open ? '▾' : '▸'}</span>
      </div>
      {open && <Describe entry={entry} name={name} status={status} statusColor={statusColor} age={age} />}
    </div>
  );
}

function Describe({ entry, name, status, statusColor, age }: {
  entry: ExperienceEntry; name: string; status: string; statusColor: string; age: string;
}) {
  const running = !!entry.current;
  const rows: [string, string, string?][] = [
    ['Name', name],
    ['Namespace', NS],
    ['Status', status, statusColor],
    ['Role', entry.title ?? 'Engineer'],
    ['Company', entry.company ?? humanize(entry.name)],
    ['Period', fmtPeriod(entry.dateRange ?? entry.timestamp)],
    ['Age', age],
    ['Labels', running ? 'current=true,tier=senior' : `current=false`],
  ];

  return (
    <div className="reveal-content" style={{ margin: '4px 0 14px', marginLeft: 8, paddingLeft: '2ch', borderLeft: '2px solid var(--border-hi)' }}>
      <div style={{ color: 'var(--fg-dim)', marginBottom: 6 }}>
        <span style={{ color: 'var(--prompt-user)' }}>$</span> kubectl describe role/{name} -n {NS}
      </div>
      {rows.map(([k, v, c]) => (
        <div key={k} className="flex">
          <span style={{ width: '13ch', flexShrink: 0, color: 'var(--fg-dim)' }}>{k}:</span>
          <span style={{ color: c ?? 'var(--fg)', wordBreak: 'break-word' }}>{v}</span>
        </div>
      ))}
      <div style={{ marginTop: 8 }}>
        <span style={{ color: 'var(--fg-dim)' }}>Events:</span>
        {(entry.highlights ?? []).map((h, i) => (
          <div key={i} style={{ paddingLeft: '2ch', color: 'var(--fg-dim)', lineHeight: 1.6 }}>
            <span style={{ color: 'var(--accent)' }}>• </span>{h}
          </div>
        ))}
      </div>
      {entry.researchUrl && (
        <div style={{ marginTop: 6 }}>
          <span style={{ width: '13ch', display: 'inline-block', color: 'var(--fg-dim)' }}>Ref:</span>
          <a href={entry.researchUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: 'var(--info)' }}>publication ↗</a>
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════ FINDER — Miller columns ═════════════════════════ */

function FolderIcon({ tone }: { tone: 'live' | 'open' | 'dim' }) {
  const fill = tone === 'live' ? 'var(--ok)' : tone === 'open' ? 'var(--info)' : 'var(--fg-dim)';
  return (
    <svg className="finder-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 6.6A2.6 2.6 0 0 1 4.6 4h3.9c.66 0 1.29.27 1.74.75L11.6 6h7.8A2.6 2.6 0 0 1 22 8.6v8.8A2.6 2.6 0 0 1 19.4 20H4.6A2.6 2.6 0 0 1 2 17.4V6.6Z"
        fill={fill}
      />
      <path d="M2 8.4h20v.2A2.6 2.6 0 0 1 19.4 11H4.6A2.6 2.6 0 0 1 2 8.6v-.2Z" fill="#000" opacity="0.10" />
    </svg>
  );
}

function FinderExperience({ entries }: { entries: ExperienceEntry[] }) {
  const initial = entries.findIndex(e => e.current);
  const [sel, setSel] = useState(initial === -1 ? 0 : initial);
  const active = entries[sel];

  return (
    <section className="finder-miller">
      {/* ── left column: role folders ── */}
      <div className="miller-col" role="listbox" aria-label="Experience">
        {entries.map((e, i) => (
          <button
            key={e.name}
            type="button"
            role="option"
            aria-selected={i === sel}
            className={`miller-item${i === sel ? ' is-sel' : ''}`}
            onClick={() => setSel(i)}
          >
            <FolderIcon tone={e.current ? 'live' : i === sel ? 'open' : 'dim'} />
            <span className="miller-name">{e.title ?? humanize(e.name)}</span>
            {e.current && <span className="miller-live" title="Current role" aria-hidden />}
            <span className="miller-chev" aria-hidden>›</span>
          </button>
        ))}
      </div>

      {/* ── right column: detail, slides in on change ── */}
      <div className="miller-detail" key={active.name} aria-live="polite">
        <FinderDetail entry={active} />
      </div>
    </section>
  );
}

function FinderDetail({ entry }: { entry: ExperienceEntry }) {
  const running = !!entry.current;
  const meta: [string, string][] = [
    ['Company', entry.company ?? humanize(entry.name)],
    ['Period', fmtPeriod(entry.dateRange ?? entry.timestamp)],
    ['Duration', ageOf(entry.dateRange ?? entry.timestamp)],
    ['Kind', running ? 'Active Role' : 'Archived Role'],
    ['Owner', entry.owner],
    ['Size', entry.size],
  ];

  return (
    <>
      <div className="miller-hero">
        <div className="miller-hero-icon"><FolderIcon tone={running ? 'live' : 'open'} /></div>
        <div>
          <div className="miller-hero-title">{entry.title ?? humanize(entry.name)}</div>
          <span className={`miller-badge${running ? ' is-live' : ''}`}>{running ? '● Active' : 'Archived'}</span>
        </div>
      </div>

      <dl className="miller-meta">
        {meta.map(([k, v]) => (
          <div key={k} className="miller-meta-row">
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      {entry.highlights?.length ? (
        <div className="miller-hl">
          <div className="miller-hl-title">Highlights</div>
          {entry.highlights.map((h, i) => (
            <div key={i} className="miller-hl-item"><span aria-hidden>›</span>{h}</div>
          ))}
        </div>
      ) : null}

      {(entry.url || entry.researchUrl) && (
        <div className="miller-actions">
          {entry.url && <a className="miller-open" href={entry.url} target="_blank" rel="noopener noreferrer">Open ↗</a>}
          {entry.researchUrl && <a className="miller-open ghost" href={entry.researchUrl} target="_blank" rel="noopener noreferrer">Publication ↗</a>}
        </div>
      )}
    </>
  );
}
