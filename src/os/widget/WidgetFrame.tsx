import type { ReactNode } from "react";
import "./WidgetFrame.css";
import type { WidgetSize, WidgetVariant } from "./types";

interface WidgetFrameProps {
  size: WidgetSize;
  variant?: WidgetVariant;
  title?: string;
  /** When set the whole card is a button (e.g. launches an app / opens a link). */
  onActivate?: () => void;
  ariaLabel?: string;
  children: ReactNode;
}

/**
 * The shared shell for every widget: liquid-glass material, rounded corners,
 * shadow, size tier and optional header. Individual widgets only supply
 * content; all chrome lives here + in ./WidgetFrame.css.
 */
export function WidgetFrame({
  size,
  variant = "glass",
  title,
  onActivate,
  ariaLabel,
  children,
}: WidgetFrameProps) {
  const className = `wgt wgt--${size} wgt--${variant}${onActivate ? " wgt--clickable" : ""}`;

  const body = (
    <>
      {title && (
        <div className="wgt-head">
          <span className="wgt-title">{title}</span>
        </div>
      )}
      <div className="wgt-body">{children}</div>
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
