// src/services/reports/signOutAndNext.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 664 (Pete): "Sign Out and Next" for Orchestration cases. One flow: the sign-out checks, the signature window and the
// sign-out itself are exactly Sign Out Case's (nothing is skipped or shortened), and when the case has been signed out the
// screen opens the next case in the person's queue (the list of cases the Worklist handed over, as Save & Next uses).
//
// The button arms the flow and then does what the plain action does (Sign Out Case, or Finalise in Assist). The screen acts
// when the case has been signed out or finalised. Nothing that happens in between ends the arming: a fixative, stain,
// date, inking or peer-review check may park the sign-out and resume it after the person answers it (Batch 665), so a closed
// window does not mean "stopped". The arming ends only on:
//   a sign-out that completes inside the window  → go to the next case (once)
//   any plain sign-out / finalise button press, or a different case → cleared by the screen (disarm)
//   more than ARM_TTL_MS passing before the sign-out completes → cleared without moving on (a stale arming must not
//   move the person on after some other sign-out much later)
// Pure: useSignOutAndNext.ts supplies the facts and acts.
// ─────────────────────────────────────────────────────────────────────────────

export const ARM_TTL_MS = 10 * 60 * 1000;

export interface SignOutNextState { armedAt: number | null }
export const SIGN_OUT_NEXT_IDLE: SignOutNextState = { armedAt: null };
export const armSignOutNext = (now: number): SignOutNextState => ({ armedAt: now });

export type SignOutNextStep = 'wait' | 'go' | 'expired';

export function stepSignOutAndNext(s: SignOutNextState, facts: { signed: boolean; now: number }): { state: SignOutNextState; step: SignOutNextStep } {
  if (s.armedAt === null || !facts.signed) return { state: s, step: 'wait' };
  const fresh = facts.now - s.armedAt <= ARM_TTL_MS;
  return { state: SIGN_OUT_NEXT_IDLE, step: fresh ? 'go' : 'expired' };
}

/** Whether the queue has a case after this one. */
export function hasNextInQueue(queue: readonly string[], currentIndex: number): boolean {
  return currentIndex >= 0 && currentIndex + 1 < queue.length;
}

/** The case has been signed out (or, for a trainee, submitted for countersign): the sign-out itself set one of these statuses. */
export function signOutDone(status: string | undefined): boolean {
  return status === 'finalized' || status === 'pending-release' || status === 'pending-countersign';
}
