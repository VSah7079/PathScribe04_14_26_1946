// src/services/registrySubmission/registryExceptionsDeps.ts
// Batch 421: the real services behind the Registry Exceptions worklist (load, rebuild, resend).
import type { RegistryExceptionsLoadDeps, RegistryExceptionScopeDeps, RegistryTransmissionExportDeps } from './registryExceptionsService';
import { registryRevisionDeps } from './recordRegistryAcknowledgementDeps';
import type { RegistryRevisionDeps } from './recordRegistryRevision';
import { exportQaReport, qaScopeContext } from '../qualityAssurance/qaExport';
import { runQaExport } from '../qualityAssurance/runQaExport';
import { isServerOutcome } from '../exports/exportTracker';
import { exportService } from '../exports/exportTrackerInstance';
import type { ResendDeps } from './resendRegistrySubmission';
import type { RebuildDeps } from './rebuildRegistrySubmission';
import { rebuildRegistrySubmission } from './rebuildRegistrySubmission';
import { registryAckDeps } from './recordRegistryAcknowledgementDeps';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { caseRouter } from '../cases/CaseRouter';
import { getSessionUser } from '../auth/caseAccessControl';
import { mockCytologyRegistryOutboundQueueService } from '../cytology/mockCytologyRegistryOutboundQueueService';
import { mockCancerRegistryOutboundQueueService } from '../cancerRegistry/mockCancerRegistryOutboundQueueService';
import { mockCytologySignOutRecordService } from '../cytology/mockCytologySignOutRecordService';
import { mockCytologyReviewRecordService } from '../cytology/mockCytologyReviewRecordService';
import { mockCytologyCategoryService } from '../cytology/mockCytologyCategoryService';
import { mockAuditService } from '../auditlog/mockAuditService';
import { signOutCytologyCaseDeps } from '../cytology/signOutCytologyCaseDeps';
import { prepareScreeningRegistrySubmission, submitScreeningRegistryResult } from '../screeningRegistry/submitScreeningRegistryResult';
import { dispatchCancerRegistryReportIfApplicable, prepareCancerRegistrySubmission } from '../cancerRegistry/dispatchCancerRegistryReportIfApplicable';
import { dispatchInterfaceMessage } from '../interfaceDispatch/dispatchInterfaceMessage';
import { registrySendGateCheck } from '../registryGoLive/registryGoLiveDeps';
import type { RegistryCapaDeps } from './captureRegistryExceptionAsCapa';
import { mockSpecimenDeficiencyService } from '../deficiencies/mockSpecimenDeficiencyService';

const cyto = mockCytologyRegistryOutboundQueueService;
const cancer = mockCancerRegistryOutboundQueueService;

/** Batch 425: the cases the signed-in user can see (the case router's own organisation and facility filter).
 *  Kept for a minute per user: the nav badge polls, and every case search is audited. On the API server
 *  the count is scoped by the organisation in SQL instead (PS-345). */
let visibleCache: { userId: string; at: number; ids: Set<string> } | null = null;
const visibleCaseIds = async () => {
  const userId = getSessionUser()?.id ?? '';
  if (visibleCache && visibleCache.userId === userId && Date.now() - visibleCache.at < 60_000) return visibleCache.ids;
  const r = await caseRouter.getAll();
  visibleCache = { userId, at: Date.now(), ids: new Set(r.ok ? r.data.map(c => c.id) : []) };
  return visibleCache.ids;
};

export const registryExceptionsLoadDeps: RegistryExceptionsLoadDeps & RegistryExceptionScopeDeps = {
  ack: registryAckDeps,
  getAll: { cytology: () => cyto.getAll() as any, cancer: () => cancer.getAll() as any },
  visibleCaseIds,
};

/** Batch 425: "Mark reviewed" on a registry revision after acceptance. */
export const registryRevisionReviewDeps: Pick<RegistryRevisionDeps, 'queues' | 'logAudit' | 'now'> & { enforce: (capability: string, context?: Record<string, unknown>) => Promise<{ allowed: boolean }> } = {
  queues: registryRevisionDeps.queues,
  logAudit: registryRevisionDeps.logAudit,
  now: registryRevisionDeps.now,
  enforce: (capability, context) => authorizationService.enforce(capability as any, context as any),
};

/** Batch 425: the transmission audit download (cytology, cancer, or both). */
export const registryTransmissionExportDeps: RegistryTransmissionExportDeps = {
  getAll: { cytology: () => cyto.getAll() as any, cancer: () => cancer.getAll() as any },
  visibleCaseIds,
  exportsViaServer: exportService.viaServer,
  // Batch 550: through the app's export service (built by the API server when there is one).
  exportQaReport: async (capability, rows, filename, parameters = {}) => {
    let local: { ok: boolean; reason?: string; rowCount?: number } = { ok: false };
    const outcome = await runQaExport(capability, filename, qaScopeContext(), parameters, async () => {
      local = await exportQaReport(capability, rows, filename, { authorization: authorizationService }, qaScopeContext());
    });
    return isServerOutcome(outcome) ? { ok: true, viaServer: true } : local;
  },
};

const rebuildDeps: RebuildDeps = {
  getCase: caseId => caseRouter.getCase(caseId),
  getSignOutRecordAndReview: async (caseId, signOutRecordId) => {
    const [records, reviews] = await Promise.all([mockCytologySignOutRecordService.getByCaseId(caseId), mockCytologyReviewRecordService.getByCaseId(caseId)]);
    const record = records.ok ? records.data.find(r => r.id === signOutRecordId) : undefined;
    const review = record && reviews.ok ? reviews.data.find(r => r.id === record.reviewRecordId) : undefined;
    return record && review ? { record, review } : null;
  },
  getCategories: async () => { const r = await mockCytologyCategoryService.getAll(); return r.ok ? r.data : []; },
  prepareScreening: input => prepareScreeningRegistrySubmission(input, signOutCytologyCaseDeps),
  prepareCancer: (caseData, facilityId, facilityName) => prepareCancerRegistrySubmission(caseData, facilityId, facilityName),
  sendGate: (queue, registryId, synthetic) => registrySendGateCheck(queue === 'cytology' ? 'screening' : 'cancer', registryId, synthetic),
};

const getEntry = (svc: typeof cyto | typeof cancer) => async (id: string) => {
  const all = await svc.getAll();
  return all.ok ? (all.data as any[]).find(e => e.id === id) : undefined;
};

export const resendRegistrySubmissionDeps: ResendDeps = {
  enforce: (capability, context) => authorizationService.enforce(capability as any, context as any),
  queues: {
    cytology: { get: getEntry(cyto), retryDispatch: id => cyto.retryDispatch(id) as any, markSent: id => cyto.markSent(id), markFailed: (id, f) => cyto.markFailed(id, f) },
    cancer: { get: getEntry(cancer), retryDispatch: id => cancer.retryDispatch(id) as any, markSent: id => cancer.markSent(id), markFailed: (id, f) => cancer.markFailed(id, f) },
  },
  rebuild: (queue, entry) => rebuildRegistrySubmission(queue, entry, rebuildDeps),
  submitNewVersion: async (queue, entry) => {
    const caseData: any = await caseRouter.getCase(entry.caseId);
    if (queue === 'cytology') {
      const found = await rebuildDeps.getSignOutRecordAndReview(entry.caseId, entry.signOutRecordId ?? '');
      if (!caseData || !found) return { outcome: 'notFound' };
      return submitScreeningRegistryResult({
        caseData, record: found.record, review: found.review, categories: await rebuildDeps.getCategories(),
        isGynCytology: true, kind: entry.submission?.kind ?? 'signOut',
      }, signOutCytologyCaseDeps);
    }
    if (!caseData) return { outcome: 'notFound' };
    const r = await dispatchCancerRegistryReportIfApplicable(caseData, caseData.order?.facilityId, caseData.order?.facilityName);
    const latest = await cancer.getByCaseId(entry.caseId);
    const newest = latest.ok ? [...latest.data].sort((a, b) => (b.submission?.submissionVersion ?? 0) - (a.submission?.submissionVersion ?? 0))[0] : undefined;
    return { outcome: r.dispatched ? 'sent' : 'notSent', queueId: newest?.id, submission: newest?.submission };
  },
  dispatch: (queue, entryId, payload) => dispatchInterfaceMessage(entryId, queue === 'cytology' ? 'REGISTRY_REPORT' : 'CANCER_REGISTRY_REPORT', payload),
  logAudit: event => mockAuditService.logEvent(event),
};

/** Batch 423: "Capture as CAPA" on a worklist row. */
export const registryCapaDeps: RegistryCapaDeps = {
  enforce: (capability, context) => authorizationService.enforce(capability as any, context as any),
  getCaseDeficiencies: async caseId => { const r = await mockSpecimenDeficiencyService.getByCaseId(caseId); return r.ok ? r.data : []; },
  raise: deficiency => mockSpecimenDeficiencyService.raise(deficiency) as any,
  logAudit: event => mockAuditService.logEvent(event),
};
