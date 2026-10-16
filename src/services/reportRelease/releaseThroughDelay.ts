// src/services/reportRelease/releaseThroughDelay.ts
// Batch 534: releaseReport (services/reportRelease/releaseReport.ts) with the app's services, loaded
// when a report is released. For screens and services that release a report outside a deps object.
import type { ReportReleasedEvent } from '../reports/publishReportReleasedEvent';
import type { ReleaseHold, ReleaseReportOutcome } from './releaseReport';

export async function releaseThroughDelay(event: ReportReleasedEvent, hold: ReleaseHold): Promise<ReleaseReportOutcome> {
  const [{ releaseReport }, { releaseReportDeps }] = await Promise.all([import('./releaseReport'), import('./releaseReportDeps')]);
  return releaseReport(event, hold, releaseReportDeps);
}

/** Batch 534: the reports still waiting out the delay for a case, soonest first (not the surgical sign-out: it has its own banner). */
export async function listHeldReports(caseId: string) {
  const [{ mockHeldReleaseService }, { pendingHeldReleases }] = await Promise.all([import('./mockHeldReleaseService'), import('./heldReleaseRules')]);
  const res = await mockHeldReleaseService.getByCaseId(caseId);
  return res.ok ? pendingHeldReleases(res.data, caseId) : [];
}

/** Batch 534: recall a held report (only the person who released it; it reopens what was released). */
export async function recallHeldReport(heldId: string, by: { userId: string; userName: string }) {
  const [{ recallHeldRelease }, { releaseReportDeps }] = await Promise.all([import('./releaseReport'), import('./releaseReportDeps')]);
  return recallHeldRelease(heldId, by, releaseReportDeps);
}
