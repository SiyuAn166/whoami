import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PortfolioData } from '../types';
import {
    buildFS, isDir, listDir, pathString, resolve, treeString, type VDir,
} from '../shell/vfs';
import { CapabilitiesSection } from './CapabilitiesSection';
import { ExperienceSection } from './ExperienceSection';
import { IdentitySection } from './IdentitySection';
import { MatrixRain } from './MatrixRain';
import { ProjectsSection } from './ProjectsSection';

const USER = 'siyu';
const HOST = 'portfolio';

/** Curated command list — order also drives ghost-suggestion priority. */
const HELP: { name: string; desc: string }[] = [
    { name: 'help', desc: 'list available commands' },
    { name: 'ls', desc: 'list directory contents — try `ls projects`' },
    { name: 'cd', desc: 'change directory — `cd projects`, `cd ..`' },
    { name: 'cat', desc: 'print a file — `cat experience.log`' },
    { name: 'tree', desc: 'show the whole filesystem' },
    { name: 'pwd', desc: 'print working directory' },
    { name: 'whoami', desc: 'print my profile (README.md)' },
    { name: 'kubectl', desc: 'work history — `kubectl get roles`' },
    { name: 'experience', desc: 'work history (alias of kubectl)' },
    { name: 'projects', desc: 'project showcase' },
    { name: 'skills', desc: 'technical skills' },
    { name: 'contact', desc: 'how to reach me' },
    { name: 'open', desc: 'open a project link — `open goarc-mcp`' },
    { name: 'theme', desc: 'switch appearance — `theme light`' },
    { name: 'matrix', desc: 'follow the white rabbit' },
    { name: 'fortune', desc: 'a random engineering aphorism' },
    { name: 'neofetch', desc: 'system + identity summary' },
    { name: 'date', desc: 'current date & time' },
    { name: 'echo', desc: 'print arguments' },
    { name: 'uname', desc: 'system information' },
    { name: 'history', desc: 'command history' },
    { name: 'clear', desc: 'clear the screen' },
];

const COMMAND_NAMES = HELP.map(h => h.name);
const PATH_CMDS = new Set(['cd', 'cat', 'ls', 'open']);

const FORTUNES = [
    'Premature optimization is the root of all evil. — Knuth',
    'There are only two hard things in CS: cache invalidation and naming things.',
    'Make it work, make it right, make it fast — in that order.',
    'Simplicity is prerequisite for reliability. — Dijkstra',
    'The network is reliable. (Fallacy #1 of distributed computing.)',
    'It works on my machine — so we ship my machine. 🐳',
    'Programs must be written for people to read. — Abelson & Sussman',
    'A distributed system is one where a machine you didn\'t know existed can break yours. — Lamport',
];

const HINTS = ['cat README.md', 'ls projects', 'kubectl get roles', 'skills', 'open goarc-mcp', 'matrix', 'help'];

/** Touch devices: skip autoFocus (so the boot animation + chips show before the keyboard pops). */
const COARSE_POINTER = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

interface Line {
    id: number;
    prompt: string | null;
    cmd: string | null;
    output: ReactNode | null;
}

interface ShellProps {
    data: PortfolioData;
    theme: 'dark' | 'light';
    setTheme: (t: 'dark' | 'light') => void;
}

/** Prompt: green user@host, blue path, dim %. */
function Prompt({ path }: { path: string }) {
    return (
        <span style={{ whiteSpace: 'pre' }}>
            <span style={{ color: 'var(--prompt-user)', fontWeight: 600 }}>{USER}@{HOST}</span>
            <span style={{ color: 'var(--prompt-path)' }}> {path}</span>
            <span style={{ color: 'var(--fg-dim)' }}> %</span>
        </span>
    );
}

/** Plain monospace text block for textual command output. */
function Text({ children, color = 'var(--fg)' }: { children: string; color?: string }) {
    return <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', color }}>{children}</pre>;
}

export function Shell({ data, theme, setTheme }: ShellProps) {
    const fs = useMemo<VDir>(() => buildFS(data), [data]);
    const [cwd, setCwd] = useState<string[]>([]);

    const [lines, setLines] = useState<Line[]>([]);
    const [input, setInput] = useState('');
    const [history, setHistory] = useState<string[]>([]);
    const [histIndex, setHistIndex] = useState(-1);
    const [isFocused, setIsFocused] = useState(false);
    const [matrixOn, setMatrixOn] = useState(false);
    // Block cursor + ghost only make sense when the caret is at the end of the input.
    const [caretAtEnd, setCaretAtEnd] = useState(true);

    const idRef = useRef(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const sizerRef = useRef<HTMLSpanElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const nextId = () => ++idRef.current;

    const pushCmd = (prompt: string, cmd: string, output: ReactNode | null) =>
        setLines(l => [...l, { id: nextId(), prompt, cmd, output }]);

    // ── Command interpreter ───────────────────────────────────────────────
    const execute = (raw: string) => {
        const cmdline = raw.trim();
        const here = cwd;
        const promptPath = pathString(here);
        const prompt = `${USER}@${HOST} ${promptPath} %`;

        if (cmdline === '') {
            pushCmd(prompt, '', null);
            return;
        }

        const [name, ...args] = cmdline.split(/\s+/);
        const arg = cmdline.slice(name.length).trim();
        // First non-flag token — lets `ls -la projects`, `ls -la` etc. behave.
        const pathArg = args.find(a => !a.startsWith('-')) ?? '';
        let output: ReactNode | null = null;

        switch (name) {
            case 'clear':
                setLines([]);
                return;

            case 'help':
                output = (
                    <div className="grid gap-x-6 gap-y-0.5" style={{ gridTemplateColumns: 'auto 1fr' }}>
                        {HELP.map(h => (
                            <div key={h.name} style={{ display: 'contents' }}>
                                <span style={{ color: 'var(--accent)' }}>{h.name}</span>
                                <span style={{ color: 'var(--fg-dim)' }}>{h.desc}</span>
                            </div>
                        ))}
                    </div>
                );
                break;

            case 'pwd':
                output = <Text>{`/Users/${USER}${here.length ? '/' + here.join('/') : ''}`}</Text>;
                break;

            case 'ls': {
                const target = resolve(fs, here, pathArg || '.');
                if (!target) { output = <Text color="var(--error)">{`ls: ${pathArg}: No such file or directory`}</Text>; break; }
                if (!isDir(target.node)) { output = <Text>{target.node.name}</Text>; break; }
                const entries = listDir(target.node);
                output = (
                    <div className="flex flex-wrap gap-x-5 gap-y-0.5">
                        {entries.map(e => (
                            <span key={e} style={{ color: e.endsWith('/') ? 'var(--info)' : 'var(--fg)' }}>{e}</span>
                        ))}
                    </div>
                );
                break;
            }

            case 'cd': {
                const target = resolve(fs, here, pathArg || '~');
                if (!target) { output = <Text color="var(--error)">{`cd: no such file or directory: ${pathArg}`}</Text>; break; }
                if (!isDir(target.node)) { output = <Text color="var(--error)">{`cd: not a directory: ${pathArg}`}</Text>; break; }
                setCwd(target.segs);
                break;
            }

            case 'cat': {
                if (!pathArg) { output = <Text color="var(--fg-dim)">usage: cat &lt;file&gt;</Text>; break; }
                const target = resolve(fs, here, pathArg);
                if (!target) { output = <Text color="var(--error)">{`cat: ${pathArg}: No such file or directory`}</Text>; break; }
                if (isDir(target.node)) { output = <Text color="var(--error)">{`cat: ${pathArg}: Is a directory`}</Text>; break; }
                output = renderFile(target.node.render, target.node.text, data);
                break;
            }

            case 'tree':
                output = <Text color="var(--fg-dim)">{`~\n${treeString(fs)}`}</Text>;
                break;

            case 'whoami':
            case 'about':
            case 'neofetch':
                output = <IdentitySection identity={data.identity} experience={data.experience} meta={data.meta} />;
                break;

            case 'kubectl':
            case 'experience':
            case 'work':
                output = <ExperienceSection entries={data.experience} />;
                break;

            case 'projects':
                output = <ProjectsSection projects={data.projects} />;
                break;

            case 'skills':
                output = <CapabilitiesSection skills={data.skills} />;
                break;

            case 'contact':
                output = <ContactCard data={data} />;
                break;

            case 'open': {
                const url = resolveOpen(fs, here, pathArg);
                if (url) { window.open(url, '_blank', 'noopener,noreferrer'); output = <Text color="var(--fg-dim)">{`Opening ${url} …`}</Text>; }
                else output = <Text color="var(--error)">{`open: ${pathArg || '(nothing)'}: no link available`}</Text>;
                break;
            }

            case 'theme': {
                const t = arg.toLowerCase();
                if (t === 'dark' || t === 'light') { setTheme(t); output = <Text color="var(--fg-dim)">{`appearance → ${t}`}</Text>; }
                else { const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next); output = <Text color="var(--fg-dim)">{`appearance → ${next}`}</Text>; }
                break;
            }

            case 'matrix':
                setMatrixOn(true);
                output = <Text color="var(--accent)">Wake up, Neo… 🐇</Text>;
                break;

            case 'fortune':
                output = <Text color="var(--fg-dim)">{randomFortune()}</Text>;
                break;

            case 'date':
                output = <Text>{nowString()}</Text>;
                break;

            case 'echo':
                output = <Text>{arg}</Text>;
                break;

            case 'uname':
                output = <Text>{data.meta.commands?.uname ?? 'Darwin portfolio 24.5.0 arm64'}</Text>;
                break;

            case 'history':
                output = <Text color="var(--fg-dim)">{history.map((h, i) => `${String(i + 1).padStart(3)}  ${h}`).join('\n') || '(empty)'}</Text>;
                break;

            case 'man':
                output = manPage(args[0]);
                break;

            case 'sudo':
                output = arg.includes('hire')
                    ? <Text color="var(--ok)">Permission granted. siyu has been added to your team. 🎉  (run `contact`)</Text>
                    : <Text color="var(--error)">{`${USER} is not in the sudoers file. This incident has been reported.`}</Text>;
                break;

            case 'vim':
            case 'vi':
            case 'nano':
            case 'emacs':
                output = <Text color="var(--fg-dim)">E: to exit, type `:q` then Enter — (just kidding, there's no escaping a good portfolio)</Text>;
                break;

            case ':q':
            case ':q!':
            case ':wq':
                output = <Text color="var(--fg-dim)">left the editor.</Text>;
                break;

            case 'exit':
            case 'logout':
                output = <Text color="var(--fg-dim)">[Process completed]  —  refresh to start a new session.</Text>;
                break;

            default:
                output = <Text color="var(--error)">{`zsh: command not found: ${name}`}</Text>;
        }

        pushCmd(prompt, raw, output);
    };

    // Keep a stable handle to the latest interpreter for the boot sequence
    // (written in an effect, never during render).
    const executeRef = useRef(execute);
    useEffect(() => { executeRef.current = execute; });

    // ── Boot sequence: MOTD + auto-typed `whoami` ─────────────────────────
    // StrictMode-safe: the first (discarded) dev mount is cancelled before it
    // marks `booted`, so the real mount runs the sequence exactly once.
    const bootedRef = useRef(false);
    useEffect(() => {
        if (bootedRef.current) return;
        let cancelled = false;
        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

        (async () => {
            await sleep(0);
            if (cancelled) return;
            bootedRef.current = true;

            const motd = (
                <div style={{ color: 'var(--fg-dim)' }}>
                    <div>Last login: {nowString()} on ttys000</div>
                    <div style={{ marginTop: 4 }}>
                        Welcome to <span style={{ color: 'var(--accent)' }}>{USER}@{HOST}</span>. Type{' '}
                        <span style={{ color: 'var(--info)' }}>help</span> or click a chip below to explore. 🧭
                    </div>
                </div>
            );
            setLines(l => [...l, { id: (idRef.current += 1), prompt: null, cmd: null, output: motd }]);
            await sleep(550);
            const cmd = 'cat README.md';
            for (let i = 1; i <= cmd.length && !cancelled; i++) {
                setInput(cmd.slice(0, i));
                await sleep(38);
            }
            await sleep(200);
            if (cancelled) return;
            setInput('');
            executeRef.current(cmd);
        })();

        return () => { cancelled = true; };
    }, []);

    // Keep the live input width synced to its text (transparent caret + custom cursor),
    // but never wider than the row — long commands scroll inside the input, not the window.
    useLayoutEffect(() => {
        const el = inputRef.current;
        if (sizerRef.current && el) {
            const avail = (el.parentElement?.clientWidth ?? Infinity) - 14;
            el.style.width = Math.max(0, Math.min(sizerRef.current.offsetWidth, avail)) + 'px';
        }
    }, [input]);

    // Auto-scroll to the prompt as the scrollback grows.
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [lines]);

    const ghost = suggest(input, fs, cwd);

    const runInput = () => {
        const cmd = input;
        execute(cmd);
        if (cmd.trim()) setHistory(h => [...h, cmd.trim()]);
        setInput('');
        setHistIndex(-1);
    };

    const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') { runInput(); return; }

        if (e.key === 'Tab') {
            e.preventDefault();
            if (ghost) setInput(input + ghost);
            return;
        }

        if (e.key === 'ArrowRight' && ghost) {
            const el = e.currentTarget;
            if (el.selectionStart === input.length) { e.preventDefault(); setInput(input + ghost); }
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (history.length === 0) return;
            const idx = Math.min(histIndex + 1, history.length - 1);
            setHistIndex(idx);
            setInput(history[history.length - 1 - idx]);
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (histIndex <= -1) return;
            const idx = histIndex - 1;
            setHistIndex(idx);
            setInput(idx === -1 ? '' : history[history.length - 1 - idx]);
            return;
        }
    };

    const runChip = (cmd: string) => {
        setInput('');
        execute(cmd);
        if (cmd.trim()) setHistory(h => [...h, cmd.trim()]);
        setHistIndex(-1);
        inputRef.current?.focus();
    };

    return (
        <>
            {matrixOn && <MatrixRain onDone={() => { setMatrixOn(false); inputRef.current?.focus(); }} />}

            <section className="text-[13px] leading-relaxed" onClick={() => inputRef.current?.focus()}>
                {/* Scrollback */}
                <div className="space-y-3">
                    {lines.map(line => (
                        <div key={line.id}>
                            {line.prompt !== null && (
                                <div className="flex flex-wrap">
                                    <Prompt path={line.prompt.replace(`${USER}@${HOST} `, '').replace(' %', '')} />
                                    <span style={{ color: 'var(--fg)' }}>&nbsp;{line.cmd}</span>
                                </div>
                            )}
                            {line.output !== null && <div className="mt-1">{line.output}</div>}
                        </div>
                    ))}
                </div>

                {/* Live input row */}
                <div className="flex items-center mt-3">
                    <Prompt path={pathString(cwd)} />
                    <span className="shell-input-wrap" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flex: 1, minWidth: 0, marginLeft: '1ch' }}>
                        <span
                            ref={sizerRef}
                            aria-hidden="true"
                            style={{ visibility: 'hidden', position: 'absolute', whiteSpace: 'pre', left: 0, top: 0, fontFamily: 'inherit', fontSize: 'inherit' }}
                        >
                            {input}
                        </span>
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={e => { setInput(e.target.value); setCaretAtEnd(e.target.selectionStart === e.target.value.length); }}
                            onKeyDown={handleKey}
                            onKeyUp={e => setCaretAtEnd(e.currentTarget.selectionStart === e.currentTarget.value.length)}
                            onSelect={e => setCaretAtEnd(e.currentTarget.selectionStart === e.currentTarget.value.length)}
                            onClick={e => setCaretAtEnd(e.currentTarget.selectionStart === e.currentTarget.value.length)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            className="shell-input bg-transparent outline-none border-none"
                            style={{ color: 'var(--fg)', caretColor: caretAtEnd ? 'transparent' : 'var(--fg)', fontFamily: 'inherit', fontSize: 'inherit', padding: 0, margin: 0, minWidth: 0, width: '0px' }}
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                            aria-label="Terminal command input"
                            autoFocus={!COARSE_POINTER}
                        />
                        {caretAtEnd && <span className={`term-cursor ${isFocused ? 'active' : 'inactive'}`} aria-hidden="true">{ghost[0]}</span>}
                        {caretAtEnd && ghost && ghost.length > 1 && <span style={{ color: 'var(--fg-dim)', whiteSpace: 'pre' }}>{ghost.slice(1)}</span>}
                    </span>
                </div>

                {/* Clickable command chips */}
                <div className="flex flex-wrap gap-2 mt-4" style={{ userSelect: 'none' }}>
                    {HINTS.map(h => (
                        <button
                            key={h}
                            onClick={e => { e.stopPropagation(); runChip(h); }}
                            className="px-2 py-0.5 rounded-md"
                            style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', color: 'var(--fg-dim)', fontSize: '12px', cursor: 'pointer' }}
                        >
                            {h}
                        </button>
                    ))}
                </div>

                <div ref={bottomRef} />
            </section>

            {/* Block cursor styling (focused = solid, blurred = hollow). */}
            <style>{`
                .term-cursor { display:inline-flex; align-items:center; justify-content:center; min-width:0.6em; height:1.05em; margin-left:1px; overflow:hidden; font-family:inherit; font-size:inherit; }
                .term-cursor.active { background-color: var(--fg); color: var(--bg); }
                .term-cursor.inactive { border:1px solid var(--fg-dim); background:transparent; color: var(--fg-dim); }
            `}</style>
        </>
    );
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

function renderFile(render: string | undefined, text: string | undefined, data: PortfolioData): ReactNode {
    switch (render) {
        case 'identity': return <IdentitySection identity={data.identity} experience={data.experience} meta={data.meta} />;
        case 'experience': return <ExperienceSection entries={data.experience} />;
        case 'projects': return <ProjectsSection projects={data.projects} />;
        case 'skills': return <CapabilitiesSection skills={data.skills} />;
        case 'contact': return <ContactCard data={data} />;
        default: return <Text>{text ?? ''}</Text>;
    }
}

/** First url found directly inside a directory (e.g. its README.md). */
function dirUrl(dir: VDir): string | null {
    const f = dir.children.find(c => c.type === 'file' && c.url);
    return f && f.type === 'file' ? f.url ?? null : null;
}

function resolveOpen(fs: VDir, cwd: string[], arg: string): string | null {
    if (!arg) return null;
    if (/^https?:\/\//i.test(arg)) return arg;
    const target = resolve(fs, cwd, arg);
    if (target) {
        if (target.node.type === 'file') return target.node.url ?? null;
        return dirUrl(target.node); // directory → its README link
    }
    // Fallback: treat a bare argument as a project slug, searchable from anywhere.
    const search = (dir: VDir): string | null => {
        for (const c of dir.children) {
            if (c.type !== 'dir') continue;
            if (c.name === arg) return dirUrl(c);
            const hit = search(c);
            if (hit) return hit;
        }
        return null;
    };
    return search(fs);
}

function manPage(cmd: string | undefined): ReactNode {
    const entry = HELP.find(h => h.name === cmd);
    if (!cmd) return <Text color="var(--fg-dim)">What manual page do you want? (try `man ls`)</Text>;
    if (!entry) return <Text color="var(--error)">{`No manual entry for ${cmd}`}</Text>;
    return <Text>{`${entry.name.toUpperCase()}(1)\n\n    ${entry.name} — ${entry.desc}`}</Text>;
}

/** fish-style autosuggestion: returns the dim remainder to append to `input`. */
function suggest(input: string, fs: VDir, cwd: string[]): string {
    if (!input || input.endsWith(' ')) {
        // Path completion right after `cd `/`cat ` etc. with empty partial → no ghost.
        return '';
    }
    if (!/\s/.test(input)) {
        const hit = COMMAND_NAMES.find(n => n.startsWith(input) && n !== input);
        return hit ? hit.slice(input.length) : '';
    }
    const name = input.split(/\s+/)[0];
    if (!PATH_CMDS.has(name)) return '';
    const lastTok = input.slice(input.lastIndexOf(' ') + 1);
    const slash = lastTok.lastIndexOf('/');
    const dirPart = slash >= 0 ? lastTok.slice(0, slash) : '';
    const partial = slash >= 0 ? lastTok.slice(slash + 1) : lastTok;
    const base = resolve(fs, cwd, dirPart || '.');
    if (!base || base.node.type !== 'dir') return '';
    const wantDirOnly = name === 'cd';
    const names = base.node.children
        .filter(c => (wantDirOnly ? c.type === 'dir' : true))
        .map(c => c.name);
    const hit = names.find(n => n.startsWith(partial) && n !== partial);
    return hit ? hit.slice(partial.length) : '';
}

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

function ContactCard({ data }: { data: PortfolioData }) {
    const links = data.meta.contactLinks ?? [];
    const github = data.meta.commands?.social?.replace('→', '').trim();
    return (
        <div className="rounded-lg p-3 inline-block" style={{ border: '1px solid var(--border)', background: 'var(--bg-elev)' }}>
            <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 6 }}>contact.vcf</div>
            {links.map(l => (
                <ContactRow key={l.label} label={l.label} value={l.value}
                    href={l.label.toLowerCase() === 'email' ? `mailto:${l.value}` : `https://${l.value}`} />
            ))}
            {github && <ContactRow label="GitHub" value={github} href={`https://${github}`} />}
        </div>
    );
}

/** Impure helpers kept at module scope so the linter/compiler treat them as side-effecting, not render-time. */
function randomFortune(): string {
    return FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
}

function nowString(): string {
    return new Date().toLocaleString('en-US', { weekday: 'short', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', year: 'numeric' });
}
