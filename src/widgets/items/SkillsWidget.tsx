import type { CSSProperties } from 'react';
import type { WidgetDefinition, WidgetRenderContext } from '../types';

const R = 20;
const C = 2 * Math.PI * R;

function ring(level: number): CSSProperties {
  return { strokeDasharray: `${C}`, strokeDashoffset: `${C * (1 - level / 100)}` };
}

function SkillsContent({ ctx }: { ctx: WidgetRenderContext }) {
  const top = [...ctx.data.skills].sort((a, b) => b.level - a.level).slice(0, 3);
  return (
    <div className="wgt-skills">
      {top.map(s => (
        <div className="wgt-skill" key={s.name}>
          <svg className="wgt-ring" viewBox="0 0 48 48" width="48" height="48">
            <circle className="wgt-ring-bg" cx="24" cy="24" r={R} />
            <circle className="wgt-ring-fg" cx="24" cy="24" r={R} style={ring(s.level)} />
            <text className="wgt-ring-num" x="24" y="24" dominantBaseline="central" textAnchor="middle">
              {s.level}
            </text>
          </svg>
          <span className="wgt-skill-name" title={s.name}>
            {s.name.replace(/_/g, ' ')}
          </span>
        </div>
      ))}
    </div>
  );
}

export const skillsWidget: WidgetDefinition = {
  id: 'skills',
  size: 'medium',
  variant: 'glass',
  title: 'Top Skills',
  order: 20,
  defaultPos: { x: 18, y: 320 },
  enabled: ctx => ctx.data.skills.length > 0,
  onActivate: ctx => ctx.openApp('finder'),
  render: ctx => <SkillsContent ctx={ctx} />,
};
