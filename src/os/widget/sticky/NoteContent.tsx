import type { WidgetRenderContext } from "../types";

import styles from "./StickyNoteWidget.module.css";

export function NoteContent({ ctx }: { ctx: WidgetRenderContext }) {
  const first = (ctx.data.identity.tagline || "").split(".")[0].trim();
  return (
    <div className={styles.wgtNote}>
      <div className={styles.wgtNoteWave}>👋</div>
      <p className={styles.wgtNoteText}>
        {first || `Hi, I'm ${ctx.data.identity.title}`}.
      </p>
    </div>
  );
}
