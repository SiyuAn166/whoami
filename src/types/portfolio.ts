export interface Meta {
  /** Short system tag, e.g. "macOS Sequoia 15.5 · Darwin 24.5.0 · arm64" */
  systemTag: string;
  /** Current system time string, auto-updating every second. Format: YYYY-MM-DD HH:MM:SS */
  time: string;
  /** Active session identifier */
  session: string;
  /** OS line of the welcome banner, e.g. "macOS Sequoia 15.5" */
  bannerTitle: string;
  /** Kernel line of the welcome banner, e.g. "Darwin 24.5.0 arm64" */
  bannerSystem: string;
  /** Copyright line shown in the footer, e.g. "© 2026 ARCHITECT_TTY_SESSION" */
  copyright: string;
  /** Location + crypto shown in footer, e.g. "Loc: 49.28° N, 123.12° W // Enc: AES-256-GCM" */
  location: string;
  /** Optional desktop wallpaper image URL; falls back to the generated gradient. */
  wallpaper?: string;
  /** Contact links configurable array */
  contactLinks?: Array<{ label: string; value: string }>;
  /** Terminal commands configuration (optional) */
  commands?: Record<string, string>;
  /** Optional URL to a resume PDF file */
  resumeUrl?: string;
}

export interface Identity {
  /** Display name, e.g. "Siyu An" — rendered as the README H1 */
  title: string;
  /** Short role subtitle shown as the README blockquote (optional) */
  headline?: string;
  /** Tagline paragraph shown beneath the hero title */
  tagline: string;
}

export interface ExperienceEntry {
  /** Unix-style permission string, e.g. "drwxr-xr-x" */
  permissions: string;
  /** Owner column value, e.g. "admin" */
  owner: string;
  /** File size string, e.g. "2048B" */
  size: string;
  /** Timestamp string, e.g. "MAR 2024" */
  timestamp: string;
  /** Entry name / path, e.g. "/LEAD_ARCHITECT_LAB_01" */
  name: string;
  /** If true, this row is highlighted as the current/active role */
  current?: boolean;
  /** Optional URL to open when clicking the entry name */
  url?: string;
  /** Optional research publication URL (e.g., DOI link) */
  researchUrl?: string;
  /** Actual job title, e.g. "Lead Software Architect" */
  title?: string;
  /** Company or organization display name */
  company?: string;
  /** Human-readable date range, e.g. "MAR 2024 – Present" */
  dateRange?: string;
  /** Bullet-point achievements / responsibilities shown in the expanded panel */
  highlights?: string[];
}

export interface Project {
  /** Project system name, e.g. "ONYX_PROTOCOL" */
  name: string;
  /** Semantic version string, e.g. "v2.1.0" */
  version: string;
  /** Short status label shown in the ASCII header box, e.g. "ACTIVE" */
  status: string;
  /** One-to-two sentence description of the project */
  description: string;
  /** Tech/lang badges shown below the description, e.g. ["Rust_Lang", "WebRTC"] */
  tags: string[];
  /** License identifier, e.g. "MIT_License" — renders as an italic badge */
  license?: string;
  /** Optional link opened when user clicks the card header */
  url?: string;
}

export interface Skill {
  /** Display name of the skill, e.g. "Rust_Core" */
  name: string;
  /** Proficiency level 0–100 */
  level: number;
  /** Domain grouping for the Finder tag view. Falls back to name-based
   *  inference in SkillSection when omitted. */
  category?: "lang" | "infra" | "dist";
}

export interface CommandStrings {
  /** Command string for identity section */
  identity: string;
  /** Command string for experience section */
  experience: string;
  /** Command string for projects section */
  projects: string;
  /** Command string for skills section */
  skills: string;
}

export interface PortfolioData {
  meta: Meta;
  identity: Identity;
  experience: ExperienceEntry[];
  projects: Project[];
  skills: Skill[];
  commandStrings?: CommandStrings;
}
