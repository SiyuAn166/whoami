import type { AppDefinition } from '../types';
import { PreviewContent } from './PreviewContent';
import { PreviewGlyph } from './PreviewGlyph';

/**
 * "Preview" — a macOS Preview.app-style window that embeds the résumé PDF.
 * The file lives in public/resume.pdf; meta.resumeUrl holds either a bare
 * filename (resolved against import.meta.env.BASE_URL) or a full https URL.
 */
export const previewApp: AppDefinition = {
    id: 'preview',
    name: 'Preview',
    icon: <PreviewGlyph />,
    showOnDesktop: true,
    title: 'resume.pdf',
    defaultSize: { w: 720, h: 900 },
    minSize: { w: 360, h: 400 },
    render: ({ data }) => <PreviewContent url={data.meta.resumeUrl} />,
    renderFooter: ({ data }) => <PreviewFooter url={data.meta.resumeUrl} />,
};

/** Resolves a bare filename against the Vite base path; leaves absolute URLs untouched. */
export function resolveAsset(url?: string): string | null {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    return `${import.meta.env.BASE_URL}${url.replace(/^\/+/, '')}`;
}

function PreviewFooter({ url }: { url?: string }) {
    const href = resolveAsset(url);
    if (!href) return null;
    return (
        <div
            className="preview-statusbar"
            style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                padding: '6px 12px',
                borderTop: '1px solid var(--border)',
                background: 'var(--bg-elev)',
                fontSize: '12px',
            }}
        >
            <a
                href={href}
                download
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--info)', textDecoration: 'none' }}
            >
                &#x2913; Download PDF
            </a>
        </div>
    );
}
