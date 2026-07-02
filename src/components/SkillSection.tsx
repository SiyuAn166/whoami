import type { Skill } from '../types';

/* ───────────────────────── shared ───────────────────────── */

const NS = 'siyu';

function getStatus(level: number): string {
  if (level >= 90) return 'expert';
  if (level >= 80) return 'advanced';
  if (level >= 70) return 'proficient';
  if (level >= 60) return 'working';
  return 'learning';
}
function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const STATUS_COLORS: Record<string, string> = {
  expert: 'var(--ok)',
  advanced: 'var(--info)',
  proficient: 'var(--magenta)',
  working: 'var(--warn)',
  learning: 'var(--fg-dim)',
};

interface CapabilitiesSectionProps {
  skills: Skill[];
  variant?: 'finder' | 'terminal';
}

export function CapabilitiesSection({ skills, variant = 'terminal' }: CapabilitiesSectionProps) {
  return variant === 'finder'
    ? <FinderSkills skills={skills} />
    : <TerminalSkills skills={skills} />;
}

/* ═════════════════════════ TERMINAL — kubectl ═════════════════════════ */

const SCOL = {
  status: { width: '13ch', flexShrink: 0 } as React.CSSProperties,
  proficiency: { flex: 1, minWidth: '20ch' } as React.CSSProperties,
};

function bar(level: number): string {
  const filled = Math.max(0, Math.min(10, Math.round(level / 10)));
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

function TerminalSkills({ skills }: { skills: Skill[] }) {
  const nameCh = Math.max(8, ...skills.map(s => slugify(s.name).length)) + 2;
  const nameStyle: React.CSSProperties = { width: `${nameCh}ch`, flexShrink: 0 };

  return (
    <section
      className="kube-exp"
      style={{ fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace", fontSize: 13, overflowX: 'auto' }}
    >
      <div style={{ color: 'var(--fg-dim)', marginBottom: 8, whiteSpace: 'nowrap' }}>
        <span style={{ color: 'var(--prompt-user)' }}>➜</span>{' '}
        <span style={{ color: 'var(--prompt-path)' }}>~</span>{' '}
        <span style={{ color: 'var(--fg)' }}>kubectl get skills -n {NS}</span>
      </div>

      <div style={{ minWidth: 'min-content' }}>
        <div className="flex" style={{ gap: '2ch', padding: '2px 8px', color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span style={nameStyle}>NAME</span>
          <span style={SCOL.status}>STATUS</span>
          <span style={SCOL.proficiency}>PROFICIENCY</span>
        </div>

        {skills.map(s => {
          const status = getStatus(s.level);
          const color = STATUS_COLORS[status];
          return (
            <div key={s.name} className="flex kube-row" style={{ gap: '2ch', padding: '4px 8px' }}>
              <span style={{ ...nameStyle, color: 'var(--info)' }}>{slugify(s.name)}</span>
              <span style={{ ...SCOL.status, color }}>{status}</span>
              <span style={{ ...SCOL.proficiency, whiteSpace: 'nowrap' }}>
                <span style={{ color }}>{bar(s.level)}</span>
                <span style={{ color: 'var(--fg-dim)' }}> {s.level}%</span>
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ color: 'var(--fg-dim)', marginTop: 10 }}>{skills.length} skills</div>
    </section>
  );
}

/* ═════════════════════════ FINDER — widget tiles ═════════════════════════ */

const TIER_OF = (level: number): { label: string; color: string } => {
  const st = getStatus(level);
  return { label: st, color: STATUS_COLORS[st] };
};

function FinderSkills({ skills }: { skills: Skill[] }) {
  return (
    <section className="wg-wrap">
      <div className="wg-grid">
        {skills.map(s => {
          const tier = TIER_OF(s.level);
          const label = s.name.replace(/_/g, ' ');
          const initial = s.name.replace(/[^A-Za-z0-9]/g, '').charAt(0).toUpperCase();
          return (
            <div className="wg-tile" key={s.name} style={{ ['--tier' as string]: tier.color }}>
              <div className="wg-head">
                <span className="wg-ico" style={{ background: tier.color }} aria-hidden>{initial}</span>
                <div className="wg-headtext">
                  <div className="wg-name" title={label}>{label}</div>
                  <div className="wg-meta">
                    <span className="wg-tier" style={{ color: tier.color }}>{tier.label}</span>
                    <span className="wg-dot" aria-hidden>·</span>
                    <span className="wg-pct">{s.level}%</span>
                  </div>
                </div>
              </div>
              <div className="wg-meter" role="progressbar" aria-valuenow={s.level} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
                <span
                  className="wg-fill"
                  style={{ width: `${s.level}%`, ['--target-width' as string]: `${s.level}%`, background: tier.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
