// ============================================================================
// Tetris rendering — pure canvas drawing helpers.
// Every function here only READS a Tetris instance and paints; it never
// mutates game state or touches React. This keeps the game loop thin and
// makes the visuals easy to reason about / restyle in isolation.
// ============================================================================
import {
  COLS,
  HIDDEN_ROWS,
  ROWS,
  shape,
  type PieceType,
  type Tetris,
} from "./engine";
import { BOARD_H, BOARD_W, CELL } from "./tetrisConfig";
import { drawCell, drawGhostCell, PIECE_COLORS } from "./tetrominoRenderer";

/** Snapshot of the line-clear animation, passed in from the game loop. */
export interface ClearAnimation {
  active: boolean;
  rows: number[]; // visible-board row indices being wiped
  startedAt: number; // performance.now() when the wipe began
  durationMs: number;
}

/** Faint background grid. */
function drawGrid(ctx: CanvasRenderingContext2D) {
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

/** Locked blocks already settled on the board (visible rows only). */
function drawLocked(ctx: CanvasRenderingContext2D, game: Tetris) {
  for (let r = HIDDEN_ROWS; r < HIDDEN_ROWS + ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = game.grid[r][c];
      if (cell) drawCell(ctx, c * CELL, (r - HIDDEN_ROWS) * CELL, CELL, cell);
    }
  }
}

/** The falling piece and its ghost (landing preview). */
function drawActiveAndGhost(ctx: CanvasRenderingContext2D, game: Tetris) {
  const a = game.active;
  const gy = game.ghostY();
  const gcol = PIECE_COLORS[a.piece];
  shape(a.piece, a.rot).forEach(([x, y]) => {
    const ry = gy + y - HIDDEN_ROWS;
    if (ry >= 0) drawGhostCell(ctx, (a.x + x) * CELL, ry * CELL, CELL, gcol);
  });
  shape(a.piece, a.rot).forEach(([x, y]) => {
    const ry = a.y + y - HIDDEN_ROWS;
    if (ry >= 0) drawCell(ctx, (a.x + x) * CELL, ry * CELL, CELL, a.piece);
  });
}

/** Left-to-right bright sweep over the rows being cleared. */
function drawClearSweep(ctx: CanvasRenderingContext2D, anim: ClearAnimation) {
  const prog = Math.min(
    1,
    (performance.now() - anim.startedAt) / anim.durationMs,
  );
  const wipeX = prog * BOARD_W;
  for (const ry of anim.rows) {
    const y = ry * CELL;
    ctx.clearRect(0, y, wipeX, CELL);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const ex = Math.max(0, wipeX - 34);
    const grad = ctx.createLinearGradient(ex, 0, wipeX, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(1, "rgba(255,255,255,.85)");
    ctx.fillStyle = grad;
    ctx.fillRect(ex, y, wipeX - ex, CELL);
    ctx.restore();
  }
}

/**
 * Draw the whole playfield in one call.
 * `showActive` hides the falling piece/ghost while a clear animation plays.
 */
export function drawBoard(
  ctx: CanvasRenderingContext2D,
  game: Tetris | null,
  showActive: boolean,
  anim: ClearAnimation,
) {
  ctx.clearRect(0, 0, BOARD_W, BOARD_H);
  drawGrid(ctx);
  if (!game) return;
  drawLocked(ctx, game);
  if (showActive && !anim.active) drawActiveAndGhost(ctx, game);
  if (anim.active) drawClearSweep(ctx, anim);
}

/** Draw a single piece centered within a box (used by Hold and Next). */
export function drawMini(
  ctx: CanvasRenderingContext2D,
  piece: PieceType,
  boxW: number,
  boxH: number,
  offsetY: number,
  cell: number,
) {
  const cells = shape(piece, 0);
  const xs = cells.map((c) => c[0]);
  const ys = cells.map((c) => c[1]);
  const minx = Math.min(...xs);
  const maxx = Math.max(...xs);
  const miny = Math.min(...ys);
  const maxy = Math.max(...ys);
  const bw = (maxx - minx + 1) * cell;
  const bh = (maxy - miny + 1) * cell;
  const ox = (boxW - bw) / 2;
  const oy = offsetY + (boxH - bh) / 2;
  cells.forEach(([x, y]) =>
    drawCell(ctx, ox + (x - minx) * cell, oy + (y - miny) * cell, cell, piece),
  );
}
