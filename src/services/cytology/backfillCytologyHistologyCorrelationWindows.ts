// src/services/cytology/backfillCytologyHistologyCorrelationWindows.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 453 (PS-156 follow-up): abnormal Paps signed out before Batch 452
// have no stored correlation window, so the sweep
// (sweepCytologyHistologyCorrelationCandidates.ts) had nothing to check later
// biopsies against. This works the window out for them from what the record
// already holds:
//   - the diagnosis: the specimen's Final Diagnosis selection
//     (cytologyScreening.finalDiagnosis.primaryInterpretationId), ranked by
//     the cytology category list (ASC-US or worse, rank ≥ 1, as at sign-out);
//   - the sign-out time: the latest sign-out record for the specimen;
//   - the rule: the facility's effective rule today (enterprise →
//     jurisdiction → facility), since the old sign-out recorded none.
// A specimen with no sign-out record, no final diagnosis, a negative rank or
// a window already stored is left alone. Pure.
// ─────────────────────────────────────────────────────────────────────────────

import { resolveCorrelationWindow, type EffectiveCorrelationRule } from './cytologyHistologyCorrelationWindow';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface CorrelationBackfillInput {
  cases: any[];
  /** Latest sign-out per specimen id: when, and which review it released. */
  latestSignOutBySpecimenId: ReadonlyMap<string, { signedAt: string; reviewRecordId: string }>;
  /** Category id → diagnosticRank (all nomenclature systems). */
  rankByCategoryId: ReadonlyMap<string, number | undefined>;
  /** The rule for a case's facility. */
  ruleFor: (facilityId: string | undefined) => EffectiveCorrelationRule;
}

export interface CorrelationBackfillChange { caseId: string; specimenIds: string[] }

/** The cases with windows filled in where one was missing (others untouched),
 *  and what changed. */
export function backfillCytologyHistologyCorrelationWindows(input: CorrelationBackfillInput): { cases: any[]; changes: CorrelationBackfillChange[] } {
  const changes: CorrelationBackfillChange[] = [];
  const cases = input.cases.map(c => {
    const filled: string[] = [];
    const specimens = (c?.specimens ?? []).map((sp: any) => {
      const screening = sp?.cytologyScreening;
      if (!screening || screening.histologyCorrelationWindow) return sp;
      const signOut = input.latestSignOutBySpecimenId.get(sp.id);
      const interpretation = screening.finalDiagnosis?.primaryInterpretationId;
      if (!signOut || !interpretation) return sp;
      const rank = input.rankByCategoryId.get(interpretation);
      if (rank === undefined || rank < 1) return sp;
      const window = resolveCorrelationWindow(sp, signOut.signedAt, input.ruleFor(c?.order?.facilityId));
      if (!window) return sp;
      filled.push(sp.id);
      return { ...sp, cytologyScreening: { ...screening, histologyCorrelationWindow: { ...window, diagnosticRank: rank, reviewId: signOut.reviewRecordId } } };
    });
    if (filled.length === 0) return c;
    changes.push({ caseId: c.id, specimenIds: filled });
    return { ...c, specimens };
  });
  return { cases, changes };
}

/** The latest sign-out record per specimen. */
export function latestSignOutBySpecimen(records: readonly { specimenId: string; signedAt: string; reviewRecordId: string }[]): Map<string, { signedAt: string; reviewRecordId: string }> {
  const out = new Map<string, { signedAt: string; reviewRecordId: string }>();
  for (const r of records) {
    const cur = out.get(r.specimenId);
    if (!cur || Date.parse(r.signedAt) > Date.parse(cur.signedAt)) out.set(r.specimenId, { signedAt: r.signedAt, reviewRecordId: r.reviewRecordId });
  }
  return out;
}
