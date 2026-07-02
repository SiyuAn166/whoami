import type { ReactNode } from 'react';
import type { WidgetDefinition, WidgetRenderContext } from '../types';

type IconKind = 'email' | 'linkedin' | 'github' | 'link';

interface Link {
  label: string;
  href: string;
  icon: IconKind;
}

function normalize(label: string, value: string): string {
  const l = label.toLowerCase();
  if (l.includes('email') || value.includes('@')) return `mailto:${value.replace(/^mailto:/, '')}`;
  return /^https?:\/\//.test(value) ? value : `https://${value}`;
}

function iconFor(label: string): IconKind {
  const l = label.toLowerCase();
  if (l.includes('email') || l.includes('mail')) return 'email';
  if (l.includes('linkedin')) return 'linkedin';
  if (l.includes('git')) return 'github';
  return 'link';
}

/** Brand + custom marks, drawn with currentColor so they follow the theme text token. */
function Icon({ kind }: { kind: IconKind }): ReactNode {
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true } as const;
  switch (kind) {
    case 'github':
      return (
        <svg {...common}>
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg {...common}>
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
        </svg>
      );
    case 'email':
      return (
        <svg {...common}>
          <path d="M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6zm2 .5v.34l8 4.8 8-4.8V6.5a.5.5 0 0 0-.5-.5h-15a.5.5 0 0 0-.5.5zm16 2.18-7.74 4.64a.5.5 0 0 1-.52 0L4 8.68V17.5a.5.5 0 0 0 .5.5h15a.5.5 0 0 0 .5-.5V8.68z" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M10.6 13.4a4 4 0 0 0 5.66 0l3-3a4 4 0 1 0-5.66-5.66l-1.5 1.5M13.4 10.6a4 4 0 0 0-5.66 0l-3 3a4 4 0 1 0 5.66 5.66l1.5-1.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
}

function buildLinks(ctx: WidgetRenderContext): Link[] {
  const links: Link[] = [];
  for (const c of ctx.data.meta.contactLinks ?? []) {
    links.push({ label: c.label, href: normalize(c.label, c.value), icon: iconFor(c.label) });
  }
  // GitHub often lives in meta.commands.social, e.g. "→  github.com/SiyuAn166"
  const social = ctx.data.meta.commands?.social;
  if (social && /github\.com\/\S+/i.test(social) && !links.some(x => x.label.toLowerCase().includes('git'))) {
    const url = social.match(/github\.com\/\S+/i)![0];
    links.push({ label: 'GitHub', href: `https://${url}`, icon: 'github' });
  }
  return links;
}

function ContactContent({ ctx }: { ctx: WidgetRenderContext }) {
  const links = buildLinks(ctx);
  return (
    <div className="wgt-contact">
      {links.map(l => (
        <a className="wgt-contact-link" key={l.label} href={l.href} target="_blank" rel="noreferrer" title={l.label} aria-label={l.label}>
          <span className="wgt-contact-glyph" aria-hidden><Icon kind={l.icon} /></span>
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
