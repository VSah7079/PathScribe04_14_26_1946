// src/services/facilities/technicalFacilityAudit.ts
// Batch 618 (PS-336): the audit entry for setting, changing or clearing a case's
// technical-component facility after accessioning. Facility and case ids only; no
// patient data and no facility names.

import type { NewAuditLog } from '../auditlog/IAuditService';

export function buildTechnicalFacilityAuditEntry(
  caseId: string,
  previousFacilityId: string | undefined,
  nextFacilityId: string | undefined,
  userName: string,
): NewAuditLog | null {
  if ((previousFacilityId ?? '') === (nextFacilityId ?? '')) return null;
  const event = !nextFacilityId ? 'Technical Component Facility Cleared' : previousFacilityId ? 'Technical Component Facility Changed' : 'Technical Component Facility Set';
  return {
    type: 'user',
    event,
    detail: `Case ${caseId}: technical component facility ${previousFacilityId || 'none'} -> ${nextFacilityId || 'none'}`,
    user: userName,
    caseId,
    confidence: null,
  } as NewAuditLog;
}
