import type { AppDefinition } from '../types';
import { FinderContent } from './FinderContent';
import { FinderGlyph } from './FinderGlyph';

export const finderApp: AppDefinition = {
    id: 'finder',
    name: 'Finder',
    icon: <FinderGlyph />,
    showOnDesktop: true,
    title: 'Finder',
    defaultSize: { w: 860, h: 260 },
    minSize: { w: 560, h: 360 },
    render: ({ data }) => <FinderContent data={data} />,
};
