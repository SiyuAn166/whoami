// ============================================================================
// Message composition — maps an engine StepResult to independent display
// fields. The three competitive-Tetris dimensions are intentionally SEPARATE:
//
//   • label : the special-clear name (TETRIS / T-SPIN DOUBLE / ...) or null
//   • b2b   : Back-to-Back active — chains only between *difficult* clears
//             (Tetris & line-clearing T-spins); broken by normal clears
//   • ren   : combo counter — ANY line clear extends it; shown from the 2nd
//             consecutive clear (engine combo is 0 on the 1st, 1 on the 2nd)
//
// B2B and REN are independent axes and can appear together (e.g. a Tetris that
// is both back-to-back and mid-combo → label "TETRIS" + B2B badge + "2 REN").
// ============================================================================
import type { StepResult } from "./engine";

export interface ClearMessage {
  label: string | null; // special-clear name, e.g. "TETRIS"
  b2b: boolean; // Back-to-Back active this clear
  ren: number; // REN count (0 = not shown)
  /** Convenience: is there anything worth showing at all? */
  any: boolean;
}

export function composeMessage(result: StepResult): ClearMessage {
  const label = result.toast; // engine no longer glues B2B/REN into this
  const b2b = result.backToBack;
  const ren = result.combo >= 1 ? result.combo : 0;
  return { label, b2b, ren, any: !!label || b2b || ren > 0 };
}
