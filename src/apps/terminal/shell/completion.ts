import type { VDir } from '../vfs';
import { resolve } from '../vfs';
import { COMMAND_NAMES, PATH_CMDS } from './constants';

/** fish-style autosuggestion: returns the dim remainder to append to `input`. */
export function suggest(input: string, fs: VDir, cwd: string[]): string {
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
