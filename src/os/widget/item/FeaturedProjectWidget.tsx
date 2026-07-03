import type { WidgetDefinition, WidgetRenderContext } from '../types';
import './FeaturedProjectWidget.css';

function FeaturedContent({ ctx }: { ctx: WidgetRenderContext }) {
  const p = ctx.data.projects[0];
  return (
    <div className="wgt-featured">
      <div className="wgt-featured-top">
        <span className="wgt-featured-name">{p.name.replace(/_/g, ' ')}</span>
        <span className="wgt-featured-status" data-status={p.status.toLowerCase()}>
          {p.status}
        </span>
      </div>
      <p className="wgt-featured-desc">{p.description}</p>
      <div className="wgt-featured-tags">
        {p.tags.slice(0, 3).map(t => (
          <span className="wgt-tag" key={t}>{t.replace(/_/g, ' ')}</span>
        ))}
      </div>
      <div className="wgt-featured-cta">{p.version} · {ctx.data.projects[0].url ? 'Open ↗' : 'Details'}</div>
    </div>
  );
}

export const featuredProjectWidget: WidgetDefinition = {
  id: 'featured',
  size: 'wide',
  variant: 'glass',
  title: 'Featured Project',
  order: 30,
  defaultPos: { x: 240, y: 60 },
  defaultAnchor: 'left',
  enabled: ctx => ctx.data.projects.length > 0,
  href: ctx => ctx.data.projects[0]?.url,
  onActivate: ctx => ctx.openApp('finder'),
  render: ctx => <FeaturedContent ctx={ctx} />,
};
