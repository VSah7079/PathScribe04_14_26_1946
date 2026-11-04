// src/services/departments/auditRetentionOverride.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 428: the audit entry for a department retention override set below
// the governing-body minimum. The screen used to write it itself and record
// the person as the fixed text "super-admin"; it now records the signed-in
// person. Detail text stays English (audit records are compliance artifacts).
// ─────────────────────────────────────────────────────────────────────────────

import type { IAuditService } from '../auditlog/IAuditService';
import { getSessionUser } from '../auth/caseAccessControl';
import { resolveAuditActor } from '../participationTypes/saveParticipationType';

export function retentionOverrideAuditEntry(
  input: { departmentName: string; fields: string[]; justification: string },
  actorName: string,
) {
  return {
    type: 'system' as const,
    event: 'Retention Override Below Floor',
    detail: `Department "${input.departmentName}" — ${input.fields.join(', ')} set below the current governing-body floor. Justification: ${input.justification}`,
    user: actorName, caseId: null, confidence: null,
  };
}

export async function auditRetentionOverrideBelowFloor(
  input: { departmentName: string; fields: string[]; justification: string },
  deps: { auditService: Pick<IAuditService, 'logEvent'>; actorName?: string },
): Promise<void> {
  const actorName = deps.actorName ?? resolveAuditActor(getSessionUser()).userName;
  await deps.auditService.logEvent(retentionOverrideAuditEntry(input, actorName)).catch(() => {});
}
