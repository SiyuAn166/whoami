import type { WidgetRenderContext } from "../types";
import styles from "./TerminalTipWidget.module.css";

export function TerminalContent({ ctx }: { ctx: WidgetRenderContext }) {
  const who = ctx.data.meta.commands?.whoami ?? ctx.data.identity.title;
  return (
    <div className={styles.wgtTerm}>
      <div className="wgt-term-line">
        <span className={styles.wgtTermPrompt}>$</span> whoami
      </div>
      <div className={styles.wgtTermOut}>{who}</div>
      <div className="wgt-term-line">
        <span className={styles.wgtTermPrompt}>$</span> uptime
        <span className={styles.wgtTermCursor} aria-hidden />
      </div>
    </div>
  );
}
