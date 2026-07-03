export const USER = 'siyu';
export const HOST = 'portfolio';

/** Curated command list — order also drives ghost-suggestion priority. */
export const HELP: { name: string; desc: string }[] = [
    { name: 'help', desc: 'list available commands' },
    { name: 'ls', desc: 'list directory contents — try `ls projects`' },
    { name: 'cd', desc: 'change directory — `cd projects`, `cd ..`' },
    { name: 'cat', desc: 'print a file' },
    { name: 'tree', desc: 'show the whole filesystem' },
    { name: 'pwd', desc: 'print working directory' },
    { name: 'whoami', desc: 'print my profile (README.md)' },
    { name: 'kubectl', desc: 'k8s-style resources — `kubectl get roles|projects|skills`' },
    { name: 'experience', desc: 'work history (alias of `kubectl get roles`)' },
    { name: 'projects', desc: 'project showcase (alias of `kubectl get projects`)' },
    { name: 'skills', desc: 'technical skills (alias of `kubectl get skills`)' },
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

export const COMMAND_NAMES = HELP.map(h => h.name);
export const PATH_CMDS = new Set(['cd', 'cat', 'ls', 'open']);

export const FORTUNES = [
    'Premature optimization is the root of all evil. — Knuth',
    'There are only two hard things in CS: cache invalidation and naming things.',
    'Make it work, make it right, make it fast — in that order.',
    'Simplicity is prerequisite for reliability. — Dijkstra',
    'The network is reliable. (Fallacy #1 of distributed computing.)',
    'It works on my machine — so we ship my machine. 🐳',
    'Programs must be written for people to read. — Abelson & Sussman',
    'A distributed system is one where a machine you didn\'t know existed can break yours. — Lamport',
];

export const HINTS = ['cat README.md', 'kubectl get roles', 'kubectl get projects', 'kubectl get skills', 'open goarc-mcp', 'matrix', 'help'];

/** Touch devices: skip autoFocus (so the boot animation + chips show before the keyboard pops). */
export const COARSE_POINTER = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
