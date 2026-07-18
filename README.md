# whoami — macOS Desktop Portfolio

A **macOS desktop simulator** built with **React 19 + TypeScript + Tailwind CSS v3** (Vite). The entire portfolio is presented as an interactive desktop environment with menu bar, dock, and windowed applications.

All content is **100% data-driven** via a single `data.json` file. Update it to customize system metadata, identity, experience, projects, and skills — no component code changes required.

---

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## How It Works

The desktop environment renders with a **menu bar**, **dock**, and **windowed applications**. All portfolio content (identity, experience, projects, skills) is loaded from a single JSON file at runtime.

### Core Elements

- **Menu Bar** — System metadata (time, session, system tag) and appearance toggle (☀/☾)
- **Dock** — Application launcher at the bottom
- **Windows** — Draggable, resizable, focusable application windows with title bars and controls
- **Wallpaper** — Optional custom background (defaults to macOS gradient)

### Data-Driven Everything

All content (system info, identity, career history, projects, skills) comes from a **single `data.json` file**. The portfolio interprets this data at runtime and renders the appropriate UI. To update your portfolio, simply edit the JSON and refresh — no rebuild required if using a live Gist.

---

## `data.json` — Complete Schema

Every field shown below is live-rendered in the desktop UI. Update the JSON to change the entire portfolio.

```jsonc
{
  // ─── meta ────────────────────────────────────────────────────────────────
  "meta": {
    // System identification string shown in the menu bar (top-left).
    // e.g. "macOS Sequoia 15.5 · Darwin 24.5.0 · arm64"
    "systemTag": "string",

    // Live system time shown in the menu bar (HH:MM:SS format).
    // Updated every 1 second in the UI.
    "time": "string",

    // Active session identifier, e.g. "ttys000"
    "session": "string",

    // macOS welcome banner line 1, e.g. "macOS Sequoia 15.5"
    "bannerTitle": "string",

    // macOS welcome banner line 2, e.g. "Darwin 24.5.0 arm64"
    "bannerSystem": "string",

    // Copyright footer, e.g. "© 2026 Your Name"
    "copyright": "string",

    // Location + coordinates shown in the footer.
    // Format: "City, Country · Coordinates" 
    // e.g. "Vancouver, BC · 49.28° N, 123.12° W"
    "location": "string",

    // Optional URL to a custom desktop wallpaper.
    // If omitted, uses a generated macOS Big Sur–style gradient.
    "wallpaper"?: "string",

    // Array of contact link objects shown when `contact` command is run.
    "contactLinks"?: [
      { "label": "Email", "value": "email@example.com" },
      { "label": "LinkedIn", "value": "linkedin.com/in/your-profile" }
    ],

    // Command registry: maps command names to output strings.
    // Special value "__CLEAR__" triggers terminal clear.
    "commands"?: {
      "whoami": "Your Name :: Your Role",
      "help": "Available commands: help, whoami, clear, ...",
      "ls": "Documents  Downloads  Projects  ...",
      "pwd": "/Users/your-name",
      "exit": "[Process completed]"
    },

    // Optional URL to a resume PDF file.
    // If provided, a "Resume" link appears in the identity section.
    "resumeUrl"?: "resume.pdf",

    // Nested namespace for terminal commands (alternative structure).
    "commandStrings"?: {
      "identity": "whoami",
      "experience": "kubectl get roles -n siyu",
      "projects": "kubectl get projects -n siyu",
      "skills": "kubectl get skills -n siyu"
    }
  },

  // ─── identity ────────────────────────────────────────────────────────────
  "identity": {
    // Full name displayed as the H1 hero title.
    "title": "Siyu An",

    // Optional short headline (role subtitle).
    "headline"?: "Software Engineer · cloud-platform engineering & operations",

    // Bio paragraph shown below the title.
    "tagline": "I am a Software Engineer specializing in..."
  },

  // ─── experience ──────────────────────────────────────────────────────────
  // Array of job/role entries. Ordered newest → oldest (current role first).
  // Displayed in table format in the Terminal or Finder.
  "experience": [
    {
      // Unix-style permission string (aesthetic only), e.g. "drwxr-xr-x"
      "permissions": "string",

      // Owner column, typically "siyu" or "admin"
      "owner": "string",

      // File size (aesthetic), e.g. "2048B"
      "size": "string",

      // Date in short form, e.g. "08/2024"
      "timestamp": "string",

      // Entry name shown in table view, e.g. "INFOBLOX"
      "name": "string",

      // If true, this role is highlighted as the current/active one.
      "current"?: "boolean",

      // Full job title, e.g. "Software Engineer"
      "title"?: "string",

      // Company or organization name, e.g. "Infoblox Canada Inc."
      "company"?: "string",

      // Human-readable date range, e.g. "08/2024 -> PRESENT"
      "dateRange"?: "string",

      // Array of bullet-point achievements / responsibilities.
      "highlights"?: [
        "Achievement 1",
        "Achievement 2"
      ],

      // Optional URL (e.g., company site or research publication DOI)
      "url"?: "string"
    }
    // ... more entries
  ],

  // ─── projects ────────────────────────────────────────────────────────────
  // Array of project portfolio entries.
  // Each renders as a card with ASCII-art styling.
  "projects": [
    {
      // Project system name, e.g. "GOARC_MCP"
      "name": "string",

      // Semantic version, e.g. "v0.1.0"
      "version": "string",

      // Status label, e.g. "ACTIVE", "BETA", "ARCHIVED"
      "status": "string",

      // One-to-two sentence description.
      "description": "string",

      // Tech badges shown below description.
      // Use underscores instead of spaces, e.g. "Go_Lang", "Kubernetes"
      "tags": ["string", "string"],

      // License identifier, e.g. "MIT_License"
      "license"?: "string",

      // Optional URL opened when clicking the project card.
      "url"?: "string"
    }
    // ... up to 4 projects recommended
  ],

  // ─── skills ──────────────────────────────────────────────────────────────
  // Array of skill/proficiency entries.
  // Each renders as an animated progress bar in the Finder or Terminal output.
  "skills": [
    {
      // Skill name, e.g. "Go_Lang", "Kubernetes"
      "name": "string",

      // Proficiency level: 0–100 (integer).
      // Rendered as a percentage bar and numerical label.
      "level": "number"
    }
    // ... 6–10 skills recommended
  ]
}
```

---

## Complete Example

A production-ready `data.json` with real portfolio content is at [`public/data.json`](public/data.json).

---

## Theming

The desktop ships in **dark mode** by default (matching macOS Sequoia Pro terminal profile).  
The **appearance toggle** (☀ / ☾) in the menu bar switches between light and dark themes — persisted to localStorage.

Colors are driven by CSS custom properties defined in [`src/styles/tokens.css`](src/styles/tokens.css):

```css
--bg              /* main terminal/window background */
--bg-elev         /* elevated surfaces (menu bar, dock) */
--titlebar        /* window title bar */
--fg / --fg-dim   /* primary / secondary text */
--accent          /* macOS green (active state, successful) */
--info            /* macOS blue (links, info) */
--warn / --error  /* macOS yellow / red */
```

Traffic light button colors (red `#ff5f57`, yellow `#febc2e`, green `#28c840`) match real macOS window controls.

---

## Project Structure

```
src/
├── config.ts                    ← Data source URL
├── types/
│   └── portfolio.ts             ← TypeScript interfaces for data.json
├── styles/
│   ├── tokens.css               ← Design tokens (colors, spacing, typography)
│   ├── base.css                 ← Global resets
│   ├── keyframes.css            ← Animations
│   └── misc.css                 ← Utility styles
├── hooks/
│   ├── use-portfolio-data.ts    ← Fetch and cache portfolio JSON
│   ├── use-theme.ts             ← Theme toggle with localStorage
│   └── use-intersection-observer.ts ← Scroll-based animations
├── App.tsx                      ← Root component
├── main.tsx                     ← Entry point
├── os/                          ← Operating system UI layer
│   ├── desktop/                 ← Desktop, menu bar, dock (each own kebab-case dir, index.tsx entrance)
│   ├── window/                  ← Window management (drag, resize, focus)
│   └── widget/                  ← System widgets (each widget its own dir, index.tsx entrance)
├── apps/                        ← Windowed applications
│   ├── registry.ts              ← App definitions
│   ├── terminal/                ← Terminal app (index.tsx entrance)
│   ├── finder/                  ← File browser app (index.tsx entrance)
│   ├── preview/                 ← Document viewer app (index.tsx entrance)
│   └── arcade/                  ← Arcade hub + games (tetris/, puyo/), index.tsx entrance
public/
└── data.json                    ← Portfolio data
```

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server at [http://localhost:5173](http://localhost:5173) |
| `npm run build` | Compile TypeScript + bundle for production into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | Run TypeScript type checker (no emit) |
| `npm run lint` | Run ESLint on source code |
| `npm run lint:fix` | Auto-fix linting issues |
| `npm run format` | Auto-format code (Prettier) |
| `npm run format:check` | Check if code is properly formatted |
| `npm run check` | Run format check + lint + typecheck (full CI suite) |

---

## Development

### Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server at [http://localhost:5173](http://localhost:5173) |
| `npm run build` | Compile TypeScript + bundle for production into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | Run TypeScript type checker |
| `npm run lint` | Run ESLint on source code |
| `npm run lint:fix` | Auto-fix linting issues |
| `npm run format` | Auto-format code (Prettier) |
| `npm run check` | Run format + lint + typecheck (full CI suite) |

### Customizing Content

Edit [`public/data.json`](public/data.json) to update:
- System metadata (time, session, system tag, location)
- Identity (name, headline, tagline)
- Experience (job history with highlights)
- Projects (portfolio projects with descriptions and links)
- Skills (proficiency areas)

The app fetches this JSON at runtime, so changes are reflected immediately.

---

## License

Built with React 19, TypeScript, Tailwind CSS v3, and Vite.
