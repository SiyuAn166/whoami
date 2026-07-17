import type { SVGProps } from "react";

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

/** Speaker with no waves — used on the left of the slider; doubles as the mute toggle. */
export function SpeakerMuteIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-label="Volume"
      role="img"
      {...props}
    >
      <path d="M11.5 4.5 6.8 8.2H3.6c-.6 0-1.1.5-1.1 1.1v5.4c0 .6.5 1.1 1.1 1.1h3.2l4.7 3.7c.5.4 1.2 0 1.2-.6V5.1c0-.6-.7-1-1.2-.6Z" />
    </svg>
  );
}

/** Speaker with sound waves — used on the right of the slider (decorative, high volume). */
export function SpeakerWaveIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-label="Volume high"
      role="img"
      {...props}
    >
      <path d="M11.5 4.5 6.8 8.2H3.6c-.6 0-1.1.5-1.1 1.1v5.4c0 .6.5 1.1 1.1 1.1h3.2l4.7 3.7c.5.4 1.2 0 1.2-.6V5.1c0-.6-.7-1-1.2-.6Z" />
      <path
        d="M15.5 8.8a4 4 0 0 1 0 6.4M17.9 6.3a7.3 7.3 0 0 1 0 11.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
