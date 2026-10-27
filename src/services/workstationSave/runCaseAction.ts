// src/services/workstationSave/runCaseAction.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 669 (findings ws-8 / ws-11): the one way the bench workstations (Embedding, Slide Distribution, Add-On
// Orders) save a change to a case. Extracted from the pattern the Microtomy workstation already followed
// (Batch 460, PS-71): the change is re-applied to the newest copy of the case when someone else saved first, up to
// 3 tries (updateCaseWithRetry's rule), and a save that still fails is REPORTED, never shown as saved: the caller
// is told 'failed' with a reason ('conflict' or 'notApplied') and the stored case as it is now, so the screen can
// say "Not saved" and reload that state. Before, these three screens logged a failure to the console and left the
// change on screen as if it had been saved.
//
//   runCaseAction(caseId, action, deps)   reads the newest case, runs `action(current, save)`; `save(specimens)`
//                                         writes the specimens with that read's version. A version conflict re-reads
//                                         and runs the action again (so the action must derive everything from the
//                                         `current` it is given, and may run more than once before its save).
//   saveSpecimenChange(caseId, derive, deps)   the common case: `derive(current)` returns the full specimen list to
//                                         save, or null when there is nothing (left) to do.
//   saveFailedKey(reason)                 the locale key of the "Not saved" message (workstationSave.*).
//
// Work an action does AFTER its save (an e-mail, a follow-up order) is not re-run by a retry, and an error thrown
// there is rethrown to the caller untouched: the case was saved, so it is not reported as "Not saved".
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { Specimen } from '@/types/case/Specimen';
import { ConcurrencyConflictError } from '../cases/ConcurrencyConflictError';
import { CASE_WRITE_MAX_ATTEMPTS, caseVersionOf, type CaseWriteDeps } from '../cases/caseWrite';

export type WorkstationSaveFailure = 'conflict' | 'notApplied';

/** Thrown by `save` on a version conflict; the action may let it pass through, runCaseAction retries. */
export class SpecimenSaveConflict extends Error {
  constructor() { super('conflict'); this.name = 'SpecimenSaveConflict'; }
}

/** What a save came to. 'saved': the action saved. 'unchanged': it finished without saving (it refused, or had nothing
 *  to do). 'failed': a save was needed and did not happen; `latest` is the stored case to reload from (null when it
 *  can't be read). */
export type CaseActionOutcome<R> =
  | { status: 'saved'; value: R; caseData: Case }
  | { status: 'unchanged'; value: R }
  | { status: 'failed'; reason: WorkstationSaveFailure; latest: Case | null };

/** `saveSpecimenChange`: saved, or failed (a change that no longer applies counts as failed). */
export type SaveChangeOutcome = Exclude<CaseActionOutcome<boolean>, { status: 'unchanged' }>;

/** The result of a pure specimen operation (Embedding, Microtomy and Slide Distribution operations all fit). */
export type SpecimenOpResult = { ok: true; specimen: Specimen } | { ok: false };

export type SpecimenSaver = (specimens: Specimen[]) => Promise<void>;

export async function runCaseAction<R>(
  caseId: string,
  action: (current: Case, save: SpecimenSaver) => Promise<R>,
  deps: CaseWriteDeps,
  maxAttempts: number = CASE_WRITE_MAX_ATTEMPTS,
): Promise<CaseActionOutcome<R>> {
  let reason: WorkstationSaveFailure = 'notApplied';
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let current: Case | null | undefined;
    try { current = await deps.getCase(caseId); } catch { current = null; }
    if (!current) break;
    const version = caseVersionOf(current);
    let savedCase: Case | undefined;
    const save: SpecimenSaver = async specimens => {
      try {
        await deps.updateCase(caseId, { specimens }, version);
      } catch (e) {
        if (e instanceof ConcurrencyConflictError) throw new SpecimenSaveConflict();
        throw e;
      }
      savedCase = { ...current, specimens, version: version + 1 } as Case;
    };
    try {
      const value = await action(current, save);
      return savedCase ? { status: 'saved', value, caseData: savedCase } : { status: 'unchanged', value };
    } catch (e) {
      if (savedCase) throw e; // saved already: not a failed save
      if (e instanceof SpecimenSaveConflict) { reason = 'conflict'; continue; }
      console.error('[workstationSave] Failed to save:', e);
      reason = 'notApplied';
      break;
    }
  }
  const latest = await Promise.resolve(deps.getCase(caseId)).catch(() => null);
  return { status: 'failed', reason, latest: latest ?? null };
}

/** `derive` builds the full specimen list to save from the newest case, or returns null when there is nothing to do
 *  (the block is gone, or the operation no longer applies): that is a failure to apply ('conflict'), not a save. */
export async function saveSpecimenChange(
  caseId: string,
  derive: (current: Case) => Specimen[] | null,
  deps: CaseWriteDeps,
): Promise<SaveChangeOutcome> {
  const outcome = await runCaseAction<boolean>(caseId, async (current, save) => {
    const specimens = derive(current);
    if (!specimens) return false;
    await save(specimens);
    return true;
  }, deps);
  if (outcome.status === 'unchanged') {
    const latest = await Promise.resolve(deps.getCase(caseId)).catch(() => null);
    return { status: 'failed', reason: 'conflict', latest: latest ?? null };
  }
  return outcome;
}

/** The locale key of the "Not saved" message for a failure. */
export function saveFailedKey(reason: WorkstationSaveFailure | undefined): string {
  return `workstationSave.${reason === 'conflict' ? 'conflict' : 'notApplied'}`;
}

/** `specimens` with `updated` in place of the one with the same id. */
export function replaceSpecimenById(specimens: Specimen[] | undefined, updated: Specimen): Specimen[] {
  return (specimens ?? []).map(sp => (sp.id === updated.id ? updated : sp));
}
