import { Texture } from "pixi.js";
import { PIECE_COLORS, PIECES, TILE, type PieceType } from "../lib/config";

// ---------------------------------------------------------------------------
// Locked tetromino tile renderer — a self-contained "framed crystal tile":
//   dark grid line → bright beveled rim (top brightest, sides mid, bottom
//   darkest) → matte core with a subtle 「日」 inset (two shallow pits + a
//   slight middle ridge). Bevel/pit/ridge are drawn in SCREEN space and never
//   rotate; the tile is a fixed fill and only its position changes as a piece
//   rotates. Baked ONCE to an offscreen canvas and uploaded as a PIXI.Texture.
//   Ghost = focus/corner frame (nested strokes) in the piece's own colour.
// ---------------------------------------------------------------------------

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

/** Draw one framed-crystal tile at (x,y) with side length `s`. */
export function drawCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  piece: PieceType,
): void {
  const P = TILE;
  const base = PIECE_COLORS[piece];

  // Dark grid line (full cell), then inset the tile body by a hairline.
  ctx.fillStyle = lum(base, P.outline);
  ctx.fillRect(x, y, s, s);
  const inset = Math.max(1, s * 0.045);
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

/** Draw the ghost as a focus/corner frame (nested strokes) in the piece colour. */
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

function makeCanvas(size: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  return c;
}

export interface TileTextures {
  solid: Record<PieceType, Texture>;
  ghost: Record<PieceType, Texture>;
}

// Bake all tile + ghost textures at the given cell size (device-pixel aware).
export function bakeTiles(cellSize: number, resolution = 2): TileTextures {
  const size = Math.round(cellSize * resolution);
  const solid = {} as Record<PieceType, Texture>;
  const ghost = {} as Record<PieceType, Texture>;

  for (const type of PIECES) {
    const color = PIECE_COLORS[type];

    const c1 = makeCanvas(size);
    const ctx1 = c1.getContext("2d")!;
    ctx1.imageSmoothingEnabled = true;
    drawCell(ctx1, 0, 0, size, type);
    const t1 = Texture.from(c1);
    t1.source.scaleMode = "linear";
    solid[type] = t1;

    const c2 = makeCanvas(size);
    const ctx2 = c2.getContext("2d")!;
    ctx2.imageSmoothingEnabled = true;
    drawGhostCell(ctx2, 0, 0, size, color);
    const t2 = Texture.from(c2);
    t2.source.scaleMode = "linear";
    ghost[type] = t2;
  }

  return { solid, ghost };
}
