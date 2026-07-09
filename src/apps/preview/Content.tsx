import { resolveAsset } from "./utils";

/**
 * Renders the résumé PDF inline. Falls back to a link for browsers (and most
 * mobile devices) that refuse to embed PDFs in an <object>.
 */
export function PreviewContent({ url }: { url?: string }) {
  const src = resolveAsset(url);

  if (!src) {
    return (
      <div style={{ color: "var(--fg-dim)", fontSize: "13px" }}>
        No résumé configured. Add <code>resume.pdf</code> to{" "}
        <code>public/</code> and set <code>meta.resumeUrl</code> in your
        data.json.
      </div>
    );
  }

  return (
    <object
      data={src}
      type="application/pdf"
      aria-label="Résumé PDF"
      style={{ width: "100%", height: "100%", border: 0, display: "block" }}
    >
      <div
        style={{ color: "var(--fg-dim)", fontSize: "13px", padding: "8px 0" }}
      >
        This browser can&rsquo;t display the PDF inline.{" "}
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--info)" }}
        >
          Open the résumé in a new tab
        </a>
        .
      </div>
    </object>
  );
}
