// src/services/surgicalSignOut/releaseSurgicalFinal.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 649 (sign-out audit): the cancer registry submission follows the
// release of the surgical FINAL, not the signature. Before, Sign Out Case sent
// it at sign-out, so a report held for the laboratory's release delay (and
// perhaps recalled) had already gone to the registry.
//
// Called at the one moment a surgical FINAL is released:
//   - at sign-out when no release delay applies (useSignOutWorkflow);
//   - when the delay runs out (reportReleaseService.checkAndReleaseIfExpired,
//     on an open page or the background release).
// Assist cases are excluded: their FINAL is the LIS's, and the registry was
// never sent from Assist Finalize. Both steps are fire-and-forget for the
// caller: a failure is logged and never undoes the release.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { ReportReleasedEvent } from '../reports/publishReportReleasedEvent';

export interface SurgicalFinalReleaseDeps {
  publish: (event: ReportReleasedEvent) => Promise<unknown>;
  dispatchRegistry: (caseData: Case, facilityId: string, facilityName: string | undefined) => Promise<unknown>;
}

/** Whether a released surgical FINAL goes to the cancer registry (the facility's own settings decide the rest). */
export function surgicalFinalGoesToRegistry(caseData: Pick<Case, 'reportingMode' | 'order'>): boolean {
  return caseData.reportingMode !== 'assist' && !!caseData.order?.facilityId;
}

/** Publishes the FINAL, then sends the registry submission. */
export async function releaseSurgicalFinal(caseData: Case, event: ReportReleasedEvent, deps: SurgicalFinalReleaseDeps): Promise<void> {
  await deps.publish(event).catch(e => console.error('[releaseSurgicalFinal] FINAL not published:', e));
  if (!surgicalFinalGoesToRegistry(caseData)) return;
  await deps.dispatchRegistry(caseData, caseData.order!.facilityId!, caseData.order?.facilityName)
    .catch(e => console.error('[releaseSurgicalFinal] Cancer registry submission not sent:', e));
}

/** The app's services, loaded when used. */
export const surgicalFinalReleaseDeps: SurgicalFinalReleaseDeps = {
  publish: async event => (await import('../reports/publishReportReleasedEvent')).publishReportReleasedEvent(event),
  dispatchRegistry: async (c, facilityId, facilityName) =>
    (await import('../cancerRegistry/dispatchCancerRegistryReportIfApplicable')).dispatchCancerRegistryReportIfApplicable(c, facilityId, facilityName),
};
