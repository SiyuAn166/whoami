import type { WidgetDefinition, WidgetRenderContext } from '../types';
import './StickyNoteWidget.css';

function NoteContent({ ctx }: { ctx: WidgetRenderContext }) {
  const first = (ctx.data.identity.tagline || '').split('.')[0].trim();
  return (
    <div className="wgt-note">
      <div className="wgt-note-wave">👋</div>
      <p className="wgt-note-text">{first || `Hi, I'm ${ctx.data.identity.title}`}.</p>
    </div>
  );
}

export const stickyNoteWidget: WidgetDefinition = {
  id: 'note',
  size: 'small',
  variant: 'note',
  order: 45,
  render: ctx => <NoteContent ctx={ctx} />,
};
