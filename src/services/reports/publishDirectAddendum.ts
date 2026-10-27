// src/services/reports/publishDirectAddendum.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 649 (sign-out audit): an addendum released straight from the
// amendment dialog (useAmendmentWorkflow.handleAmendmentSubmit, single step)
// was marked released and never sent. It now goes out through the same path
// as an addendum released with its workup:
//   - Orchestration: ADDENDUM for its report instance, through the release
//     delay, recallable by whoever released it (publishReleasedRevision);
//   - Assist: to the LIS for its instance (sendSynopticReportToLis).
// An addendum with no report instance can't be sent on its own (the ADDENDUM
// result is per instance); the caller is told so.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { AmendmentRecord } from '@/types/reports/AmendmentRecord';
import type { ReleasedRevision } from './publishReleasedRevision';

export interface DirectAddendumDeps {
  publishRevision: (r: ReleasedRevision) => Promise<unknown>;
  sendToLis: (payload: { kind: 'corrected_with_addition'; caseId: string; instanceId: string; addendumTitle?: string; payloadBody: string }) => Promise<{ ok: boolean }>;
}

export type DirectAddendumOutcome = { sent: true } | { sent: false; reason: 'noInstance' | 'sendFailed' };

export async function publishDirectAddendum(
  input: {
    caseData: Pick<Case, 'id' | 'status' | 'reportingMode' | 'synopticReports' | 'order'>;
    record: Pick<AmendmentRecord, 'id' | 'type' | 'reportInstanceId' | 'addendumTitle' | 'body' | 'originalReportSnapshot'>;
    releasedBy: { id: string; name: string };
    generatePdf?: ReleasedRevision['generatePdf'];
  },
  deps: DirectAddendumDeps,
): Promise<DirectAddendumOutcome> {
  const { caseData, record } = input;
  const instance = (caseData.synopticReports ?? []).find(r => r.instanceId === record.reportInstanceId);
  if (!instance) return { sent: false, reason: 'noInstance' };
  if (caseData.reportingMode === 'assist') {
    const sent = await deps.sendToLis({
      kind: 'corrected_with_addition', caseId: caseData.id, instanceId: instance.instanceId,
      ...(record.addendumTitle ? { addendumTitle: record.addendumTitle } : {}), payloadBody: record.body,
    }).catch(() => ({ ok: false }));
    return sent.ok ? { sent: true } : { sent: false, reason: 'sendFailed' };
  }
  await deps.publishRevision({
    caseId: caseData.id,
    instance: { instanceId: instance.instanceId, templateId: instance.templateId, lastRevisionType: instance.lastRevisionType },
    record, releasedBy: input.releasedBy, previousStatus: caseData.status,
    ...(caseData.order?.facilityId ? { performingFacilityId: caseData.order.facilityId } : {}),
    ...(input.generatePdf ? { generatePdf: input.generatePdf } : {}),
  });
  return { sent: true };
}
