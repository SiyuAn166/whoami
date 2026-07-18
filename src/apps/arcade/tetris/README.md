# Tetris

A modern, guideline-style Tetris built with React and [Pixi.js](https://pixijs.com/) v8. It ships as a self-contained arcade app: the React layer owns the UI chrome (HUD, overlays, controls) while a framework-free Pixi scene renders the board, pieces, and effects. All game logic is pure and lives in `lib/`.

## Features

- Standard 10 × 20 playfield with a 2-row hidden spawn buffer
- 7-bag randomizer for fair piece distribution
- SRS-style rotation with wall kicks and T-spin detection
- Hold piece and a 5-piece next queue
- Ghost piece showing the hard-drop landing spot
- DAS / ARR tuned auto-shift and a soft-drop multiplier
- Lock delay with move/rotate reset cap
- Full scoring: line clears, T-spins, back-to-back, combos (REN), and all-clear bonus
- Level-based gravity curve
- Line-clear sweep animation, toasts, and sound effects
- Pause (Esc) menu and a game-over overlay with restart

## Controls

| Key          | Action                   |
| ------------ | ------------------------ |
| Left / Right | Move                     |
| Down         | Soft drop                |
| Up or X      | Rotate clockwise         |
| Z or Ctrl    | Rotate counter-clockwise |
| Space        | Hard drop                |
| C or Shift   | Hold                     |
| Esc          | Pause / resume           |

The Restart button lives in the HUD. Quit is available from the Pause and Game Over overlays when the app is launched with an `onQuit` handler.

## Scoring

Line and spin values are multiplied by `level + 1`. Back-to-back difficult clears (Tetris or line-clearing T-spins) apply a 1.5× multiplier.

| Clear              | Base points                    |
| ------------------ | ------------------------------ |
| Single             | 100                            |
| Double             | 300                            |
| Triple             | 500                            |
| Tetris             | 800                            |
| T-spin (no lines)  | 400                            |
| T-spin Single      | 800                            |
| T-spin Double      | 1200                           |
| T-spin Triple      | 1600                           |
| T-spin Mini        | 100                            |
| T-spin Mini Single | 200                            |
| Soft drop          | 1 per cell                     |
| Hard drop          | 2 per cell                     |
| Combo              | 50 × (combo − 1) × (level + 1) |
| All clear          | 2000 × (level + 1)             |

Level increases every 10 lines cleared, which speeds up gravity per the curve in `lib/config.ts`.

## Project structure

```
tetris/
├── index.tsx            # Public entrance: tetrisApp definition + re-exports (Game, Icon, config, engine, cover)
├── Game.tsx             # Wires the Pixi stage, sound, HUD, and overlays
├── Icon.tsx             # App icon
├── Tetris.css           # All scoped .tetris-* styling
├── components/
│   ├── Hud.tsx          # Score / level / lines + Restart button
│   └── Overlays.tsx     # Pause menu, Game Over panel, control hints
├── hook/
│   └── use-tetris-game.ts # Game loop, input handling, scoring, pause state
├── lib/
│   ├── config.ts        # Constants: dimensions, timing, scoring, colors, sounds
│   ├── engine.ts        # Pure rules: spawn, move, rotate, lock, clears, T-spin
│   ├── rng.ts           # 7-bag randomizer
│   ├── sound.ts         # SoundBank loader/player
│   └── types.ts         # Grid, Piece, Status, HudSnapshot, ClearKind
├── pixi/
│   ├── tetris-stage.ts  # Owns the Pixi Application and scene graph
│   ├── board-layer.ts   # Settled cells
│   ├── active-layer.ts  # Active piece + ghost
│   ├── side-layer.ts    # Hold + next queue
│   ├── fx-layer.ts      # Line-clear sweep, toasts
│   ├── tiles.ts         # Baked tile textures
│   └── coords.ts        # Cell ↔ pixel helpers
└── assets/
    ├── tetris-cover.png
    └── sound/*.wav
```

## Architecture

The game is split into three clean layers:

- Pure logic (`lib/`) has no React and no Pixi. `engine.ts` implements the rules and `use-tetris-game.ts` drives them from a single `requestAnimationFrame`-style ticker exposed by the stage.
- Rendering (`pixi/`) is framework-free. `TetrisStage` owns the Pixi `Application` and is driven only through its public methods (`syncBoard`, `setActive`, `setNext`, `flashRows`, `toast`, `onTick`). The canvas is transparent and letterboxed with `object-fit: contain`, so it scales with the window while the `.tetris-root` gradient shows through.
- UI (`components/`, `Game.tsx`) renders the HUD and overlays from a lightweight `HudSnapshot` and forwards user intents (restart, resume, quit) back down.

State flows one way: input and the ticker mutate the internal `GameState`, which is snapshotted into React state via `syncHud()` for rendering.

## Key configuration

Everything tunable lives in `lib/config.ts`:

- Board: `COLS = 10`, `VISIBLE_ROWS = 20`, `HIDDEN_ROWS = 2`, `CELL = 30`
- Queue: `NEXT_COUNT = 5`
- Timing (ms): `LOCK_DELAY = 500`, `MAX_LOCK_RESETS = 15`, `DAS = 150`, `ARR = 33`, `SOFT_DROP_FACTOR = 20`
- Gravity: per-level table in `gravityMs(level)`
- Scoring: the `SCORE` object and `LINES_PER_LEVEL = 10`
- Piece colors and tile bevel look: `PIECE_COLORS`, `TILE`

## Usage

Tetris is exported as an arcade app definition and as a standalone component:

```tsx
import { Game } from "./tetris";

// Standalone, with an optional quit handler
<Game onQuit={() => closeApp()} />;
```

Or register the app definition with the arcade hub:

```tsx
import { tetrisApp } from "./tetris";
```

## Development

This is a Vite project.

```bash
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
npm run preview  # preview the production build
```

Note on bundle size: Pixi.js is a large dependency (~550 kB minified, ~160 kB gzipped) and is isolated into its own chunk via `build.rollupOptions.output.manualChunks`. If the build warns about chunk size, that is expected for the Pixi chunk; raise `build.chunkSizeWarningLimit` if you want to silence it.

## Credits

Sound effects are carried over from the original project. Rendering and rules were rebuilt on Pixi v8 and React.
