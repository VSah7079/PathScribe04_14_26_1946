// src/services/access/accessRequestDecision.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 432: who may decide an access request. Denying needs the same
// permission as giving that access (Pete: same people decide either way):
//   • pool membership        → config:staff:edit (Subspecialties → members)
//   • pediatric access       → config:staff-access:assign
//   • Orchestration access   → config:staff-access:assign
// Granting still happens where the access lives; the request then closes
// itself (closeGrantedAccessRequests.ts).
// ─────────────────────────────────────────────────────────────────────────────

import type { AccessRequestType } from '@/types/access/AccessRequest';

// Batch 613: another patient's cases are decided by the case's assigned pathologist or an administrator, with
// patient:other-cases:decide-access (patientCaseAccess/rules.ts adds the assigned-pathologist rule).
export const ACCESS_REQUEST_DECISION_CAPABILITY: Readonly<Record<AccessRequestType, 'config:staff:edit' | 'config:staff-access:assign' | 'patient:other-cases:decide-access'>> = {
  pool: 'config:staff:edit',
  pediatric: 'config:staff-access:assign',
  orchestration: 'config:staff-access:assign',
  patient_cases: 'patient:other-cases:decide-access',
};

/** The message the requester gets when a request is denied (English: it's a
 *  stored message another person reads, like every other system message). */
export function accessDeniedMessage(r: { type: AccessRequestType; caseId?: string; poolName?: string }, deniedBy: string, reason: string): { subject: string; body: string } {
  const what = r.type === 'pool' ? `membership of the ${r.poolName ?? 'requested'} pool`
    : r.type === 'patient_cases' ? "access to the patient's other cases"
    : r.type === 'pediatric' ? `Pediatric access${r.caseId ? ` (case ${r.caseId})` : ''}`
    : `Orchestration access${r.caseId ? ` (case ${r.caseId})` : ''}`;
  return {
    subject: 'Access request declined',
    body: `Your request for ${what} was declined by ${deniedBy}.\n\nReason: ${reason}`,
  };
}
