// src/services/cases/poolClaimWindow.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 650: the claim window for a pool case (components/Worklist/PoolClaimModal.tsx) has two buttons, Accept
// (assigns the case: case:pool:claim) and Pass (case:pool:pass). "Accept case" (Alt+A) and "Pass case" (Ctrl+Alt+P) are
// registered in the action registry, but two things kept them from working:
//   1. They are filed under the report screen's context (SYNOPTIC), and the window opens over the Worklist, whose
//      context is WORKLIST, so neither phrase nor key was eligible there. While the window is open it takes the
//      SYNOPTIC context (POOL_WINDOW_VOICE_CONTEXT) and hands the host's back when it closes.
//   2. The listener ran whatever step the window was in, even "checking availability", "someone else has it" or
//      "access required", where no Accept or Pass button is showing, and whether or not the buttons were greyed.
//
// resolvePoolWindowAction answers like the buttons: Accept or Pass only once the window is ready (the claim hold is
// taken and the buttons are showing), and only if the person holds the capability the button is greyed by. The
// handlers it leads to are the buttons' own (acceptPoolCase / passPoolCase in poolCaseActions.ts), which check the
// capability again and audit it.
// ─────────────────────────────────────────────────────────────────────────────
import { VOICE_CONTEXT } from '@/constants/systemActions';

/** The context the registry files Accept / Pass under; the window takes it while it is open. */
export const POOL_WINDOW_VOICE_CONTEXT = VOICE_CONTEXT.SYNOPTIC;

export type PoolWindowStep = 'claiming' | 'ready' | 'blocked' | 'access-denied' | 'accepting' | 'passing';

export interface PoolWindowFacts {
  step: PoolWindowStep;
  /** Holds case:pool:claim for this case (Accept is greyed otherwise). */
  canClaim: boolean;
  /** Holds case:pool:pass for this case (Pass is greyed otherwise). */
  canPass: boolean;
}

/** The button the command presses, or null when it is ignored. */
export function resolvePoolWindowAction(actionId: string, facts: PoolWindowFacts): 'accept' | 'pass' | null {
  if (facts.step !== 'ready') return null;
  if (actionId === 'POOL_ACCEPT_CASE') return facts.canClaim ? 'accept' : null;
  if (actionId === 'POOL_PASS_CASE') return facts.canPass ? 'pass' : null;
  return null;
}
