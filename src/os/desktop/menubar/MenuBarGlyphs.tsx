import type { SVGProps } from "react";

interface GlyphProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export function AppleGlyph({ size = 20, ...props }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-label="Apple"
      role="img"
      {...props}
    >
      <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
    </svg>
  );
}

export function MoonGlyph({ size = 14, ...props }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-label="Moon"
      role="img"
      {...props}
    >
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 11.5373 21.3065 11.4608 21.0672 11.8568C19.9289 13.7406 17.8615 15 15.5 15C11.9101 15 9 12.0899 9 8.5C9 6.13845 10.2594 4.07105 12.1432 2.93276C12.5392 2.69347 12.4627 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
    </svg>
  );
}

export function SunGlyph({ size = 14, ...props }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-label="Sun"
      role="img"
      {...props}
    >
      <path d="M17 12C17 14.7614 14.7614 17 12 17C9.23858 17 7 14.7614 7 12C7 9.23858 9.23858 7 12 7C14.7614 7 17 9.23858 17 12Z" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 1.25C12.4142 1.25 12.75 1.58579 12.75 2V4C12.75 4.41421 12.4142 4.75 12 4.75C11.5858 4.75 11.25 4.41421 11.25 4V2C11.25 1.58579 11.5858 1.25 12 1.25ZM3.66865 3.71609C3.94815 3.41039 4.42255 3.38915 4.72825 3.66865L6.95026 5.70024C7.25596 5.97974 7.2772 6.45413 6.9977 6.75983C6.7182 7.06553 6.2438 7.08677 5.9381 6.80727L3.71609 4.77569C3.41039 4.49619 3.38915 4.02179 3.66865 3.71609ZM20.3314 3.71609C20.6109 4.02179 20.5896 4.49619 20.2839 4.77569L18.0619 6.80727C17.7562 7.08677 17.2818 7.06553 17.0023 6.75983C16.7228 6.45413 16.744 5.97974 17.0497 5.70024L19.2718 3.66865C19.5775 3.38915 20.0518 3.41039 20.3314 3.71609ZM1.25 12C1.25 11.5858 1.58579 11.25 2 11.25H4C4.41421 11.25 4.75 11.5858 4.75 12C4.75 12.4142 4.41421 12.75 4 12.75H2C1.58579 12.75 1.25 12.4142 1.25 12ZM19.25 12C19.25 11.5858 19.5858 11.25 20 11.25H22C22.4142 11.25 22.75 11.5858 22.75 12C22.75 12.4142 22.4142 12.75 20 12.75H20C19.5858 12.75 19.25 12.4142 19.25 12ZM17.0255 17.0252C17.3184 16.7323 17.7933 16.7323 18.0862 17.0252L20.3082 19.2475C20.6011 19.5404 20.601 20.0153 20.3081 20.3082C20.0152 20.6011 19.5403 20.601 19.2475 20.3081L17.0255 18.0858C16.7326 17.7929 16.7326 17.3181 17.0255 17.0252ZM6.97467 17.0253C7.26756 17.3182 7.26756 17.7931 6.97467 18.086L4.75244 20.3082C4.45955 20.6011 3.98468 20.6011 3.69178 20.3082C3.39889 20.0153 3.39889 19.5404 3.69178 19.2476L5.91401 17.0253C6.2069 16.7324 6.68177 16.7324 6.97467 17.0253ZM12 19.25C12.4142 19.25 12.75 19.5858 12.75 20V22C12.75 22.4142 12.4142 22.75 12 22.75C11.5858 22.75 11.25 22.4142 11.25 22V20C11.25 19.5858 11.5858 19.25 12 19.25Z"
      />
    </svg>
  );
}

export function WifiGlyph({ size = 16, ...props }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="20 54 110 110"
      fill="currentColor"
      aria-label="Wi-Fi"
      role="img"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M116.801 108.463C96.235 84.6997 53.957 84.5467 33.132 108.501L22.243 97.6677C48.889 68.1907 101.409 68.3757 127.758 97.6017L116.801 108.463ZM108.148 117.041L97.136 127.958C87.071 113.818 62.914 113.694 52.649 127.917L41.714 117.039C57.922 97.4017 92.171 97.5487 108.148 117.041ZM87.669 137.343L74.875 150.026L62.018 137.236C66.961 127.361 82.943 127.481 87.669 137.343Z"
      />
    </svg>
  );
}

export function BatteryGlyph({ size = 16, ...props }: GlyphProps) {
  return (
    <svg
      width={size * 1.7}
      height={size}
      viewBox="1.5 9.5 25 13"
      fill="currentColor"
      aria-label="Battery"
      role="img"
      {...props}
    >
      <path d="M24 14c-0.553 0-1 0-1 0v-1c0-1.104-0.896-2-2-2h-16c-1.105 0-2 0.896-2 2v7c0 1.104 0.895 2 2 2h16c1.104 0 2-0.896 2-2v-1c0 0 0.447 0 1 0 0.552 0 1-0.448 1-1v-3c0-0.553-0.448-1-1-1zM22 20c0 0.552-0.448 1-1 1h-16c-0.553 0-1-0.448-1-1v-7c0-0.553 0.447-1 1-1h16c0.552 0 1 0.447 1 1v7zM5 20h6v-7h-6v7z" />
    </svg>
  );
}

export function ControlCenterGlyph({
  size = 16,
  id = "cc",
  ...props
}: GlyphProps & { id?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="1.3 1.3 21.4 21.4"
      fill="currentColor"
      aria-label="Control Center"
      role="img"
      {...props}
    >
      <rect
        x="4"
        y="3.5"
        width="16"
        height="7"
        rx="3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <rect
        x="6.1"
        y="4.8"
        width="6.2"
        height="4.4"
        rx="2.2"
        fill="currentColor"
      />
      <mask id={`${id}-knob`}>
        <rect x="3.3" y="12.8" width="17.4" height="8.4" rx="4.2" fill="#fff" />
        <rect x="11.7" y="14.8" width="6.2" height="4.4" rx="2.2" fill="#000" />
      </mask>
      <rect
        x="3.3"
        y="12.8"
        width="17.4"
        height="8.4"
        rx="4.2"
        fill="currentColor"
        mask={`url(#${id}-knob)`}
      />
    </svg>
  );
}

export function SearchGlyph({ size = 14, ...props }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="1.3 1.3 21.4 21.4"
      fill="none"
      aria-label="Search"
      role="img"
      {...props}
    >
      <path
        d="M15 15L21 21M10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10C17 13.866 13.866 17 10 17Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
