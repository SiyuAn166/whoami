/** Titlebar toolbar (injected via renderToolbar, like Finder): centered title
 *  plus a round ? button on the right. Clicking it opens the in-game help via
 *  a window event — the toolbar and the game are separate React subtrees. */
export function TetrisToolbar() {
  return (
    <div className="tetris-toolbar">
      <span className="tetris-toolbar-title">Tetris</span>
      <button
        className="tetris-toolbar-help"
        onClick={() => window.dispatchEvent(new CustomEvent("tetris:help"))}
        aria-label="Help"
        title="Controls"
      >
        ?
      </button>
    </div>
  );
}
