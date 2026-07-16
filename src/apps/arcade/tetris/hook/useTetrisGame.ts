import { useCallback, useEffect, useRef, useState } from "react";
import {
  LOCK_DELAY,
  MAX_LOCK_RESETS,
  DAS,
  ARR,
  SOFT_DROP_FACTOR,
  gravityMs,
  SCORE,
  type PieceType,
} from "../lib/config";
import type { Grid, Piece, Status, HudSnapshot, ClearKind } from "../lib/types";
import {
  emptyGrid,
  spawnPiece,
  fits,
  move,
  rotate,
  lockPiece,
  ghostRow,
  fullRows,
  clearRows,
  isAllClear,
  detectTSpin,
  classify,
  baseScore,
  levelForLines,
} from "../lib/engine";
import { Bag } from "../lib/rng";
import { SoundBank } from "../lib/sound";
import { TetrisStage } from "../pixi/TetrisStage";

interface GameState {
  grid: Grid;
  piece: Piece | null;
  hold: PieceType | null;
  canHold: boolean;
  bag: Bag;
  status: Status;
  score: number;
  lines: number;
  level: number;
  combo: number;
  b2b: boolean;
  // timers
  gravAccum: number;
  lockAccum: number;
  lockResets: number;
  grounded: boolean;
  softDrop: boolean;
  lastActionRotate: boolean;
  lastKickIndex: number;
  // DAS/ARR
  dir: -1 | 0 | 1;
  dasAccum: number;
  arrAccum: number;
  charged: boolean;
}

const TOAST: Partial<Record<ClearKind, string>> = {
  tetris: "TETRIS!",
  tspin: "T-SPIN",
  "tspin-single": "T-SPIN SINGLE",
  "tspin-double": "T-SPIN DOUBLE",
  "tspin-triple": "T-SPIN TRIPLE",
  "tspin-mini": "T-SPIN MINI",
  "tspin-mini-single": "T-SPIN MINI",
};

export function useTetrisGame(
  stageRef: React.MutableRefObject<TetrisStage | null>,
  soundRef: React.MutableRefObject<SoundBank | null>,
  ready: boolean,
) {
  const gs = useRef<GameState | null>(null);
  const [hud, setHud] = useState<HudSnapshot>({
    score: 0,
    level: 0,
    lines: 0,
    combo: 0,
    status: "control",
  });

  const syncHud = useCallback(() => {
    const g = gs.current;
    if (!g) return;
    setHud({
      score: g.score,
      level: g.level,
      lines: g.lines,
      combo: g.combo,
      status: g.status,
    });
  }, []);

  const sound = useCallback(
    (name: Parameters<SoundBank["play"]>[0]) => {
      soundRef.current?.play(name);
    },
    [soundRef],
  );

  const drawActive = useCallback(() => {
    const g = gs.current;
    if (!g) return;
    const st = stageRef.current;
    if (!st) return;
    if (!g.piece) {
      st.clearActive();
      return;
    }
    st.setActive(g.piece, ghostRow(g.grid, g.piece));
  }, [stageRef]);

  const refreshQueue = useCallback(() => {
    const g = gs.current;
    if (!g) return;
    stageRef.current?.setNext(g.bag.peek(5));
    stageRef.current?.setHold(g.hold);
  }, [stageRef]);

  const spawn = useCallback(
    (type?: PieceType) => {
      const g = gs.current;
      if (!g) return;
      const t = type ?? g.bag.next();
      const p = spawnPiece(t);
      if (!fits(g.grid, p)) {
        // top-out ends the game
        g.piece = null;
        g.status = "gameover";
        stageRef.current?.clearActive();
        syncHud();
        return;
      }
      g.piece = p;
      g.canHold = true;
      g.grounded = false;
      g.lockAccum = 0;
      g.lockResets = 0;
      g.gravAccum = 0;
      g.lastActionRotate = false;
      g.status = "control";
      refreshQueue();
      drawActive();
      syncHud();
    },
    [drawActive, refreshQueue, stageRef, syncHud],
  );

  const resolveLock = useCallback(() => {
    const g = gs.current;
    if (!g || !g.piece) return;
    const tspin = detectTSpin(
      g.grid,
      g.piece,
      g.lastActionRotate,
      g.lastKickIndex,
    );
    g.grid = lockPiece(g.grid, g.piece);
    const rows = fullRows(g.grid);
    const n = rows.length;
    const kind = classify(n, tspin);

    // difficult clear = Tetris, or any T-spin / T-spin mini that clears >=1 line
    const difficult = kind === "tetris" || (kind.startsWith("tspin") && n > 0);
    // back-to-back only exists from the 2nd consecutive difficult clear onward
    const wasB2B = g.b2b;
    const isB2B = difficult && wasB2B;

    // scoring
    if (kind !== "none") {
      let pts = baseScore(kind) * (g.level + 1);
      if (isB2B) pts = Math.floor(pts * SCORE.b2bMultiplier);
      g.score += pts;
      // difficult clear sustains/starts the chain; a non-difficult LINE clear
      // breaks it; a clear of 0 lines leaves the chain untouched
      if (difficult) g.b2b = true;
      else if (n > 0) g.b2b = false;
    }

    // combo
    if (n > 0) {
      g.combo += 1;
      if (g.combo > 1)
        g.score += SCORE.comboUnit * (g.combo - 1) * (g.level + 1);
    } else {
      g.combo = 0;
    }

    g.lines += n;
    g.level = levelForLines(g.lines);

    // sounds + toast
    if (n === 4) sound("tetris");
    else if (kind.startsWith("tspin")) sound(n >= 2 ? "tspin3" : "tspin2");
    else if (n > 0) sound("lineClear");
    else sound("drop");
    const msg = TOAST[kind];
    if (msg) stageRef.current?.toast(msg);
    if (isB2B) {
      stageRef.current?.toast("BACK-TO-BACK", 0x8fd8ff);
    }
    if (g.combo > 1) stageRef.current?.toast(`${g.combo - 1} REN`, 0xffb0e0);

    g.piece = null;
    g.status = "resolving";
    syncHud();

    const finish = () => {
      const gg = gs.current;
      if (!gg) return;
      gg.grid = clearRows(gg.grid, rows);
      stageRef.current?.syncBoard(gg.grid);
      if (n > 0 && isAllClear(gg.grid)) {
        gg.score += SCORE.allClearBonus * (gg.level + 1);
        sound("allClear");
        stageRef.current?.toast("ALL CLEAR!", 0x9effa0);
      }
      spawn();
    };

    if (n > 0) {
      stageRef.current?.syncBoard(g.grid);
      stageRef.current?.flashRows(rows, finish);
    } else {
      stageRef.current?.syncBoard(g.grid);
      finish();
    }
  }, [sound, spawn, stageRef, syncHud]);

  const tryMove = useCallback(
    (dc: number) => {
      const g = gs.current;
      if (!g || !g.piece || g.status !== "control") return;
      const np = move(g.grid, g.piece, 0, dc);
      if (np) {
        g.piece = np;
        g.lastActionRotate = false;
        if (g.grounded && g.lockResets < MAX_LOCK_RESETS) {
          g.lockAccum = 0;
          g.lockResets++;
        }
        sound("move");
        drawActive();
      }
    },
    [drawActive, sound],
  );

  const tryRotate = useCallback(
    (dir: 1 | -1) => {
      const g = gs.current;
      if (!g || !g.piece || g.status !== "control") return;
      const res = rotate(g.grid, g.piece, dir);
      if (res) {
        g.piece = res.piece;
        g.lastActionRotate = true;
        g.lastKickIndex = res.kickIndex;
        if (g.grounded && g.lockResets < MAX_LOCK_RESETS) {
          g.lockAccum = 0;
          g.lockResets++;
        }
        sound("rotate");
        drawActive();
      }
    },
    [drawActive, sound],
  );

  const softDrop = useCallback((on: boolean) => {
    const g = gs.current;
    if (!g) return;
    // Clear any gravity accumulated under the previous (slower) rate so
    // switching soft-drop on can't dump several leftover cells at once.
    if (on !== g.softDrop) g.gravAccum = 0;
    g.softDrop = on;
  }, []);

  const hardDrop = useCallback(() => {
    const g = gs.current;
    if (!g || !g.piece || g.status !== "control") return;
    const dest = ghostRow(g.grid, g.piece);
    const dist = dest.r - g.piece.r;
    g.score += dist * SCORE.hardDropPerCell;
    g.piece = dest;
    g.lastActionRotate = false;
    sound("hardDrop");
    resolveLock();
  }, [resolveLock, sound]);

  const holdPiece = useCallback(() => {
    const g = gs.current;
    if (!g || !g.piece || !g.canHold || g.status !== "control") return;
    const cur = g.piece.type;
    sound("hold");
    if (g.hold == null) {
      g.hold = cur;
      g.canHold = false;
      spawn();
    } else {
      const swap = g.hold;
      g.hold = cur;
      g.canHold = false;
      spawn(swap);
    }
    g.canHold = false;
    refreshQueue();
  }, [refreshQueue, sound, spawn]);

  const reset = useCallback(() => {
    const st = stageRef.current;
    gs.current = {
      grid: emptyGrid(),
      piece: null,
      hold: null,
      canHold: true,
      bag: new Bag(),
      status: "control",
      score: 0,
      lines: 0,
      level: 0,
      combo: 0,
      b2b: false,
      gravAccum: 0,
      lockAccum: 0,
      lockResets: 0,
      grounded: false,
      softDrop: false,
      lastActionRotate: false,
      lastKickIndex: 0,
      dir: 0,
      dasAccum: 0,
      arrAccum: 0,
      charged: false,
    };
    st?.syncBoard(gs.current.grid);
    spawn();
    syncHud();
  }, [spawn, stageRef, syncHud]);

  // ---- main tick ----
  const tick = useCallback(
    (dtMs: number) => {
      const g = gs.current;
      if (!g) return;
      if (g.status !== "control" || !g.piece) return;

      // DAS / ARR horizontal auto-shift
      if (g.dir !== 0) {
        if (!g.charged) {
          g.dasAccum += dtMs;
          if (g.dasAccum >= DAS) {
            g.charged = true;
            g.arrAccum = 0;
          }
        } else {
          g.arrAccum += dtMs;
          while (g.arrAccum >= ARR) {
            g.arrAccum -= ARR;
            tryMove(g.dir);
          }
        }
      }

      const grav = gravityMs(g.level) / (g.softDrop ? SOFT_DROP_FACTOR : 1);
      {
        g.gravAccum += dtMs;
        while (g.gravAccum >= grav) {
          g.gravAccum -= grav;
          const np = move(g.grid, g.piece, 1, 0);
          if (np) {
            g.piece = np;
            if (g.softDrop) g.score += SCORE.softDropPerCell;
            g.grounded = false;
            drawActive();
          } else {
            g.grounded = true;
            break;
          }
        }
      }

      // lock delay
      const canFall = !!move(g.grid, g.piece, 1, 0);
      if (!canFall) {
        g.grounded = true;
        g.lockAccum += dtMs;
        if (g.lockAccum >= LOCK_DELAY || g.lockResets >= MAX_LOCK_RESETS) {
          resolveLock();
        }
      } else {
        g.grounded = false;
        g.lockAccum = 0;
      }
    },
    [drawActive, resolveLock, tryMove],
  );

  // keep latest tick in a ref so the ticker callback is stable
  const tickRef = useRef(tick);
  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  // wire exactly one ticker callback once the stage is ready
  useEffect(() => {
    if (!ready) return;
    const st = stageRef.current;
    if (!st) return;
    st.onTick((dt) => tickRef.current(dt));
    return () => st.offTick();
  }, [ready, stageRef]);

  // ---- keyboard ----
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const g = gs.current;
      if (!g) return;
      soundRef.current?.resume();
      switch (e.code) {
        case "ArrowLeft":
          if (g.dir !== -1) {
            g.dir = -1;
            g.charged = false;
            g.dasAccum = 0;
            tryMove(-1);
          }
          e.preventDefault();
          break;
        case "ArrowRight":
          if (g.dir !== 1) {
            g.dir = 1;
            g.charged = false;
            g.dasAccum = 0;
            tryMove(1);
          }
          e.preventDefault();
          break;
        case "ArrowDown":
          softDrop(true);
          e.preventDefault();
          break;
        case "ArrowUp":
        case "KeyX":
          tryRotate(1);
          e.preventDefault();
          break;
        case "KeyZ":
        case "ControlLeft":
        case "ControlRight":
          tryRotate(-1);
          e.preventDefault();
          break;
        case "Space":
          hardDrop();
          e.preventDefault();
          break;
        case "KeyC":
        case "ShiftLeft":
        case "ShiftRight":
          holdPiece();
          e.preventDefault();
          break;
        default:
          break;
      }
    };
    const up = (e: KeyboardEvent) => {
      const g = gs.current;
      if (!g) return;
      switch (e.code) {
        case "ArrowLeft":
          if (g.dir === -1) {
            g.dir = 0;
            g.charged = false;
          }
          break;
        case "ArrowRight":
          if (g.dir === 1) {
            g.dir = 0;
            g.charged = false;
          }
          break;
        case "ArrowDown":
          softDrop(false);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [hardDrop, holdPiece, softDrop, soundRef, tryMove, tryRotate]);

  return { hud, reset };
}
