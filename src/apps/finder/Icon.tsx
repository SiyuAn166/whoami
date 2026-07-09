/** macOS Finder-style folder icon used by the Dock and Desktop. */
export function FinderIcon() {
  return (
    <svg
      width="90%"
      height="90%"
      viewBox="0 0 512 512"
      aria-label="Finder"
      role="img"
    >
      <rect width="512" height="512" rx="22%" fill="url(#finder-a)" />
      <defs>
        <linearGradient id="finder-a" x2="0" y1="100%">
          <stop offset="0" stopColor="#1e73f2" />
          <stop offset="1" stopColor="#19d3fd" />
        </linearGradient>
        <linearGradient id="finder-b" x2="0" y1="100%">
          <stop offset="0" stopColor="#dbe9f4" />
          <stop offset="1" stopColor="#f7f6f6" />
        </linearGradient>
      </defs>
      <path
        fill="url(#finder-b)"
        d="M399.4 0H274.4c-21.2 49.2-59.2 129.6-60.8 283.4a9.9 9.9 0 0010 10.1h58.7a9.9 9.9 0 019.9 10.2A933.3 933.3 0 00311.3 512h88.1a112.6 112.6 0 00112.6-112.6V112.6A112.6 112.6 0 00399.4 0z"
      />
      <path
        fill="none"
        stroke="#000000"
        strokeLinecap="round"
        strokeWidth="20"
        d="M371 149v34m-229-34v34m263.4 147.2a215.2 215.2 0 01-298.8 0"
      />
    </svg>
  );
}
