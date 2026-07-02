import type { AppDefinition } from '../types';
import { Shell } from './Shell';
import { StatusBar } from './StatusBar';
import { TermGlyph } from './TermGlyph';

const SHELL_USER = 'siyu';
const SHELL_HOST = 'portfolio';

export const terminalApp: AppDefinition = {
    id: 'terminal',
    name: 'Terminal',
    icon: <TermGlyph />,
    showOnDesktop: true,
    title: `${SHELL_USER}@${SHELL_HOST} — zsh — 92×30`,
    defaultSize: { w: 1040, h: 860 },
    minSize: { w: 360, h: 300 },
    render: ({ data, theme, setTheme }) => <Shell data={data} theme={theme} setTheme={setTheme} />,
    renderFooter: ({ data }) => <StatusBar meta={data.meta} />,
};
