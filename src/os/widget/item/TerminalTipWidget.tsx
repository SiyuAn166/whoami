import type { WidgetDefinition, WidgetRenderContext } from '../types';

function TerminalContent({ ctx }: { ctx: WidgetRenderContext }) {
  const who = ctx.data.meta.commands?.whoami ?? ctx.data.identity.title;
  return (
    <div className="wgt-term">
      <div className="wgt-term-line"><span className="wgt-term-prompt">$</span> whoami</div>
      <div className="wgt-term-out">{who}</div>
      <div className="wgt-term-line"><span className="wgt-term-prompt">$</span> uptime<span className="wgt-term-cursor" aria-hidden /></div>
    </div>
  );
}

export const terminalTipWidget: WidgetDefinition = {
  id: 'terminalTip',
  size: 'wide',
  variant: 'terminal',
  order: 50,
  onActivate: ctx => ctx.openApp('terminal'),
  render: ctx => <TerminalContent ctx={ctx} />,
};
