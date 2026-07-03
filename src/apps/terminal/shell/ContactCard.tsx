import type { PortfolioData } from '../../../types/portfolio';

function ContactRow({ label, value, href }: { label: string; value: string; href?: string }) {
    return (
        <div className="flex">
            <span style={{ color: 'var(--accent)', fontWeight: 600, width: '5.5rem', flexShrink: 0 }}>{label}</span>
            <span style={{ color: 'var(--fg-dim)' }}>: </span>
            {href
                ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--info)', wordBreak: 'break-all' }}>{value}</a>
                : <span style={{ wordBreak: 'break-all' }}>{value}</span>}
        </div>
    );
}

export function ContactCard({ data }: { data: PortfolioData }) {
    const links = data.meta.contactLinks ?? [];
    const github = data.meta.commands?.social?.replace('→', '').trim();
    return (
        <div className="rounded-lg p-3 inline-block" style={{ border: '1px solid var(--border)', background: 'var(--bg-elev)' }}>
            <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 6 }}>contact.vcf</div>
            {links.map(l => (
                <ContactRow key={l.label} label={l.label} value={l.value}
                    href={l.label.toLowerCase() === 'email' ? `mailto:${l.value}` : /^https?:\/\//i.test(l.value) ? l.value : `https://${l.value}`} />
            ))}
            {github && <ContactRow label="GitHub" value={github} href={`https://${github}`} />}
        </div>
    );
}
