# Puyo — PixiJS v8 rewrite (whoami arcade app)

A full rewrite of the `whoami` arcade Puyo app. Canvas2D → **PixiJS v8 (WebGL)**.
Visual skin faithfully ported from **puyogg/puyosim-gg** (MIT code; SEGA image
assets, personal/non-distributed use only). Self-contained: drop this folder in
to replace the old `puyo/` and the rest of the repo compiles unchanged.

> If you're an AI assistant picking this project up in a fresh conversation:
> this README is the single source of truth for architecture, the public
> contract, all tunable numbers, and the fix history. Read it fully first.

---

## 1. Public contract (DO NOT BREAK — the rest of whoami depends on these)

The arcade `Hub.tsx` only imports:

- `import { Game } from "./puyo"` — signature `({ onQuit }: { onQuit?: () => void })`
- `import { Icon } from "./puyo/Icon"` — signature `({ size }: { size?: number })`

`index.tsx` also exports `puyoApp` (an `AppDefinition` from `../../types`) for
standalone launch, plus re-exports config/engine/types for any pure-logic callers.

`puyoApp` shape (must stay identical): `id:"puyo"`, `name:"Puyo"`, `icon:<Icon/>`,
`showOnDesktop:false`, `defaultSize:{w:600,h:780}`, and a `render(ctx,onClose)` that
returns `<Game onQuit={onClose}/>`. Uses `w`/`h` keys (not width/height).

As long as `index.tsx` exports `{ Game, puyoApp }` and `Icon.tsx` exports `{ Icon }`,
deleting the old dir and dropping this one in requires **zero** changes elsewhere.

---

## 2. Install / integrate (3 steps)

1. `rm -rf src/apps/arcade/puyo` then drop this `puyo/` in its place.
2. `npm i pixi.js@^8` ← the ONLY action outside the puyo folder.
3. Put the asset files into `puyo/assets/` (see section 6). Then restart
   `npm run dev` (Vite only picks up new `import.meta.url` assets on restart).

Build: `npm run build` (= `tsc -b && vite build`).

---

## 3. Directory structure

```
puyo/
├── index.tsx         # public entrance: Game / Icon / puyoApp (the contract)
├── Icon.tsx          # Icon({size}) — aqua water-drop SVG
├── Game.tsx          # <Game onQuit>: ModeSelect -> board + HUD + overlays
├── Puyo.css          # aqua theme, all scoped under .puyo-root
├── INTEGRATION.md    # install notes (subset of this README)
├── README.md         # THIS FILE
├── lib/              # pure logic — no Pixi, no React, no DOM
│   ├── types.ts      # Cell / Color / Mode / Grid / Piece / ChainStep
│   ├── config.ts     # board dims, colors, TIMING, STAGE layout, Tsu scoring
│   ├── rng.ts        # color sequence generator
│   └── engine.ts     # Puyo class: rotation+kicks, gravity, flood-fill, chain resolve, scoring
├── pixi/             # PixiJS v8 render layer
│   ├── puyo-stage.ts # owns Application; init()/destroy()/resize(); wires layers; setGhostEnabled
│   ├── assets.ts     # loads atlases via import.meta.url; frame-name helpers
│   ├── coords.ts     # cell <-> pixel helpers
│   ├── field-frame.ts# field border (layout.png) + field_lgn.png background + well
│   ├── puyo-layer.ts # settled puyos, connection sprites, drop + landing-bounce anim
│   ├── active-layer.ts# falling pair + ghost preview (ghost off in practice)
│   ├── next-window.ts# next / next-next preview
│   ├── chain-counter.ts# chain-count popup ("N 連鎖", chain_font)
│   ├── score-display.ts# score readout (8-digit zero-padded, e.g. 00012020)
│   └── fx-layer.ts   # burst particles
├── hook/
│   └── use-puyo-game.ts# state machine: ticker loop, DAS/ARR input, practice/play, phases
├── components/
│   ├── ModeSelect.tsx# practice / play entry screen
│   ├── Hud.tsx       # slim HUD (score/next/chain live in the canvas)
│   └── Overlays.tsx  # Pause / Help / GameOver
└── assets/           # self-contained (you drop the PNGs/JSONs here)
    └── README.md
```

Layering: `lib/` (pure) → `pixi/` (render) → `hook/` (loop+input+modes) → `Game.tsx` (React shell).

---

## 4. Gameplay — two modes (chosen entry: ModeSelect first)

- **Practice**: no gravity, no auto-fall, no ghost. Arrow keys place the pair;
  it auto-locks after `lockDelay` once grounded (no key needed). If a placement
  makes a group of 4+, chains resolve automatically — same as play.
- **Play**: full gravity, soft drop, lock delay, Puyo Puyo Tsu scoring, ghost ON.

Both modes share the SAME engine; only the gravity/ghost switch differs (set in
`hook/use-puyo-game.ts` init via `stage.setGhostEnabled(mode === "play")`).

Board: 6 cols × 13 rows (1 hidden top row), 4 active colors (of 5 available),
spawn column index 2 (`SPAWN_COL`), death mark (`death_X.png`) drawn there.

Scoring: standard Puyo Tsu — `10 * cleared * clamp(chainPower + colorBonus +
groupBonus, 1, 999)`, all-clear +3600. Lives in `lib/engine.ts` / `lib/config.ts`.

---

## 5. Tunable numbers (all in lib/config.ts unless noted)

### TIMING

| key             | default | meaning                                                       |
| --------------- | ------- | ------------------------------------------------------------- |
| `gravity`       | 780     | ms per row of natural fall (play mode)                        |
| `softDrop`      | 45      | ms per row while holding Down                                 |
| `lockDelay`     | 480     | ms grounded before lock (also practice auto-place)            |
| `das`           | 150     | ms before key-repeat starts                                   |
| `arr`           | 32      | ms between repeated moves                                     |
| `popMs`         | 320     | flash-to-burst duration of a clearing group                   |
| `dropPerRowMs`  | 46      | LINEAR fall speed, ms/row — used by split-drop AND chain-drop |
| `bounceFrameMs` | 22      | ms per squash/stretch frame on landing                        |
| `bounceMs`      | 308     | total landing bounce = 14 frames × bounceFrameMs              |
| `settlePause`   | 90      | pause between chain steps                                     |
| `chainPopupMs`  | 900     | how long the "N 連鎖" popup stays                             |

### STAGE (layout, frame-relative offsets add frameX:16 / frameY:20)

- canvas `width:640, height:880`
- `next: { x:452, y:56 }` — next-window position. x↑ right, y↑ down.

### Landing bounce (the "sticky" feel — puyo-layer.ts)

Mechanism (ported from puyosim-gg): puyos fall at CONSTANT speed
(`dropPerRowMs`/row), then on landing play a texture-frame sequence
`SHORT_BOUNCE = ['h','0','v','v','0','0','h','h','0','v','v','0','0','0']`
where `_h` = horizontal squash, `_v` = vertical stretch, `_0` = normal. NOT a
scale tween, NOT an easing curve. Every placed puyo bounces (both of the pair,
even the one that didn't split-drop — via the `forceBounce` set).

### next-window puyo positions (next-window.ts, ~line 28)

```
layouts = [
  { cx: WIN_W/2,   cy: 78,  scale: 0.92 },  // group 1 (big, top)
  { cx: WIN_W/2+6, cy: 210, scale: 0.62 },  // group 2 (small, bottom)
]
```

Intra-pair half-gap is the `30` at ~line 42 (`cy ± 30*scale`).

### score format (score-display.ts)

`padStart(8,"0")` → `00012020` (zero-padded, no commas). Uses stroked bold Text;
for pixel-exact bitmap font, add `scoreFont.json` + `num_font_d4444.png`.

---

## 6. Assets (self-contained; you must drop them in)

Loaded by `pixi/assets.ts` via `new URL(..., import.meta.url)` — Vite bundles
them; no `/public`, no tsconfig flags. Flat in `puyo/assets/`:

| file              | required | purpose                                             |
| ----------------- | -------- | --------------------------------------------------- |
| `puyo_aqua.png`   | YES      | puyo pieces, aqua skin                              |
| `puyo.json`       | YES      | puyo atlas (shared Nexus layout, 64×60 frames)      |
| `layout.png`      | optional | field frame + next-window borders                   |
| `layout.json`     | optional | layout atlas                                        |
| `chain_font.png`  | optional | chain-count digits                                  |
| `chain_font.json` | optional | chain-font atlas                                    |
| `field_lgn.png`   | optional | field background art (user-supplied, purple splash) |

Missing optional files degrade gracefully: field frame → drawn border, chain
popup → text label, background → dark-blue well. `puyo_aqua.png`+`puyo.json` required.

Download (from repo root):

```
cd src/apps/arcade/puyo/assets
BASE=https://raw.githubusercontent.com/puyogg/puyosim-gg/master/static/sim_assets/img
curl -L -o puyo_aqua.png  "$BASE/puyo/puyo_aqua.png"
curl -L -o puyo.json      "$BASE/puyo.json"
curl -L -o layout.png     "$BASE/layout.png"
curl -L -o layout.json    "$BASE/layout.json"
curl -L -o chain_font.png "$BASE/chain_font.png"
curl -L -o chain_font.json "$BASE/chain_font.json"
# field_lgn.png: user-supplied, copy your own file in with this exact name
```

### Atlas frame naming (from puyo.json, all skins share this layout)

- pieces: `{color}_{mask}.png`, color ∈ {red,green,blue,yellow,purple},
  mask 0-15 bitfield: **down=1, up=2, right=4, left=8**
- `{color}_burst_0/1.png` (burst), `shadow_{color}.png` (ghost),
  `{color}_h.png`/`{color}_v.png` (landing squash/stretch), `{color}_0.png` (plain),
  `death_X.png` (spawn-column death mark), `spacer_0.png` (fallback).

---

## 7. Fix history (bugs already resolved — don't reintroduce)

1. `label` field name collided with Container's built-in `label:string` in
   `fx-layer.ts` (→ `chainLabel`) and `score-display.ts` (→ `scoreLabel`).
2. Removed vertical column grid lines from `field-frame.ts`.
3. Ghost disabled in practice mode; play-mode ghost uses real puyo sprite
   `puyoFrame(color,0)` @ alpha ~0.35 (NOT the `shadow_*` spacer, which showed empty).
4. Next window repositioned (`STAGE.next` y 28→56); death mark uses atlas
   `death_X.png` (NOT hand-drawn Graphics).
5. Practice auto-place: grounded → lockDelay → auto beginResolve (no Space needed).
6. Landing bounce: replaced `easeOutBounce`/`easeOutCubic` tween with the
   puyosim-gg constant-fall + `_h`/`_v`/`_0` frame sequence. Applies to BOTH
   placed puyos (forceBounce), not just split-dropped ones.
7. Connection-sprite timing: while a puyo is still falling/bouncing it's treated
   as empty in the connection-mask calc, so neighbors don't grow a connection
   toward a puyo that hasn't settled. Each puyo joins connections only after its
   own bounce finishes.
8. `setGhostEnabled` null-guard: init() is async (await app.init + loadAssets),
   so `this.active` may not exist when the hook calls it — state is remembered in
   `ghostEnabled` and applied once active is built.
9. Score format: `toLocaleString` (12,020) → `padStart(8,"0")` (00012020).
10. field_lgn.png background: loaded as single texture, cover-fit into the well,
    clip-masked so it doesn't overflow the border, dim scrim on top for readability.

---

## 8. Environment note / caveats

- The assistant's sandbox has NO network and no pixi/react types, so the bundle
  was NOT compiled there — validated by manual review + brace-balance checks.
  First `tsc`/`vite` after install may surface minor type details; paste them back.
- Pixi v8 API: `await app.init()`, `Assets.load`, no `PIXI.Loader`, no
  `renderer.plugins`. puyosim-gg is Pixi v5, so its code was translated, not copied.
- puyosim-gg is a chain SIMULATOR (no falling/locking); "auto-place" and the
  death-X are standard falling-game features implemented to match Puyo Puyo Tetris.

---

## 9. Not done yet / possible next

- Tetris sibling app: PixiJS v8 rewrite, no practice mode (engine/config with
  SRS/T-spin/B2B reusable; swap Canvas2D render.ts/tileRenderer.ts for Pixi).
- Optional bitmap score font (scoreFont.json + num_font_d4444.png).
- Garbage tray is cosmetic/empty in single-player (no opponent sends garbage).
