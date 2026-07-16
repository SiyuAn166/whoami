import React from "react";

// Simple app icon: a T tetromino in the 「日」-inset palette.
export const Icon: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <rect width="48" height="48" rx="10" fill="#0b0f1e" />
    <g fill="#a24be0" stroke="#c98cf0" strokeWidth="1">
      <rect x="9" y="15" width="10" height="10" rx="2" />
      <rect x="19" y="15" width="10" height="10" rx="2" />
      <rect x="29" y="15" width="10" height="10" rx="2" />
      <rect x="19" y="25" width="10" height="10" rx="2" />
    </g>
  </svg>
);

export default Icon;
