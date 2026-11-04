// src/services/cytology/manualHpvResult.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 630. Rules for a person entering an hrHPV result by hand ("Record Positive / Negative"), kept free of storage so
// they can be tested on their own. The molecular platform's interface is the normal source; a manual entry stays
// available (paper report, interface downtime, telephoned result, back-entry) but:
//   • it must name its source (HPV_MANUAL_SOURCES);
//   • it records who, when, and what the specimen held before;
//   • if it would replace a result that came from the interface, it does not take effect until a different authorised
//     person approves it (a second sign-off).
// Who may enter or approve is the capability cytology:hpv-result:record-manual, checked by recordManualHpvResult.ts.
// ─────────────────────────────────────────────────────────────────────────────
import { HPV_MANUAL_SOURCES, type HpvManualEntryRecord, type HpvManualSource, type HpvOverrideDecision, type HpvResultSource } from '@/types/case/HpvManualEntry';
import type { CytologyScreeningRecord } from '@/types/case/Specimen';

export function isHpvManualSource(value: unknown): value is HpvManualSource {
  return typeof value === 'string' && (HPV_MANUAL_SOURCES as readonly string[]).includes(value);
}

/** A held result is "from the interface" when it says so, or when it has no source (saved before sources were kept). */
export function holdsInterfaceResult(screening: CytologyScreeningRecord | undefined): boolean {
  const r = screening?.hpvResult;
  if (!r || r === 'Pending' || r === 'Not Performed') return false;
  return !screening?.hpvResultSource || screening.hpvResultSource === 'INTERFACE';
}

export type ManualEntryRoute = 'direct' | 'second_signoff';

/** Replacing an interface result needs a second person; anything else is recorded straight away. */
export function manualEntryRoute(screening: CytologyScreeningRecord | undefined): ManualEntryRoute {
  return holdsInterfaceResult(screening) ? 'second_signoff' : 'direct';
}

export type ManualEntryProblem = 'source-required' | 'result-invalid' | 'already-pending';

export function manualEntryProblem(screening: CytologyScreeningRecord | undefined, result: unknown, source: unknown): ManualEntryProblem | null {
  if (result !== 'Positive' && result !== 'Negative') return 'result-invalid';
  if (!isHpvManualSource(source)) return 'source-required';
  if (screening?.hpvPendingOverride) return 'already-pending';
  return null;
}

/** What the specimen held before an entry, for the record and the audit line. */
export function previousState(screening: CytologyScreeningRecord | undefined): { previousResult: string; previousSource: HpvResultSource | 'none' } {
  const r = screening?.hpvResult;
  if (!r || r === 'Pending' || r === 'Not Performed') return { previousResult: r ?? 'none', previousSource: 'none' };
  return { previousResult: r, previousSource: screening?.hpvResultSource ?? 'INTERFACE' };
}

export interface ManualEntryInput { result: 'Positive' | 'Negative'; source: HpvManualSource; userId: string; userName: string; at: string }

export function buildManualEntryRecord(screening: CytologyScreeningRecord | undefined, input: ManualEntryInput): HpvManualEntryRecord {
  return { result: input.result, source: input.source, enteredById: input.userId, enteredByName: input.userName, enteredAt: input.at, ...previousState(screening) };
}

/** Takes effect now: the result becomes the specimen's, with the entry kept in its history. */
export function applyManualEntry(screening: CytologyScreeningRecord | undefined, record: HpvManualEntryRecord): CytologyScreeningRecord {
  return {
    ...screening,
    hpvResult: record.result,
    hpvResultSource: record.source,
    // A person's entry has no platform flag, range or genotype; the earlier platform values would describe a different result.
    hpvAbnormalFlag: undefined, hpvReferenceRange: undefined, hpvGenotypeDetail: undefined,
    hpvManualEntries: [...(screening?.hpvManualEntries ?? []), record],
    hpvPendingOverride: undefined,
  };
}

/** Waits for a second person: the held interface result stays as it is. */
export function proposeOverride(screening: CytologyScreeningRecord | undefined, record: HpvManualEntryRecord): CytologyScreeningRecord {
  return { ...screening, hpvPendingOverride: record };
}

export type OverrideDecisionProblem = 'no-pending' | 'same-user';

export function overrideDecisionProblem(screening: CytologyScreeningRecord | undefined, deciderId: string): OverrideDecisionProblem | null {
  const pending = screening?.hpvPendingOverride;
  if (!pending) return 'no-pending';
  return pending.enteredById === deciderId ? 'same-user' : null;
}

/** Approve: the entry takes effect. Reject: it is dropped and the interface result stays. Both are kept on the specimen. */
export function decideOverride(
  screening: CytologyScreeningRecord | undefined,
  decision: HpvOverrideDecision['decision'],
  decider: { userId: string; userName: string; at: string },
): CytologyScreeningRecord {
  const pending = screening?.hpvPendingOverride;
  if (!pending) return screening ?? {};
  const record: HpvOverrideDecision = { decidedById: decider.userId, decidedByName: decider.userName, decidedAt: decider.at, decision };
  const history = [...(screening?.hpvOverrideDecisions ?? []), record];
  if (decision === 'rejected') return { ...screening, hpvPendingOverride: undefined, hpvOverrideDecisions: history };
  return { ...applyManualEntry(screening, pending), hpvOverrideDecisions: history };
}

/** The audit line for an entry: who is the audit entry's user; this carries the rest, with no patient data. */
export function manualEntryAuditDetail(record: HpvManualEntryRecord, specimenLetter: string, route: ManualEntryRoute): string {
  return `Manual hrHPV result ${record.result} for specimen ${specimenLetter}; source ${record.source}; entered by ${record.enteredById} at ${record.enteredAt}; `
    + `previously ${record.previousResult} (${record.previousSource}); ${route === 'second_signoff' ? 'awaiting second sign-off' : 'recorded'}`;
}

export function overrideDecisionAuditDetail(pending: HpvManualEntryRecord, decision: HpvOverrideDecision, specimenLetter: string): string {
  return `Manual hrHPV result ${pending.result} for specimen ${specimenLetter} (source ${pending.source}, entered by ${pending.enteredById}) `
    + `${decision.decision} by ${decision.decidedById} at ${decision.decidedAt}; previously ${pending.previousResult} (${pending.previousSource})`;
}
