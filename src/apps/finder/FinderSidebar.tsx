export type FinderSection = 'projects' | 'experience' | 'skills';

const ITEMS: { id: FinderSection; label: string; glyph: string }[] = [
    { id: 'projects', label: 'Projects', glyph: '📁' },
    { id: 'experience', label: 'Experience', glyph: '🗂' },
    { id: 'skills', label: 'Skills', glyph: '⚙' },
];

export function FinderSidebar({ selected, onSelect }: { selected: FinderSection; onSelect: (s: FinderSection) => void }) {
    return (
        <nav
            style={{
                width: 150,
                flexShrink: 0,
                borderRight: '1px solid var(--border)',
                padding: '4px 8px',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
            }}
        >
            {ITEMS.map(item => (
                <button
                    key={item.id}
                    onClick={() => onSelect(item.id)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        border: 'none',
                        background: selected === item.id ? 'var(--accent)' : 'transparent',
                        color: selected === item.id ? '#fff' : 'var(--fg)',
                        borderRadius: 6,
                        padding: '6px 8px',
                        fontSize: 13,
                        textAlign: 'left',
                        cursor: 'pointer',
                    }}
                >
                    <span aria-hidden style={{ fontSize: 14 }}>{item.glyph}</span>
                    {item.label}
                </button>
            ))}
        </nav>
    );
}
