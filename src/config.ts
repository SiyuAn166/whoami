/**
 * Data source URL configuration.
 *
 * The app reads `VITE_GIST_URL` from the environment.
 *
 * Behavior:
 * - Local development: uses `VITE_GIST_URL` from `.env` if provided
 * - Fallback: uses `/data.json` from the `public/` folder when `VITE_GIST_URL` is not set
 * - Production: uses `VITE_GIST_URL` injected during the GitHub Actions build
 *
 * Notes:
 * - Do not commit real `.env` or `.env.production` files to the repo
 * - Store the production value in GitHub Actions Variables
 * - Changes to the Gist content are reflected on page load because the app fetches the JSON at runtime
 */
export const GIST_URL =
  import.meta.env.VITE_GIST_URL ||
  // Base-aware: a bare "/data.json" 404s when the site is served from a
  // subpath (GitHub Pages deploys under /whoami/).
  `${import.meta.env.BASE_URL}data.json`;
