import { resolveAsset } from "./previewUtils";

export function PreviewFooter({ url }: { url?: string }) {
  const href = resolveAsset(url);
  if (!href) return null;
  return (
    <div
      className="preview-statusbar"
      style={{
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        padding: "6px 12px",
        borderTop: "1px solid var(--border)",
        background: "var(--bg-elev)",
        fontSize: "12px",
      }}
    >
      <a
        href={href}
        download
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "var(--info)", textDecoration: "none" }}
      >
        &#x2913; Download PDF
      </a>
    </div>
  );
}
