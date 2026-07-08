// ============================================================================
// Locked tetromino tile renderer. A single tile is a self-contained "framed
// crystal tile": dark grid line → bright beveled rim (top brightest, sides
// mid, bottom darkest) → matte core with a subtle 「日」 inset (two shallow
// pits + a slight middle ridge). The bevel/pit/ridge are drawn in SCREEN
// space and never rotate — the tile is a fixed fill; only its position
// changes as a piece rotates. Look parameters (TILE_PARAMS) and the piece
// colour palette (PIECE_COLORS) live in tetrisConfig.ts.
// ============================================================================

import { PIECE_COLORS, TILE_PARAMS, type PieceType } from "./config";

/** Shift a hex colour toward white (d>0) or black (d<0) by fraction |d|. */
export function lum(hex: string, d: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
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

/**
 * Draw one tile at (x,y) with side length `s` for the given piece colour.
 * Pure canvas 2D — used for the board, ghost, hold and next previews alike.
 */
export function drawCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  piece: PieceType,
): void {
  const P = TILE_PARAMS;
  const base = PIECE_COLORS[piece];

  // Dark grid line (full cell), then inset the tile body by a hairline.
  ctx.fillStyle = lum(base, P.outline);
  ctx.fillRect(x, y, s, s);
  const inset = P.gridLine ? Math.max(1, s * 0.045) : 0;
  const x0 = x + inset,
    y0 = y + inset,
    ss = s - inset * 2;

  // Beveled rim — four trapezoids around a matte core.
  const bev = ss * P.bevel;
  const cx = x0 + bev,
    cy = y0 + bev,
    cs = ss - bev * 2;
  // top (brightest)
  ctx.fillStyle = lum(base, P.topRim);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0 + ss, y0);
  ctx.lineTo(cx + cs, cy);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fill();
  // left (mid)
  ctx.fillStyle = lum(base, P.sideRim);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx, cy + cs);
  ctx.lineTo(x0, y0 + ss);
  ctx.closePath();
  ctx.fill();
  // right (mid-dark)
  ctx.fillStyle = lum(base, P.sideRim - 0.14);
  ctx.beginPath();
  ctx.moveTo(x0 + ss, y0);
  ctx.lineTo(x0 + ss, y0 + ss);
  ctx.lineTo(cx + cs, cy + cs);
  ctx.lineTo(cx + cs, cy);
  ctx.closePath();
  ctx.fill();
  // bottom (shadow)
  ctx.fillStyle = lum(base, P.bottomRim);
  ctx.beginPath();
  ctx.moveTo(x0, y0 + ss);
  ctx.lineTo(cx, cy + cs);
  ctx.lineTo(cx + cs, cy + cs);
  ctx.lineTo(x0 + ss, y0 + ss);
  ctx.closePath();
  ctx.fill();

  // Matte core.
  ctx.fillStyle = base;
  ctx.fillRect(cx, cy, cs, cs);

  // 「日」 inset: two shallow pits (upper/lower) + a slight middle ridge.
  const half = cs / 2;
  const gTop = ctx.createLinearGradient(0, cy, 0, cy + half);
  gTop.addColorStop(0, lum(base, -P.pit));
  gTop.addColorStop(1, lum(base, P.pit * 0.5));
  ctx.fillStyle = gTop;
  ctx.fillRect(cx, cy, cs, half);
  const gBot = ctx.createLinearGradient(0, cy + half, 0, cy + cs);
  gBot.addColorStop(0, lum(base, -P.pit));
  gBot.addColorStop(1, lum(base, P.pit * 0.5));
  ctx.fillStyle = gBot;
  ctx.fillRect(cx, cy + half, cs, half);
  const bar = cs * P.middleBar * 2;
  const gBar = ctx.createLinearGradient(0, cy + half - bar, 0, cy + half + bar);
  gBar.addColorStop(0, lum(base, P.pit * 0.6));
  gBar.addColorStop(1, lum(base, -P.pit * 0.4));
  ctx.fillStyle = gBar;
  ctx.fillRect(cx, cy + half - bar, cs, bar * 2);
}

/**
 * Draw the ghost piece as a focus/corner frame (four L-shaped corners) in the
 * piece's own colour, instead of a translucent solid block.
 */
export function drawGhostCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  color: string,
) {
  const o = s * 0.08;
  const i = s * 0.2;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineJoin = "miter";

  ctx.globalAlpha = 0.55;
  ctx.lineWidth = Math.max(1.6, s * 0.07);
  ctx.strokeRect(x + o, y + o, s - o * 2, s - o * 2);

  ctx.globalAlpha = 0.25;
  ctx.lineWidth = Math.max(1, s * 0.05);
  ctx.strokeRect(x + i, y + i, s - i * 2, s - i * 2);

  ctx.restore();
}
