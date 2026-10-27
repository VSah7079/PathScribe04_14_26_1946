// src/services/delegations/delegationAudit.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 651: audit entry for a successful delegation. Until now only the report change log recorded a hand-off.
//
// PHI-free by construction: the case's accession number is the caseId; the delegation type id, the recipient kind and
// id (a staff id or pool id, never a name) and the delegation record id are written. The free-text note is NEVER
// written (only whether one was given), because it can name the patient. Literal English.
// ─────────────────────────────────────────────────────────────────────────────
import type { IAuditService, NewAuditLog } from '../auditlog/IAuditService';
import type { DelegationRecord, DelegationRequest } from './IDelegationService';

export function delegationAuditEntry(
  request: DelegationRequest, record: Pick<DelegationRecord, 'id'>, actorName: string, facilityId: string | null,
): NewAuditLog {
  const what = request.synopticInstanceId ? `Synoptic report ${request.synopticInstanceId} of the case` : 'Case';
  return {
    type: 'user', event: 'Case delegated',
    detail: `${what} delegated (type ${request.delegationType}) to ${request.recipient.kind} ${request.recipient.id}; delegation ${record.id}${request.note ? '; a note was added' : ''}.`,
    user: actorName, caseId: request.caseId, facilityId, confidence: null,
  };
}

export interface DelegationAuditDeps {
  auditService: Pick<IAuditService, 'logEvent'>;
  actorName: (userId: string) => Promise<string>;
  facilityOf: (caseId: string) => Promise<string | null>;
}

/** Writes the entry; never throws (an audit failure must not undo a delegation that was made). */
export async function recordDelegation(request: DelegationRequest, record: Pick<DelegationRecord, 'id'>, deps: DelegationAuditDeps): Promise<void> {
  try {
    const [name, facilityId] = await Promise.all([deps.actorName(request.requestorId).catch(() => null), deps.facilityOf(request.caseId).catch(() => null)]);
    await deps.auditService.logEvent(delegationAuditEntry(request, record, name || request.requestorId, facilityId));
  } catch { /* never block the action */ }
}
