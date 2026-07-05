import type { AppDefinition } from "../types";
import { PreviewContent } from "./PreviewContent";
import { PreviewFooter } from "./PreviewFooter";
import { PreviewIcon } from "./PreviewIcon";

/**
 * "Preview" — a macOS Preview.app-style window that embeds the résumé PDF.
 * The file lives in public/resume.pdf; meta.resumeUrl holds either a bare
 * filename (resolved against import.meta.env.BASE_URL) or a full https URL.
 */
export const previewApp: AppDefinition = {
  id: "preview",
  name: "Preview",
  icon: <PreviewIcon />,
  showOnDesktop: true,
  title: "resume.pdf",
  defaultSize: { w: 720, h: 900 },
  minSize: { w: 360, h: 400 },
  render: ({ data }) => <PreviewContent url={data.meta.resumeUrl} />,
  renderFooter: ({ data }) => <PreviewFooter url={data.meta.resumeUrl} />,
};
