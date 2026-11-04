// src/services/registrySubmission/captureRegistryExceptionAsCapa.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 423 (Pete: "also ability to, if needed, to create a CAPA"). A row on
// the Registry Exceptions worklist (rejected, undelivered, unanswered, held)
// raised into the lab's existing CAPA lifecycle, the same way the two
// interface dead-letter screens' "Capture as CAPA" does: an open deficiency
// of its own type (def-registry-submission-failure, case-level), which then
// shows in Quality Assurance → Operations, can be escalated to CAPA (root
// cause, corrective and preventive action) and gets its effectiveness check.
// Capturing doesn't change the submission: it can still be resent.
//
// One open CAPA per submission: the deficiency's comment carries the queue
// entry, and a second capture while one is open is refused. Needs the
// worklist's own screen capability (anyone who can see the row can raise it,
// as anyone can raise a deficiency elsewhere); audited.
// ─────────────────────────────────────────────────────────────────────────────

import type { RegistryExceptionRow } from './registryExceptions';
import { REGISTRY_REVISION_DEFICIENCY_TYPE } from './recordRegistryRevision';

export const REGISTRY_CAPA_DEFICIENCY_TYPE = 'def-registry-submission-failure';

export interface RegistryCapaDeps {
  enforce: (capability: string, context?: Record<string, unknown>) => Promise<{ allowed: boolean }>;
  getCaseDeficiencies: (caseId: string) => Promise<{ id: string; deficiencyTypeId: string; status: string; comment?: string }[]>;
  raise: (deficiency: { caseId: string; deficiencyTypeId: string; comment: string; raisedBy: string }) => Promise<{ ok: boolean; data?: { id: string } }>;
  logAudit: (event: any) => unknown;
}

type Row = Pick<RegistryExceptionRow, 'queue' | 'entryId' | 'caseId' | 'registryId' | 'kind' | 'submissionVersion' | 'messageType' | 'environment' | 'findings'>;

/** Ties the deficiency to the queue entry. */
export const registryCapaMarker = (row: Pick<Row, 'queue' | 'entryId'>) => `[registry ${row.queue}:${row.entryId}]`;

const KIND_TEXT: Record<RegistryExceptionRow['kind'], string> = {
  held: 'held, not sent', attestationRequired: 'held, attestation required', deliveryFailed: 'could not be delivered', rejectedRecoverable: 'rejected by the registry (fixable)',
  rejectedFatal: 'rejected by the registry', ackOverdue: 'unanswered for 72 hours', conflict: 'answered differently after acceptance', revisedPostAcceptance: 'revised by the registry after acceptance',
};

/** What the deficiency says (literal English: a QA record). */
export function registryCapaComment(row: Row): string {
  const version = row.submissionVersion !== undefined ? ` v${row.submissionVersion}${row.messageType ? ` ${row.messageType}` : ''}` : '';
  const env = row.environment ? `, ${row.environment === 'production' ? 'live register' : 'test system'}` : '';
  const findings = row.findings.length
    ? ` Findings: ${row.findings.map(f => `${f.severity}${f.code ? ` ${f.code}` : ''}: ${f.message}`).join('; ')}.`
    : '';
  return `Registry submission ${KIND_TEXT[row.kind]} (${row.registryId}${version}${env}).${findings} ${registryCapaMarker(row)}`;
}

const isOpen = (d: { status: string }) => d.status !== 'closed';
/** Batch 425: a revision after acceptance raises its own deficiency automatically; it counts as the row's CAPA. */
const CAPA_TYPES = [REGISTRY_CAPA_DEFICIENCY_TYPE, REGISTRY_REVISION_DEFICIENCY_TYPE];

/** Which rows already have an open CAPA, as `${queue}:${entryId}`. */
export async function registryRowsWithOpenCapa(rows: Pick<Row, 'queue' | 'entryId' | 'caseId'>[], deps: Pick<RegistryCapaDeps, 'getCaseDeficiencies'>): Promise<Set<string>> {
  const out = new Set<string>();
  const caseIds = [...new Set(rows.map(r => r.caseId))];
  const byCase = new Map(await Promise.all(caseIds.map(async id => [id, await deps.getCaseDeficiencies(id)] as const)));
  for (const r of rows) {
    if ((byCase.get(r.caseId) ?? []).some(d => CAPA_TYPES.includes(d.deficiencyTypeId) && isOpen(d) && (d.comment ?? '').includes(registryCapaMarker(r)))) out.add(`${r.queue}:${r.entryId}`);
  }
  return out;
}

export async function captureRegistryExceptionAsCapa(row: Row, user: { id: string; name: string }, deps: RegistryCapaDeps): Promise<{ outcome: 'notPermitted' | 'alreadyCaptured' | 'failed' | 'captured'; deficiencyId?: string }> {
  if (!(await deps.enforce('screen:registry-exceptions:open', { queueEntryId: row.entryId })).allowed) return { outcome: 'notPermitted' };
  if ((await registryRowsWithOpenCapa([row], deps)).size) return { outcome: 'alreadyCaptured' };
  const raised = await deps.raise({ caseId: row.caseId, deficiencyTypeId: REGISTRY_CAPA_DEFICIENCY_TYPE, comment: registryCapaComment(row), raisedBy: user.id || 'unknown' });
  if (!raised.ok || !raised.data) return { outcome: 'failed' };
  deps.logAudit({ type: 'user', event: 'Registry exception captured as CAPA', detail: `${row.registryId} queue entry ${row.entryId}: ${row.kind}; deficiency ${raised.data.id} opened for CAPA review.`, user: user.name || user.id, caseId: row.caseId, confidence: null });
  return { outcome: 'captured', deficiencyId: raised.data.id };
}
