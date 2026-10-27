// src/services/grossing/triageReleaseGate.ts
// ─────────────────────────────────────────────────────────────────────────────
// The grossing triage release gate (Protocol-Driven Workflow Infrastructure,
// Part 2c): a specimen with a still-open SpecimenTriage record (not every
// checklist item confirmed and no override reason recorded) never releases its
// pending cassettes.
//
// Batch 652: the decision used to live in a worklist tile component and was
// applied by the report-page hook. It is a pure rule here; the hook and the
// release panel only ask it. Honest scope: this runs in the browser. It is not
// a server-side enforcement; the API server must repeat the rule for the same
// protection against a modified client (see KNOWN_GAPS.md).
// ─────────────────────────────────────────────────────────────────────────────
import type { Specimen, SpecimenTriage } from '@/types/case/Specimen';

/** Pending exactly when a SpecimenTriage record exists, no override reason was
 *  recorded, and at least one checklist item is unconfirmed. */
export function isTriagePending(triage: SpecimenTriage | undefined): boolean {
  if (!triage) return false;
  if (triage.overrideReason) return false;
  return !triage.checklistItems.every(ci => ci.confirmed);
}

export type TriageReleaseGateResult =
  | { allowed: true }
  | { allowed: false; reason: 'specimenNotFound' | 'triageIncomplete' };

/** Service entry: may this specimen's pending blocks be released? A specimen
 *  with no SpecimenTriage (protocol never required it) is never gated. */
export function checkTriageReleaseGate(
  specimens: readonly Pick<Specimen, 'id' | 'triage'>[] | undefined,
  specimenId: string,
): TriageReleaseGateResult {
  const sp = (specimens ?? []).find(s => s.id === specimenId);
  if (!sp) return { allowed: false, reason: 'specimenNotFound' };
  if (isTriagePending(sp.triage)) return { allowed: false, reason: 'triageIncomplete' };
  return { allowed: true };
}
