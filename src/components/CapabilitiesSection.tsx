import type { Skill } from '../types';

function getStatus(level: number): string {
    if (level >= 90) return 'expert';
    if (level >= 80) return 'advanced';
    if (level >= 70) return 'proficient';
    if (level >= 60) return 'working';
    return 'learning';
}

function getVersion(level: number): string {
    return `v${Math.floor(level / 10)}.${level % 10}`;
}

function hexId(i: number): string {
    return `0x${(i + 1).toString(16).toUpperCase().padStart(2, '0')}`;
}

interface CapabilitiesSectionProps {
    skills: Skill[];
}

export function CapabilitiesSection({ skills }: CapabilitiesSectionProps) {
    return (
        <section>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl">
                {skills.map((skill, i) => (
                    <div
                        key={skill.name}
                        className="group rounded-md border border-[var(--border)] bg-[var(--bg-elev)] p-3 flex flex-col gap-2 transition-colors hover:border-[var(--border-hi)]"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <span className="text-[13px] text-[var(--fg)] leading-tight">
                                {skill.name}
                            </span>
                            <span
                                className="shrink-0 rounded px-1.5 py-0.5 text-[10px] text-[var(--fg-dim)] bg-[var(--fg-faint)]"
                                aria-hidden="true"
                            >
                                {hexId(i)}
                            </span>
                        </div>

                        <div
                            className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--fg-faint)]"
                            role="progressbar"
                            aria-label={`${skill.name} proficiency`}
                            aria-valuenow={skill.level}
                            aria-valuemin={0}
                            aria-valuemax={100}
                        >
                            <div
                                className="h-full rounded-full bg-[var(--accent)]"
                                style={{ width: `${skill.level}%` }}
                            />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-[var(--fg-dim)]">
                            <span>{getStatus(skill.level)}</span>
                            <span>{getVersion(skill.level)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
