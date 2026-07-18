import type { WidgetSize, WidgetVariant } from "./types";
import type { ReactNode } from "react";

import stickyStyles from "./sticky/StickyNoteWidget.module.css";
import terminalStyles from "./terminal/TerminalTipWidget.module.css";
import styles from "./WidgetFrame.module.css";

interface WidgetFrameProps {
  size: WidgetSize;
  variant?: WidgetVariant;
  title?: string;
  /** When set the whole card is a button (e.g. launches an app / opens a link). */
  onActivate?: () => void;
  ariaLabel?: string;
  children: ReactNode;
}

/** Size tier -> local scoped class. Kept as a lookup (not a computed
 *  `styles[...]` key) so minifiers can't rename the property away. */
const SIZE_CLASS: Record<WidgetSize, string> = {
  small: styles.wgtSmall,
  medium: styles.wgtMedium,
  wide: styles.wgtWide,
  large: styles.wgtLarge,
};

/** Variant -> the owning widget's own scoped class (imported directly,
 *  not a global string match). "glass" is the base look with no override,
 *  hence no entry. Bracket-accessed with the exact original class name —
 *  "wgt--note"/"wgt-note" collide on the same camelCase alias, so the
 *  auto-camelCased key is ambiguous here. */
const VARIANT_CLASS: Partial<Record<WidgetVariant, string>> = {
  note: stickyStyles["wgt--note"],
  terminal: terminalStyles["wgt--terminal"],
};

/**
 * The shared shell for every widget: liquid-glass material, rounded corners,
 * shadow, size tier and optional header. Individual widgets only supply
 * content; all chrome lives here + in ./WidgetFrame.module.css.
 */
export function WidgetFrame({
  size,
  variant = "glass",
  title,
  onActivate,
  ariaLabel,
  children,
}: WidgetFrameProps) {
  // "wgt" stays literal/global — WidgetLayer.module.css targets it with a
  // plain CSS selector reference into this different file.
  const className = `wgt ${VARIANT_CLASS[variant] ?? ""} ${SIZE_CLASS[size]}${onActivate ? ` ${styles.wgtClickable}` : ""}`;

  const body = (
    <>
      {title && (
        <div className={styles.wgtHead}>
          <span className={styles.wgtTitle}>{title}</span>
        </div>
      )}
      <div className={styles.wgtBody}>{children}</div>
    </>
  );

  if (onActivate) {
    return (
      <button
        type="button"
        className={className}
        onClick={onActivate}
        aria-label={ariaLabel ?? title}
      >
        {body}
      </button>
    );
  }
  return (
    <div className={className} role="group" aria-label={ariaLabel ?? title}>
      {body}
    </div>
  );
}
