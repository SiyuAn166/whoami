// ============================================================================
// Tetris picture assets — mirrors the per-asset-import pattern in sound.ts,
// minus the runtime loader: images don't need a fetch+decode step, the
// browser's native <img>/background-image loading is enough.
//
// To swap in real art: replace the file at its existing path (same name and
// extension) — nothing below needs to change. A different filename or
// extension only means editing that one import line.
// ============================================================================
import {
  CLEAR_ALLCLEAR,
  CLEAR_TETRIS,
  CLEAR_TSPIN,
  CLEAR_TSPIN_DOUBLE,
  CLEAR_TSPIN_MINI,
  CLEAR_TSPIN_MINI_DOUBLE,
  CLEAR_TSPIN_MINI_SINGLE,
  CLEAR_TSPIN_SINGLE,
  CLEAR_TSPIN_TRIPLE,
  type ClearType,
} from "./config";

import shellBgUrl from "../assets/images/backgrounds/shell.png";
import playfieldBgUrl from "../assets/images/backgrounds/playfield.svg";
import panelBgUrl from "../assets/images/backgrounds/panel.svg";

import gameOverUrl from "../assets/images/messages/game-over.svg";
import pausedUrl from "../assets/images/messages/paused.svg";
import controlsUrl from "../assets/images/messages/controls.svg";

import tspinMiniUrl from "../assets/images/badges/tspin-mini.svg";
import tspinMiniSingleUrl from "../assets/images/badges/tspin-mini-single.svg";
import tspinMiniDoubleUrl from "../assets/images/badges/tspin-mini-double.svg";
import tspinUrl from "../assets/images/badges/tspin.svg";
import tspinSingleUrl from "../assets/images/badges/tspin-single.svg";
import tspinDoubleUrl from "../assets/images/badges/tspin-double.svg";
import tspinTripleUrl from "../assets/images/badges/tspin-triple.svg";
import tetrisUrl from "../assets/images/badges/tetris.svg";
import allClearUrl from "../assets/images/badges/allclear.svg";
import b2bUrl from "../assets/images/badges/b2b.svg";

/** Picture backgrounds for the shell backdrop, playfield frame, and side panels. */
export const BACKGROUND_IMAGE = {
  shell: shellBgUrl,
  playfield: playfieldBgUrl,
  panel: panelBgUrl,
};

/** Overlay screen title graphics. */
export const MESSAGE_IMAGE = {
  gameOver: gameOverUrl,
  paused: pausedUrl,
  controls: controlsUrl,
};

/** Clear-type toast badges, keyed by the same ClearType union sfxClear() uses. */
export const CLEAR_BADGE_IMAGE: Partial<Record<ClearType, string>> = {
  [CLEAR_TSPIN_MINI]: tspinMiniUrl,
  [CLEAR_TSPIN_MINI_SINGLE]: tspinMiniSingleUrl,
  [CLEAR_TSPIN_MINI_DOUBLE]: tspinMiniDoubleUrl,
  [CLEAR_TSPIN]: tspinUrl,
  [CLEAR_TSPIN_SINGLE]: tspinSingleUrl,
  [CLEAR_TSPIN_DOUBLE]: tspinDoubleUrl,
  [CLEAR_TSPIN_TRIPLE]: tspinTripleUrl,
  [CLEAR_TETRIS]: tetrisUrl,
  [CLEAR_ALLCLEAR]: allClearUrl,
};

/** Back-to-back sticker badge. */
export const B2B_BADGE_IMAGE = b2bUrl;
