// src/services/cytologyQc/resolveCaseInFormalConsultation.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 501: spec §2.2's Consultation Deduplication guardrail — "cases already
// routed through formal intradepartmental consultation are automatically
// excluded from random QC sampling." PathScribe has no separate consultation
// record, so a case counts as in formal consultation when it has:
//   • an active case hold for 'pending_consultation', or
//   • an active participant in a 'consultant' or 'second_opinion' role.
// Only the QC Rules engine applies this; a ROSE discrepancy and peer-review
// selection still apply to such a case. Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';

const CONSULT_PARTICIPATION_TYPES = ['consultant', 'second_opinion'];

export function resolveCaseInFormalConsultation(caseData: Pick<Case, 'caseHolds' | 'participants'>): boolean {
  const onConsultHold = (caseData.caseHolds ?? []).some(h => h.active && h.reason === 'pending_consultation');
  const consultParticipant = (caseData.participants ?? []).some(p =>
    p.status === 'active' && (p.participationTypeIds ?? []).some(t => CONSULT_PARTICIPATION_TYPES.includes(t)));
  return onConsultHold || consultParticipant;
}
