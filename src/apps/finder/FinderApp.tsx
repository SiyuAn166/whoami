import type { AppDefinition } from '../types';
import { FinderContent } from './FinderContent';
import { FinderGlyph } from './FinderGlyph';

export const finderApp: AppDefinition = {
    id: 'finder',
    name: 'Finder',
    icon: <FinderGlyph />,
    showOnDesktop: true,
    title: 'Finder',
    defaultSize: { w: 860, h: 560 },
    minSize: { w: 360, h: 360 },
    render: ({ data }) => <FinderContent data={data} />,
};
