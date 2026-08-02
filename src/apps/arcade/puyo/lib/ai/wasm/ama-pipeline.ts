// Pipelined move prefetch.
//
// WHY
// ---
// Commercial Puyo CPUs feel instant not because they think fast but because
// they think while you are not looking. The queue is known in advance, so the
// answer for move N+1 can be computed during move N's drop animation.
//
// This module owns that prediction. After committing move N it simulates the
// resulting board locally (applyPair + resolve, the same primitives the bench
// uses) and immediately fires an off-thread request for move N+1. When the
// game asks for the next move the answer is usually already sitting here.
//
// SAFETY
// ------
// A prefetch is only trusted if the board the game actually presents matches
// the board we predicted, byte for byte, AND the pair colours match. Any
// mismatch (garbage dropped, player interfered, resolve differed) discards the
// prediction and falls back to a live search. Prediction never overrides
// reality.

import {
  applyPair,
  type Board,
  cloneInto,
  createBoard,
  makeSimOut,
  resolve,
} from "../core/sim";
import { amaDecide, type AmaMove } from "./ama-client";

interface Prefetch {
  /** the board this prediction assumed */
  board: Board;
  /** the pair this prediction assumed, [axis, child] */
  pair: [number, number];
  promise: Promise<AmaMove | null>;
}

const simOut = makeSimOut();

export class AmaPipeline {
  private pending: Prefetch | null = null;
  private hits = 0;
  private misses = 0;
  /** whether the most recent decide() was served from a prediction */
  private lastHit = false;

  /** Discard any outstanding prediction (reset, seed change, game over). */
  invalidate(): void {
    this.pending = null;
    this.lastHit = false;
  }

  /**
   * Warm the very first move. Unlike prefetch() this predicts nothing: it
   * fires a search for the position exactly as it stands right now, so the
   * latency is spent while the player is still looking at a stationary board
   * (page load, seed reset) instead of after they press start.
   *
   * No-op when a prediction is already outstanding.
   */
  prime(
    board: Board,
    pairs: ReadonlyArray<readonly [number, number]>,
    palette: ReadonlyArray<number>,
  ): void {
    if (this.pending !== null || pairs.length === 0) return;

    const here = createBoard();
    cloneInto(board, here);
    const cur = pairs[0];

    this.pending = {
      board: here,
      pair: [cur[0], cur[1]],
      promise: amaDecide(board, pairs, palette),
    };
  }

  get stats(): { hits: number; misses: number } {
    return { hits: this.hits, misses: this.misses };
  }

  /** True when the last decide() was answered from a prediction. */
  get lastPrefetched(): boolean {
    return this.lastHit;
  }

  /**
   * Returns the move for `board`/`pairs`. Uses the prefetched answer when it
   * was computed for exactly this position, otherwise searches now.
   */
  async decide(
    board: Board,
    pairs: ReadonlyArray<readonly [number, number]>,
    palette: ReadonlyArray<number>,
  ): Promise<AmaMove | null> {
    const cur = pairs[0];
    const p = this.pending;
    this.pending = null;

    let move: AmaMove | null;
    if (
      p !== null &&
      sameBoard(p.board, board) &&
      p.pair[0] === cur[0] &&
      p.pair[1] === cur[1]
    ) {
      this.hits += 1;
      this.lastHit = true;
      move = await p.promise;
    } else {
      if (p !== null) this.misses += 1;
      this.lastHit = false;
      move = await amaDecide(board, pairs, palette);
    }

    if (move !== null && pairs.length > 1) {
      this.prefetch(board, pairs, palette, move);
    }
    return move;
  }

  /**
   * Simulate the committed move, then request the following one. Runs while
   * the game is still animating the current drop, so the latency is spent
   * against time the player is already watching.
   */
  private prefetch(
    board: Board,
    pairs: ReadonlyArray<readonly [number, number]>,
    palette: ReadonlyArray<number>,
    move: AmaMove,
  ): void {
    const next = pairs[1];
    if (!next) return;

    const future = createBoard();
    cloneInto(board, future);

    const cur = pairs[0];
    const placed = applyPair(
      future,
      move.column,
      move.rotation,
      cur[0],
      cur[1],
    );
    if (placed === null) return;
    resolve(future, simOut);

    // The pair after next is unknown to us here; feed the search the deepest
    // queue we can honestly supply. ama fills unseen tsumo itself.
    const futurePairs: Array<readonly [number, number]> = [next];
    for (let i = 2; i < pairs.length; i += 1) futurePairs.push(pairs[i]);

    this.pending = {
      board: future,
      pair: [next[0], next[1]],
      promise: amaDecide(future, futurePairs, palette),
    };
  }
}

function sameBoard(a: Board, b: Board): boolean {
  for (let i = 0; i < 84; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
