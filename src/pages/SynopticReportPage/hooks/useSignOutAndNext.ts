// src/pages/SynopticReportPage/hooks/useSignOutAndNext.ts
// Batch 664: Orchestration "Sign Out and Next"; Batch 665: Assist "Finalise & Next" (which only changed the button wording before)
// and a sign-out parked by a fixative / stain / date / inking / peer-review check now still moves on once it completes.
// The button calls `arm()` and then the plain action's own handler; every PLAIN sign-out / finalise button calls `disarm()`, so an
// arming left behind by a flow that stopped never carries over to a later plain press (and it expires after ten minutes).
// When the case has been signed out or finalised this opens the next case in the queue (services/reports/signOutAndNext.ts).
import { useCallback, useEffect, useRef } from 'react';
import { SIGN_OUT_NEXT_IDLE, armSignOutNext, stepSignOutAndNext, hasNextInQueue, type SignOutNextState } from '@/services/reports/signOutAndNext';

export interface SignOutAndNextInput {
  /** The open case; a different case clears any arming. */
  caseId: string | undefined;
  /** The case has been signed out or finalised (its status says so). */
  signed: boolean;
  queue: readonly string[];
  queueIndex: number;
  openNext: () => void;
  /** Shown when there is no next case: the case is done, the person stays on it. */
  notifyNoNext: () => void;
  /** Test seam. */
  now?: () => number;
}

export function useSignOutAndNext(input: SignOutAndNextInput): { arm: () => void; disarm: () => void } {
  const state = useRef<SignOutNextState>(SIGN_OUT_NEXT_IDLE);
  const latest = useRef(input);
  latest.current = input;
  useEffect(() => { state.current = SIGN_OUT_NEXT_IDLE; }, [input.caseId]);
  useEffect(() => {
    const i = latest.current;
    const r = stepSignOutAndNext(state.current, { signed: input.signed, now: (i.now ?? Date.now)() });
    state.current = r.state;
    if (r.step !== 'go') return;
    if (hasNextInQueue(i.queue, i.queueIndex)) i.openNext(); else i.notifyNoNext();
  }, [input.signed]);
  const arm = useCallback(() => { state.current = armSignOutNext((latest.current.now ?? Date.now)()); }, []);
  const disarm = useCallback(() => { state.current = SIGN_OUT_NEXT_IDLE; }, []);
  return { arm, disarm };
}
