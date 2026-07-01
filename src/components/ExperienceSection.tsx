import { useState } from 'react';
import type { ExperienceEntry } from '../types';

function slugify(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
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
    const end = /present/i.test(b) || b === '' ? { m: now.getMonth() + 1, y: now.getFullYear() } : parseMY(b);
    if (!end) return '—';
    let months = (end.y - start.y) * 12 + (end.m - start.m);
    if (months < 1) months = 1;
    const y = Math.floor(months / 12), m = months % 12;
    return [y ? `${y}y` : '', m ? `${m}mo` : (y ? '' : '0mo')].join('');
}

function fmtPeriod(d: string): string {
    return d.replace(/\s*->\s*/g, ' — ').replace(/present/gi, 'present');
}

const COL = {
    role: { flex: 1, minWidth: '15ch', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as React.CSSProperties,
    status: { width: '12ch', flexShrink: 0 } as React.CSSProperties,
    age: { width: '8ch', flexShrink: 0 } as React.CSSProperties,
    chev: { width: '2ch', flexShrink: 0 } as React.CSSProperties,
};

export function ExperienceSection({ entries }: { entries: ExperienceEntry[] }) {
    // Size the NAME column to the longest pod name so rows align and nothing clips.
    const nameCh = Math.max(8, ...entries.map(e => slugify(e.name).length)) + 2;
    const nameStyle: React.CSSProperties = { width: `${nameCh}ch`, flexShrink: 0 };

    return (
        <section className="text-[13px]" style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 'min-content' }}>
                {/* header row */}
                <div
                    className="flex"
                    style={{ gap: '2ch', padding: '2px 8px', color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}
                >
                    <span style={nameStyle}>NAME</span>
                    <span style={COL.role}>ROLE</span>
                    <span style={COL.status}>STATUS</span>
                    <span style={COL.age}>AGE</span>
                    <span style={COL.chev} aria-hidden />
                </div>

                {entries.map(entry => <PodRow key={entry.name} entry={entry} nameStyle={nameStyle} />)}
            </div>

            <div style={{ color: 'var(--fg-dim)', marginTop: 10 }}>
                {entries.length} roles · ▸ click a row to <span style={{ color: 'var(--info)' }}>kubectl describe</span>
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
                <span style={{ ...COL.role, color: 'var(--fg)' }}>{entry.title ?? 'Engineer'}</span>
                <span style={{ ...COL.status, color: statusColor, display: 'inline-flex', alignItems: 'center', gap: '0.7ch' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, display: 'inline-block', flexShrink: 0 }} aria-hidden />
                    {status}
                </span>
                <span style={{ ...COL.age, color: 'var(--fg-dim)' }}>{age}</span>
                <span style={{ ...COL.chev, color: 'var(--fg-dim)' }} aria-hidden>{open ? '▾' : '▸'}</span>
            </div>

            {open && <Describe entry={entry} name={name} status={status} statusColor={statusColor} age={age} />}
        </div>
    );
}

function Describe({ entry, name, status, statusColor, age }: {
    entry: ExperienceEntry; name: string; status: string; statusColor: string; age: string;
}) {
    const rows: [string, string, string?][] = [
        ['Name', name],
        ['Status', status, statusColor],
        ['Role', entry.title ?? 'Engineer'],
        ['Company', entry.company ?? entry.name],
        ['Period', fmtPeriod(entry.dateRange ?? entry.timestamp)],
        ['Age', age],
    ];
    return (
        <div style={{ margin: '4px 0 14px', marginLeft: '8px', paddingLeft: '2ch', borderLeft: '2px solid var(--border-hi)' }}>
            <div style={{ color: 'var(--fg-dim)', marginBottom: 6 }}>
                <span style={{ color: 'var(--prompt-user)' }}>$</span> kubectl describe role/{name}
            </div>
            {rows.map(([k, v, c]) => (
                <div key={k} className="flex">
                    <span style={{ width: '11ch', flexShrink: 0, color: 'var(--fg-dim)' }}>{k}:</span>
                    <span style={{ color: c ?? 'var(--fg)', wordBreak: 'break-word' }}>{v}</span>
                </div>
            ))}

            <div style={{ marginTop: 8 }}>
                <span style={{ color: 'var(--fg-dim)' }}>Highlights:</span>
                {(entry.highlights ?? []).map((h, i) => (
                    <div key={i} style={{ paddingLeft: '2ch', color: 'var(--fg-dim)', lineHeight: 1.6 }}>
                        <span style={{ color: 'var(--accent)' }}>• </span>{h}
                    </div>
                ))}
            </div>

            {entry.researchUrl && (
                <div style={{ marginTop: 6 }}>
                    <span style={{ color: 'var(--fg-dim)' }}>Ref:        </span>
                    <a
                        href={entry.researchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ color: 'var(--info)' }}
                    >
                        publication ↗
                    </a>
                </div>
            )}
        </div>
    );
}
