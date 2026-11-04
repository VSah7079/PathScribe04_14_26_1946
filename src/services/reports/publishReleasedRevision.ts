// src/services/reports/publishReleasedRevision.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 535 (fixes a bug found while building Batch 534): a surgical
// correction or addendum released at an Orchestration re-sign-out
// (useSignOutWorkflow.finalizeSignOut) was marked released but never sent: no
// CORRECTED went out, and the FINAL that followed skipped the instance as
// already sent. It now goes out like one released from the report page
// (useAmendmentWorkflow): CORRECTED (or ADDENDUM) for that instance, with what
// it read before, through the release delay, recallable by the person who
// released it (services/reportRelease/heldReleaseActions.ts, 'surgical-amendment').
// ─────────────────────────────────────────────────────────────────────────────

import type { AmendmentRecord } from '@/types/reports/AmendmentRecord';
import type { ReleaseReportOutcome } from '../reportRelease/releaseReport';

export interface ReleasedRevision {
  caseId: string;
  instance: { instanceId: string; templateId?: string; lastRevisionType?: string };
  record: Pick<AmendmentRecord, 'id' | 'type' | 'originalReportSnapshot'>;
  releasedBy: { id: string; name: string };
  performingFacilityId?: string;
  /** The case status before the release (Recall puts it back). */
  previousStatus: string;
  generatePdf?: () => Promise<{ pdfBase64?: string; generationError?: string }>;
}

export interface ReleasedRevisionDeps {
  resolvePreviousText: (templateId: string | undefined, answers: Record<string, unknown>) => Promise<string | undefined>;
  release: (event: import('./publishReportReleasedEvent').ReportReleasedEvent, hold: import('../reportRelease/releaseReport').ReleaseHold) => Promise<ReleaseReportOutcome>;
}

export async function publishReleasedRevision(r: ReleasedRevision, deps: ReleasedRevisionDeps): Promise<ReleaseReportOutcome> {
  const isAddendum = r.record.type === 'addendum';
  const answers = (r.record.originalReportSnapshot as { answers?: Record<string, unknown> } | undefined)?.answers;
  const previouslyReportedAs = !isAddendum && answers ? await deps.resolvePreviousText(r.instance.templateId, answers).catch(() => undefined) : undefined;
  return deps.release({
    caseId: r.caseId, instanceId: r.instance.instanceId, reportType: isAddendum ? 'ADDENDUM' : 'CORRECTED',
    releasedAt: new Date().toISOString(), releasedBy: r.releasedBy,
    ...(r.performingFacilityId ? { performingFacilityId: r.performingFacilityId } : {}),
    ...(r.generatePdf ? { generatePdf: r.generatePdf } : {}),
    ...(previouslyReportedAs ? { previouslyReportedAs } : {}),
  }, {
    kind: 'surgical-amendment', releasedBy: { userId: r.releasedBy.id, userName: r.releasedBy.name },
    subject: {
      recordId: r.record.id, instanceId: r.instance.instanceId, previousStatus: r.previousStatus,
      ...(r.instance.lastRevisionType ? { previousRevisionType: r.instance.lastRevisionType } : {}),
    },
  });
}

/** The app's services, loaded when used. */
export const releasedRevisionDeps: ReleasedRevisionDeps = {
  resolvePreviousText: async (templateId, answers) => {
    const { resolveFinalDiagnosisText } = await import('../reportTemplates/resolveFinalDiagnosisText');
    return (await resolveFinalDiagnosisText(templateId as string, answers)) || undefined;
  },
  release: async (event, hold) => (await import('../reportRelease/releaseThroughDelay')).releaseThroughDelay(event, hold),
};
