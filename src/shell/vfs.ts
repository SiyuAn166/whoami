import type { PortfolioData } from '../types';

/** A file whose `cat` output is a rendered React section rather than text. */
export type RenderKind = 'identity' | 'experience' | 'projects' | 'skills' | 'contact';

export interface VFile {
    type: 'file';
    name: string;
    /** If set, `cat` renders the matching React section instead of `text`. */
    render?: RenderKind;
    /** Plain-text content (used by `cat` when `render` is absent). */
    text?: string;
    /** `open <file>` target. */
    url?: string;
}

export interface VDir {
    type: 'dir';
    name: string;
    children: VNode[];
}

export type VNode = VFile | VDir;

/** SCREAMING_NAME → kebab-slug, e.g. "GOARC_MCP" → "goarc-mcp". */
export function slug(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Builds the in-memory home directory (~) from the portfolio data.
 * The shell navigates this tree with cd / ls / cat / tree / open.
 */
export function buildFS(data: PortfolioData): VDir {
    const projectDirs: VNode[] = data.projects.map(p => ({
        type: 'dir' as const,
        name: slug(p.name),
        children: [
            {
                type: 'file' as const,
                name: 'README.md',
                url: p.url,
                text: [
                    `# ${p.name}  ${p.version}`,
                    '',
                    p.description,
                    '',
                    `status   : ${p.status}`,
                    `tags     : ${p.tags.join(', ')}`,
                    ...(p.license ? [`license  : ${p.license}`] : []),
                    ...(p.url ? [`url      : ${p.url}`] : ['url      : (private)']),
                ].join('\n'),
            },
        ],
    }));

    return {
        type: 'dir',
        name: '~',
        children: [
            { type: 'file', name: 'README.md', render: 'identity', text: data.identity.tagline },
            { type: 'file', name: 'experience.md', render: 'experience' },
            { type: 'dir', name: 'projects', children: projectDirs },
            { type: 'file', name: 'skills.md', render: 'skills' },
            { type: 'file', name: 'contact.vcf', render: 'contact' },
        ],
    };
}

export function isDir(node: VNode): node is VDir {
    return node.type === 'dir';
}

function childByName(dir: VDir, name: string): VNode | undefined {
    return dir.children.find(c => c.name === name);
}

export interface Resolved {
    node: VNode;
    /** Path segments below home (~). Empty array means home itself. */
    segs: string[];
}

/**
 * Resolves `path` (relative to `cwd`) within the home-rooted tree.
 * Supports ~, leading /, ., and .. — never escapes above home.
 * Returns null if any path component does not exist.
 */
export function resolve(root: VDir, cwd: string[], path: string): Resolved | null {
    const raw = path.trim();
    let segs: string[];

    if (raw === '') {
        segs = [...cwd];
    } else if (raw === '~' || raw === '/') {
        segs = [];
    } else if (raw.startsWith('~/') || raw.startsWith('/')) {
        segs = [];
    } else {
        segs = [...cwd];
    }

    const rest = raw.replace(/^~\/?/, '').replace(/^\//, '');
    for (const part of rest.split('/')) {
        if (part === '' || part === '.') continue;
        if (part === '..') {
            segs.pop();
            continue;
        }
        segs.push(part);
    }

    // Walk from root following segs.
    let node: VNode = root;
    for (const seg of segs) {
        if (!isDir(node)) return null;
        const next = childByName(node, seg);
        if (!next) return null;
        node = next;
    }
    return { node, segs };
}

/** Renders ~/<segs> as a prompt-friendly path string. */
export function pathString(segs: string[]): string {
    return segs.length ? `~/${segs.join('/')}` : '~';
}

/** Lists a directory's entries, dirs first, dirs suffixed with `/`. */
export function listDir(dir: VDir): string[] {
    const dirs = dir.children.filter(isDir).map(c => `${c.name}/`);
    const files = dir.children.filter(c => !isDir(c)).map(c => c.name);
    return [...dirs.sort(), ...files.sort()];
}

/** Produces a `tree`-style ASCII listing rooted at `dir`. */
export function treeString(dir: VDir, prefix = ''): string {
    const lines: string[] = [];
    const kids = [...dir.children].sort((a, b) => {
        if (isDir(a) !== isDir(b)) return isDir(a) ? -1 : 1;
        return a.name.localeCompare(b.name);
    });
    kids.forEach((child, i) => {
        const last = i === kids.length - 1;
        const branch = last ? '└── ' : '├── ';
        lines.push(`${prefix}${branch}${child.name}${isDir(child) ? '/' : ''}`);
        if (isDir(child)) {
            lines.push(treeString(child, prefix + (last ? '    ' : '│   ')));
        }
    });
    return lines.filter(Boolean).join('\n');
}
