// src/services/reportRelease/releaseReportDeps.ts
// Batch 534: releaseReport (the release delay for every report output) on the app's services.
// Imported lazily by its callers, so the report and registry engines load only when a report is released.
import type { ReleaseReportDeps } from './releaseReport';
import type { HeldReleaseActionDeps } from './heldReleaseActions';
import { caseRouter } from '../cases/CaseRouter';
import { auditService } from '../auditlog/auditServiceInstance';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { reportReleaseService } from './reportReleaseInstance';
import { heldReleaseService } from './heldReleaseServiceInstance';
import { publishReportReleasedEvent } from '../reports/publishReportReleasedEvent';
import { cytologySignOutRecordService } from '../cytology/cytologySignOutRecordServiceInstance';
import { cytologyReviewRecordService } from '../cytology/cytologyReviewRecordServiceInstance';
import { heldRecallBlocked, reopenHeldRelease, runHeldReleaseFollowUp } from './heldReleaseActions';

export const heldReleaseActionDeps: HeldReleaseActionDeps = {
  getCase: id => caseRouter.getCase(id),
  updateCase: (id, updates, expectedVersion) => caseRouter.updateCase(id, updates, expectedVersion),
  markRecordRecalled: (id, by, at) => cytologySignOutRecordService.markRecalled(id, by, at),
  getRecordsIncludingRecalled: id => cytologySignOutRecordService.getByCaseIdIncludingRecalled(id),
  getCaseRecords: id => cytologySignOutRecordService.getByCaseId(id),
  getAllReviews: () => cytologyReviewRecordService.getAll() as ReturnType<HeldReleaseActionDeps['getAllReviews']>,
  submitRegistry: async input => {
    const [{ submitScreeningRegistryResult }, { signOutCytologyCaseDeps }] = await Promise.all([
      import('../screeningRegistry/submitScreeningRegistryResult'), import('../cytology/signOutCytologyCaseDeps'),
    ]);
    return submitScreeningRegistryResult(input, signOutCytologyCaseDeps);
  },
  submitRevisionRegistry: async input => {
    const [{ submitCytologyRevisionToRegistry }, { submitCytologyRevisionToRegistryDeps }] = await Promise.all([
      import('../screeningRegistry/submitCytologyRevisionToRegistry'), import('../screeningRegistry/submitCytologyRevisionToRegistryDeps'),
    ]);
    return submitCytologyRevisionToRegistry(input, submitCytologyRevisionToRegistryDeps);
  },
  reopenAmendment: async (id, by) => {
    const { amendmentService: mockAmendmentService } = await import('../reports/reportServicesInstance');
    return mockAmendmentService.reopen(id, by);
  },
  now: () => new Date(),
};

export const releaseReportDeps: ReleaseReportDeps = {
  resolveDelay: async caseId => {
    const c = await caseRouter.getCase(caseId);
    return c ? reportReleaseService.resolveBufferForCase(c) : { applies: false, durationMinutes: 0 };
  },
  held: heldReleaseService,
  publish: event => publishReportReleasedEvent(event),
  runFollowUp: (f, caseId) => runHeldReleaseFollowUp(f, caseId, heldReleaseActionDeps),
  reopen: (h, by) => reopenHeldRelease(h, by, heldReleaseActionDeps),
  recallBlocked: h => heldRecallBlocked(h, heldReleaseActionDeps),
  audit: entry => auditService.logEvent(entry),
  releaseSignOut: caseId => reportReleaseService.checkAndReleaseIfExpired(caseId),
  now: () => new Date(),
  newId: () => crypto.randomUUID(),
  enforce: (capability, context) => authorizationService.enforce(capability, context),
};

export const RELEASE_SWEEP_MS = 15_000;

/** Batch 534: while PathScribe is open, held reports are sent when their delay ends (any screen). Returns a stop function. */
export function startReleaseBackgroundWork(): () => void {
  let running = false;
  const tick = () => {
    if (running) return;
    running = true;
    void import('./releaseReport').then(m => m.releaseDueReports(releaseReportDeps)).catch(() => 0).finally(() => { running = false; });
  };
  tick();
  const timer = setInterval(tick, RELEASE_SWEEP_MS);
  return () => clearInterval(timer);
}
