import { FORTUNES } from './constants';

/** Impure helpers kept at module scope so the linter/compiler treat them as side-effecting, not render-time. */
export function randomFortune(): string {
    return FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
}

export function nowString(): string {
    return new Date().toLocaleString('en-US', { weekday: 'short', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', year: 'numeric' });
}
