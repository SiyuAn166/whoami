import type { WidgetDefinition, WidgetRenderContext } from '../types';

interface Link { label: string; href: string; glyph: string; }

function normalize(label: string, value: string): string {
  const l = label.toLowerCase();
  if (l.includes('email') || value.includes('@')) return `mailto:${value.replace(/^mailto:/, '')}`;
  return /^https?:\/\//.test(value) ? value : `https://${value}`;
}

function glyphFor(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('email')) return '✉';
  if (l.includes('linkedin')) return 'in';
  if (l.includes('git')) return '⌥';
  return '↗';
}

function buildLinks(ctx: WidgetRenderContext): Link[] {
  const links: Link[] = [];
  for (const c of ctx.data.meta.contactLinks ?? []) {
    links.push({ label: c.label, href: normalize(c.label, c.value), glyph: glyphFor(c.label) });
  }
  // GitHub often lives in meta.commands.social, e.g. "→  github.com/SiyuAn166"
  const social = ctx.data.meta.commands?.social;
  if (social && /github\.com\/\S+/i.test(social) && !links.some(x => x.label.toLowerCase().includes('git'))) {
    const url = social.match(/github\.com\/\S+/i)![0];
    links.push({ label: 'GitHub', href: `https://${url}`, glyph: '⌥' });
  }
  return links;
}

function ContactContent({ ctx }: { ctx: WidgetRenderContext }) {
  const links = buildLinks(ctx);
  return (
    <div className="wgt-contact">
      {links.map(l => (
        <a className="wgt-contact-link" key={l.label} href={l.href} target="_blank" rel="noreferrer" title={l.label}>
          <span className="wgt-contact-glyph" aria-hidden>{l.glyph}</span>
          <span className="wgt-contact-label">{l.label}</span>
        </a>
      ))}
    </div>
  );
}

export const contactWidget: WidgetDefinition = {
  id: 'contact',
  size: 'small',
  variant: 'glass',
  title: "Let's Connect",
  order: 40,
  defaultPos: { x: 120, y: 0 },
  defaultAnchor: 'right',
  enabled: ctx => buildLinks(ctx).length > 0,
  render: ctx => <ContactContent ctx={ctx} />,
};
