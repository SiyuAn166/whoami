# whoami — macOS Desktop Portfolio

A **macOS desktop simulator** built with **React 19 + TypeScript + Tailwind CSS v3** (Vite).
The entire portfolio is presented as an interactive desktop environment with a boot sequence, menu bar, dock, control center, context menus, draggable windows, and a Notification-Center-style widget layer.

All portfolio content is **100% data-driven** via a single `data.json` file — update it to customize system metadata, identity, experience, projects, and skills; no component code changes required.

---

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## How It Works

On load, a short **boot sequence** plays, then the desktop environment renders with a **menu bar**, **dock**, **desktop icons**, a **widget layer**, and **windowed applications**. All portfolio content (identity, experience, projects, skills) is loaded from a single JSON file at runtime.

### Core Elements

- **Boot** — macOS-style startup sequence before the desktop appears
- **Menu Bar** — System metadata (time, session, system tag), and Control Center entry
- **Control Center** — Volume, display/lens filters, and quick toggles
- **Dock** — Application launcher at the bottom
- **Desktop Icons** — Launch apps directly from the desktop
- **Right-Click Menu** — Context menu on the desktop (change wallpaper, add widgets, etc.)
- **Windows** — Draggable, resizable, focusable application windows with macOS traffic-light controls (grey/unfocused, colored on focus)
- **Widget Layer** — Add/remove/drag Notification-Center-style widgets via the Widget Gallery; layout persists to `localStorage`. Includes a **Weather** widget (IP-based geolocation → live Open-Meteo forecast, condition-driven sky gradient, hardcoded fallback) alongside clock, calendar, contact, skills, sticky, and featured widgets
- **Wallpaper** — Custom background with a built-in Wallpaper Gallery (defaults to a macOS-style gradient)

### Data-Driven Everything

All content (system info, identity, career history, projects, skills) comes from a **single `data.json` file**. The portfolio interprets this data at runtime and renders the appropriate UI. To update your portfolio, simply edit the JSON and refresh — no rebuild required if using a live Gist.

---

## `data.json` — Complete Schema

Every field shown below is live-rendered in the desktop UI. Update the JSON to change the entire portfolio.

```jsonc
{
  // ─── meta ──────────────────────────────────────────────────────────────
  "meta": {
    // System identification string shown in the menu bar (top-left).
    // e.g. "macOS Sequoia 15.5 · Darwin 24.5.0 · arm64"
    "systemTag": "string",
    // Live system time shown in the menu bar (HH:MM:SS format). Updated every 1s.
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
    // Format: "City, Country · Coordinates" e.g. "Vancouver, BC · 49.28° N, 123.12° W"
    "location": "string",
    // Optional URL to a custom desktop wallpaper. If omitted, uses a generated gradient.
    "wallpaper"?: "string",
    // Array of contact link objects shown when `contact` command is run.
    "contactLinks"?: [
      { "label": "Email", "value": "email@example.com" },
      { "label": "LinkedIn", "value": "linkedin.com/in/your-profile" }
    ],
    // Command registry: maps command names to output strings. "__CLEAR__" clears terminal.
    "commands"?: {
      "whoami": "Your Name :: Your Role",
      "help": "Available commands: help, whoami, clear, ...",
      "ls": "Documents  Downloads  Projects  ...",
      "pwd": "/Users/your-name",
      "exit": "[Process completed]"
    },
    // Optional URL to a resume PDF file. If provided, a "Resume" link appears.
    "resumeUrl"?: "resume.pdf",
    // Nested namespace for terminal commands (alternative structure).
    "commandStrings"?: {
      "identity": "whoami",
      "experience": "kubectl get roles -n siyu",
      "projects": "kubectl get projects -n siyu",
      "skills": "kubectl get skills -n siyu"
    }
  },
  // ─── identity ──────────────────────────────────────────────────────────
  "identity": {
    "title": "Siyu An",
    "headline"?: "Software Engineer · cloud-platform engineering & operations",
    "tagline": "I am a Software Engineer specializing in..."
  },
  // ─── experience ──────────────────────────────────────────────────────────
  // Array of job/role entries. Ordered newest → oldest (current role first).
  "experience": [
    {
      "permissions": "string",   // Unix-style permission string (aesthetic), e.g. "drwxr-xr-x"
      "owner": "string",          // Owner column, typically "siyu" or "admin"
      "size": "string",           // File size (aesthetic), e.g. "2048B"
      "timestamp": "string",      // Date in short form, e.g. "08/2024"
      "name": "string",           // Entry name shown in table view, e.g. "INFOBLOX"
      "current"?: "boolean",      // If true, highlighted as the current/active role
      "title"?: "string",         // Full job title, e.g. "Software Engineer"
      "company"?: "string",       // Company/organization, e.g. "Infoblox Canada Inc."
      "dateRange"?: "string",     // Human-readable range, e.g. "08/2024 -> PRESENT"
      "highlights"?: ["Achievement 1", "Achievement 2"],
      "url"?: "string"            // Optional URL (company site or publication DOI)
    }
    // ... more entries
  ],
  // ─── projects ──────────────────────────────────────────────────────────
  "projects": [
    {
      "name": "string",           // Project system name, e.g. "GOARC_MCP"
      "version": "string",        // Semantic version, e.g. "v0.1.0"
      "status": "string",         // Status label, e.g. "ACTIVE", "BETA", "ARCHIVED"
      "description": "string",    // One-to-two sentence description.
      "tags": ["string"],         // Tech badges (use underscores), e.g. "Go_Lang"
      "license"?: "string",       // License identifier, e.g. "MIT_License"
      "url"?: "string"            // Optional URL opened when clicking the project card
    }
    // ... up to 4 projects recommended
  ],
  // ─── skills ──────────────────────────────────────────────────────────
  "skills": [
    {
      "name": "string",           // Skill name, e.g. "Go_Lang", "Kubernetes"
      "level": "number"           // Proficiency 0–100 (integer). Rendered as a bar.
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
The **appearance toggle** in the click menu switches between light and dark themes — persisted to localStorage.

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

Traffic light button colors (red `#ff5f57`, yellow `#febc2e`, green `#28c840`) match real macOS window controls. When a window is unfocused, the traffic lights render as neutral grey with no glyphs, and restore their color + glyphs on hover/focus.

---

## Project Structure

```
src/
├── config.ts                       ← Data source URL
├── App.tsx                         ← Root component
├── main.tsx                        ← Entry point
├── types/
│   └── portfolio.ts                ← TypeScript interfaces for data.json
├── styles/
│   ├── tokens.css                  ← Design tokens (colors, spacing, typography)
│   ├── base.css                    ← Global resets
│   ├── keyframes.css               ← Animations
│   └── misc.css                    ← Utility styles
├── hooks/
│   ├── use-portfolio-data.ts       ← Fetch and cache portfolio JSON
│   ├── use-theme.ts                ← Theme toggle with localStorage
│   └── use-intersection-observer.ts← Scroll-based animations
├── os/                             ← Operating-system UI layer
│   ├── boot/                       ← Startup boot sequence
│   ├── control-center/             ← Control Center (volume, lens filters, toggles)
│   ├── desktop/                    ← Desktop shell
│   │   ├── menu-bar/               ← Top menu bar (clock, icons, theme toggle)
│   │   ├── dock/                   ← App launcher dock
│   │   ├── icon/                   ← Desktop icons
│   │   ├── click-menu/             ← Right-click context menu
│   │   └── wallpaper/              ← Wallpaper + Wallpaper Gallery
│   ├── window/                     ← Window management (drag, resize, focus, traffic lights)
│   └── widget/                     ← Widget system
│       ├── WidgetFrame / WidgetLayer  ← Frame + draggable layer
│       ├── registry.ts             ← Widget catalog
│       ├── use-active-widgets.ts   ← Active-widget persistence (localStorage)
│       ├── gallery/                ← Widget Gallery ("Add Widgets")
│       └── clock/ calendar/ weather/ contact/ skills/ sticky/ featured/ terminal/ bootstrap/
├── apps/                           ← Windowed applications
│   ├── registry.ts                 ← App definitions
│   ├── terminal/                   ← Terminal app (shell/, vfs.ts, MatrixRain)
│   ├── finder/                     ← File browser app
│   ├── preview/                    ← Document viewer app
│   ├── arcade/                     ← Arcade hub + games (tetris/, puyo/)
│   └── section/                    ← Portfolio sections
│       └── about-me/ experience/ identity/ projects/ skills/ reveal/
public/
├── data.json                       ← Portfolio data
├── resume.pdf                      ← Resume asset
└── favicon.svg
```

> Each `os/` subsystem and widget lives in its own kebab-case directory with an `index.tsx`/`index.ts` entrance. Each arcade game (`tetris/`, `puyo/`) has its own README with game-specific details.

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

## Customizing Content

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
