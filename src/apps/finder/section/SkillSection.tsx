import type { CSSProperties } from 'react';
import '../../../styles/skills.css';
import type { Skill } from '../../../types/portfolio';

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

interface SkillSectionProps {
  skills: Skill[];
  variant?: 'finder' | 'terminal';
}

export function SkillSection({ skills, variant = 'terminal' }: SkillSectionProps) {
  return variant === 'finder'
    ? <FinderSkills skills={skills} />
    : <TerminalSkills skills={skills} />;
}

/* ═════════════════════════ TERMINAL — kubectl ═════════════════════════ */

const SCOL = {
  status: { width: '13ch', flexShrink: 0 } as CSSProperties,
  proficiency: { flex: 1, minWidth: '20ch' } as CSSProperties,
};

function bar(level: number): string {
  const filled = Math.max(0, Math.min(10, Math.round(level / 10)));
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

function TerminalSkills({ skills }: { skills: Skill[] }) {
  const nameCh = Math.max(8, ...skills.map(s => slugify(s.name).length)) + 2;
  const nameStyle: CSSProperties = { width: `${nameCh}ch`, flexShrink: 0 };

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

/* ═════════════════════════ FINDER — ring gauge cards ═════════════════════════
   One considered design: each skill is a horizontal card with a native-feeling
   circular proficiency ring (percentage in the center, tier-tinted) beside a
   name-first text column. The ring is the hero signal; the monogram tints the
   whole card via --tier. Rings animate in on mount.
   ============================================================================ */

const R = 19;                     // ring radius
const C = 2 * Math.PI * R;        // circumference ≈ 119.38

function FinderSkills({ skills }: { skills: Skill[] }) {
  return (
    <section className="sg-wrap">
      <div className="sg-grid">
        {skills.map(s => {
          const st = getStatus(s.level);
          const color = STATUS_COLORS[st];
          const label = s.name.replace(/_/g, ' ');
          const initial = s.name.replace(/[^A-Za-z0-9]/g, '').charAt(0).toUpperCase();
          const offset = C * (1 - Math.max(0, Math.min(100, s.level)) / 100);
          return (
            <div className="sg-card" key={s.name} style={{ ['--tier' as string]: color }}>
              <div
                className="sg-ring"
                role="progressbar"
                aria-valuenow={s.level}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={label}
              >
                <svg width="52" height="52" viewBox="0 0 52 52">
                  <circle className="sg-track" cx="26" cy="26" r={R} />
                  <circle
                    className="sg-prog"
                    cx="26" cy="26" r={R}
                    style={{
                      strokeDasharray: C,
                      strokeDashoffset: offset,
                      ['--sg-c' as string]: `${C}`,
                      ['--sg-off' as string]: `${offset}`,
                    }}
                  />
                </svg>
                <span className="sg-pct">{s.level}</span>
              </div>

              <div className="sg-text">
                <div className="sg-name" title={label}>
                  <span className="sg-mono" aria-hidden>{initial}</span>
                  <span className="sg-label">{label}</span>
                </div>
                <span className="sg-tier">{st}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* Back-compat alias for any existing imports. */
export const CapabilitiesSection = SkillSection;
