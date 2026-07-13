// ============================================================================
// Puyo rendering — pure canvas drawing helpers. Every function only READS the
// engine/grid and paints; never mutates state or touches React. Keeps the game
// loop thin and the look easy to restyle in isolation.
// ============================================================================
import {
  BOARD_H,
  BOARD_W,
  CELL,
  COLORS,
  COLS,
  FLASH_MS,
  HIDDEN_ROWS,
  PUYO_COLORS,
  ROWS,
  type PuyoColor,
} from "./config";
import { type Grid, type Pair } from "./engine";
// Jelly puyo sprite sheet: one square cell per colour, laid out in COLORS order
// (R, G, B, Y, P). Loaded once; the game loop redraws every frame so it pops in
// as soon as it decodes. The sprite carries the whole look — body, gloss, eyes.
import puyoSheetUrl from "../images/puyos.png";

const SPRITE_CELL = 418; // px per cell in puyos.png
const puyoSheet = new Image();
puyoSheet.src = puyoSheetUrl;
const COLOR_INDEX: Record<PuyoColor, number> = COLORS.reduce(
  (m, c, i) => ((m[c] = i), m),
  {} as Record<PuyoColor, number>,
);

/** Shift a hex colour toward white (d>0) or black (d<0) by fraction |d|. */
function lum(hex: string, d: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (d >= 0) {
    r += (255 - r) * d;
    g += (255 - g) * d;
    b += (255 - b) * d;
  } else {
    r += r * d;
    g += g * d;
    b += b * d;
  }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

/** Rounded-rectangle path helper (badge backgrounds). */
/** Draw one jelly puyo from the sprite sheet at cell (x,y) of side `s`. */
export function drawPuyo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  color: PuyoColor,
  alpha = 1,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (puyoSheet.complete && puyoSheet.naturalWidth > 0) {
    const sx = COLOR_INDEX[color] * SPRITE_CELL;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(puyoSheet, sx, 0, SPRITE_CELL, SPRITE_CELL, x, y, s, s);
  } else {
    // Fallback until the sheet decodes: a plain coloured disc so nothing is blank.
    const base = PUYO_COLORS[color];
    ctx.beginPath();
    ctx.arc(x + s / 2, y + s / 2, s * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = base;
    ctx.fill();
  }
  ctx.restore();
}

/** Cells currently blinking/popping during a chain link, plus elapsed ms. */
/** Ghost-clear prediction: does dropping here pop, and for how many chains. */
export interface Predict {
  willClear: boolean;
  chains: number;
  cells: [number, number][]; // absolute grid coords that pop on the immediate drop
}

export interface FlashState {
  cells: [number, number][]; // absolute grid coords (row includes hidden rows)
  t: number; // ms since the flash started
}

/**
 * Draw a puyo mid-clear: first ~68% of FLASH_MS it strobes white (blink), then
 * it shrinks + fades while a burst ring expands — the Champions-style pop.
 */
export function drawPuyoFlash(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  color: PuyoColor,
  t: number,
): void {
  const p = Math.min(1, t / FLASH_MS);
  const cx = x + s / 2;
  const cy = y + s / 2;
  const baseR = s * 0.45;
  if (p < 0.68) {
    drawPuyo(ctx, x, y, s, color);
    if (Math.floor(t / 65) % 2 === 0) {
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();
    }
  } else {
    const k = (p - 0.68) / 0.32; // 0 -> 1 across the pop
    const r = Math.max(0.1, baseR * (1 - k));
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - k);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = Math.max(0, 0.55 * (1 - k));
    ctx.lineWidth = Math.max(1, s * 0.06);
    ctx.strokeStyle = lum(PUYO_COLORS[color], 0.4);
    ctx.beginPath();
    ctx.arc(cx, cy, baseR * 0.6 + k * s * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * PPT-style "will clear" hint: draw the puyo normally, then pulse a white
 * overlay on top so the connected group about to pop softly strobes.
 */
export function drawPuyoBlink(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  color: PuyoColor,
  baseAlpha = 1,
): void {
  drawPuyo(ctx, x, y, s, color, baseAlpha);
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 105);
  ctx.save();
  ctx.globalAlpha = (0.12 + 0.5 * pulse) * baseAlpha;
  ctx.beginPath();
  ctx.arc(x + s / 2, y + s / 2, s * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();
}

function drawGrid(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = "rgba(255,255,255,.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL + 0.5, 0);
    ctx.lineTo(x * CELL + 0.5, BOARD_H);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL + 0.5);
    ctx.lineTo(BOARD_W, y * CELL + 0.5);
    ctx.stroke();
  }
}

/**
 * Draw the whole playfield. `pair` is the active falling pair (or null while a
 * chain resolves); `ghost` holds each puyo's settled resting cell (post-gravity).
 */
export function drawBoard(
  ctx: CanvasRenderingContext2D,
  grid: Grid | null,
  pair: Pair | null,
  ghost: { ax: number; ay: number; sx: number; sy: number } | null,
  flash: FlashState | null = null,
  predict: Predict | null = null,
  fall: Map<string, number> | null = null,
  pairOffsetPx = 0,
): void {
  ctx.clearRect(0, 0, BOARD_W, BOARD_H);
  drawGrid(ctx);
  if (!grid) return;

  const flashKeys = new Set<string>();
  if (flash) for (const [r, c] of flash.cells) flashKeys.add(r + "," + c);

  // Cells the CURRENT drop would pop — these blink (PPT-style "you can clear").
  const predictKeys = new Set<string>();
  if (predict && predict.willClear)
    for (const [r, c] of predict.cells) predictKeys.add(r + "," + c);

  // locked puyos (visible rows only) — flashing groups get the pop animation
  for (let r = HIDDEN_ROWS; r < HIDDEN_ROWS + ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = grid[r][c];
      if (!cell) continue;
      const px = c * CELL;
      const py =
        (r - HIDDEN_ROWS) * CELL + (fall ? (fall.get(r + "," + c) ?? 0) : 0);
      if (flash && flashKeys.has(r + "," + c))
        drawPuyoFlash(ctx, px, py, CELL, cell, flash.t);
      else if (predictKeys.has(r + "," + c))
        drawPuyoBlink(ctx, px, py, CELL, cell);
      else drawPuyo(ctx, px, py, CELL, cell);
    }
  }
  if (!pair) return;

  const satOff: Record<number, [number, number]> = {
    0: [0, -1],
    1: [1, 0],
    2: [0, 1],
    3: [-1, 0],
  };
  const [dx, dy] = satOff[pair.rot];

  // ghost (landing preview). Each puyo is drawn at its TRUE resting row after
  // gravity (settled independently per column), so a puyo that would fall into
  // a gap shows there instead of floating on the shared landing row. If a puyo
  // is part of a group that would pop, it blinks like the board puyos it
  // connects to (Puyo Puyo Tetris style).
  if (ghost) {
    const gAxisRy = ghost.ay - HIDDEN_ROWS;
    const gSatRy = ghost.sy - HIDDEN_ROWS;
    const gAxisKey = ghost.ay + "," + ghost.ax;
    const gSatKey = ghost.sy + "," + ghost.sx;
    if (gAxisRy >= 0) {
      if (predictKeys.has(gAxisKey))
        drawPuyoBlink(
          ctx,
          ghost.ax * CELL,
          gAxisRy * CELL,
          CELL,
          pair.axis,
          0.9,
        );
      else
        drawPuyo(ctx, ghost.ax * CELL, gAxisRy * CELL, CELL, pair.axis, 0.28);
    }
    if (gSatRy >= 0) {
      if (predictKeys.has(gSatKey))
        drawPuyoBlink(ctx, ghost.sx * CELL, gSatRy * CELL, CELL, pair.sat, 0.9);
      else drawPuyo(ctx, ghost.sx * CELL, gSatRy * CELL, CELL, pair.sat, 0.28);
    }
  }

  // active pair
  const axisRy = pair.y - HIDDEN_ROWS;
  const satRy = pair.y + dy - HIDDEN_ROWS;
  if (axisRy >= 0)
    drawPuyo(ctx, pair.x * CELL, axisRy * CELL + pairOffsetPx, CELL, pair.axis);
  if (satRy >= 0)
    drawPuyo(
      ctx,
      (pair.x + dx) * CELL,
      satRy * CELL + pairOffsetPx,
      CELL,
      pair.sat,
    );
}

/** Draw the Next queue — each pair stacked (satellite above axis) in its slot. */
export function drawNext(
  ctx: CanvasRenderingContext2D,
  pairs: Pair[],
  boxW: number,
  slotH: number,
  cell: number,
): void {
  pairs.forEach((p, i) => {
    const cx = (boxW - cell) / 2;
    const top = i * slotH + (slotH - cell * 2) / 2;
    drawPuyo(ctx, cx, top, cell, p.sat);
    drawPuyo(ctx, cx, top + cell, cell, p.axis);
  });
}
