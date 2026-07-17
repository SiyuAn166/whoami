import { useSyncExternalStore } from "react";

export type FinderSection = "about" | "experience" | "projects" | "skills";

interface NavState {
  history: FinderSection[];
  index: number;
  sidebarOpen: boolean;
}

/**
 * Module-level Finder navigation store.
 *
 * The window titlebar (toolbar), the sidebar, the content pane and the path
 * bar are rendered as separate siblings by the WindowManager, so they cannot
 * share React component state. Finder is a singleton app, so a single shared
 * store is the clean way to keep the back/forward history, the current folder
 * and the sidebar toggle in sync across all four.
 */
/** Phones start with the sidebar collapsed so the content pane is visible;
 *  on wider screens it stays open like desktop macOS. */
const MOBILE_BP = 640;
const isNarrow = () =>
  typeof window !== "undefined" && window.innerWidth <= MOBILE_BP;

let state: NavState = {
  history: ["about"],
  index: 0,
  sidebarOpen: !isNarrow(),
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => state;

export function navigateTo(section: FinderSection) {
  if (state.history[state.index] === section) return;
  const history = state.history.slice(0, state.index + 1);
  history.push(section);
  state = {
    ...state,
    history,
    index: history.length - 1,
    // On phones the sidebar is a drawer overlaying the content — collapse
    // it once a destination is chosen so the pane is revealed.
    sidebarOpen: isNarrow() ? false : state.sidebarOpen,
  };
  emit();
}

export function goBack() {
  if (state.index <= 0) return;
  state = { ...state, index: state.index - 1 };
  emit();
}

export function goForward() {
  if (state.index >= state.history.length - 1) return;
  state = { ...state, index: state.index + 1 };
  emit();
}

export function toggleSidebar() {
  state = { ...state, sidebarOpen: !state.sidebarOpen };
  emit();
}

export function useFinderNav() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    section: s.history[s.index],
    canBack: s.index > 0,
    canForward: s.index < s.history.length - 1,
    sidebarOpen: s.sidebarOpen,
  };
}

export const SECTION_LABEL: Record<FinderSection, string> = {
  about: "About Me",
  experience: "Experience",
  projects: "Projects",
  skills: "Skills",
};
