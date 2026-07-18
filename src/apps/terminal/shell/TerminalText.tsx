import { HOST, USER } from "./constants";

/** Prompt: green user@host, blue path, dim %. */
export function Prompt({ path }: { path: string }) {
  return (
    <span style={{ whiteSpace: "pre" }}>
      <span style={{ color: "var(--prompt-user)", fontWeight: 600 }}>
        {USER}@{HOST}
      </span>
      <span style={{ color: "var(--prompt-path)" }}> {path}</span>
      <span style={{ color: "var(--fg-dim)" }}> %</span>
    </span>
  );
}

/** Plain monospace text block for textual command output. */
export function Text({
  children,
  color = "var(--fg)",
}: {
  children: string;
  color?: string;
}) {
  return (
    <pre
      style={{
        margin: 0,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        fontFamily: "inherit",
        color,
      }}
    >
      {children}
    </pre>
  );
}
