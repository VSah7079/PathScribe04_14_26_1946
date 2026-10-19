// src/services/cytology/signOutCytologyCaseDeps.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 409. The real services signOutCytologyCase uses, wired once here so the
// Cytology Workspace page doesn't import them (deployment-neutral UI) and the
// sign-out itself stays testable with its dependencies passed in.
// ─────────────────────────────────────────────────────────────────────────────

import { registrySendGateCheck } from '../registryGoLive/registryGoLiveDeps';
import type { CytologySignOutDeps } from './signOutCytologyCase';
import { getEffectiveHistologyCorrelationRule } from './cytologyHistologyCorrelationLive';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { signatureGate } from '../auth/authSessionInstance';
import { getSessionUser } from '../auth/caseAccessControl';
import { resolveFinalizeAuthorityContext } from '../auth/resolveFinalizeAuthorityContext';
import { qaSupervisionAssignmentService as mockQaSupervisionAssignmentService } from '../quality/qaSupervisionAssignmentServiceInstance';
import { countersignService } from '../cases/countersignServiceInstance';
import { caseRouter } from '../cases/CaseRouter';
import { mockUserService } from '../users/mockUserService';
import { sendEmail } from '../communications/notificationService';
import { mockAuditService } from '../auditlog/mockAuditService';
import { cytologyReviewRecordService } from './cytologyReviewRecordServiceInstance';
import { cytologyQcCaseAssignmentService } from '../cytologyQc/cytologyQcCaseAssignmentServiceInstance';
import { cytologyQcRuleService } from '../cytologyQc/cytologyQcRuleServiceInstance';
import { mockCytologyQcSamplingStateService } from '../cytologyQc/mockCytologyQcSamplingStateService';
import { cytologyQcSettingsService } from './cytologyQcSettingsServiceInstance';
import { facilityCytologyQcOverrideService } from './facilityCytologyQcOverrideServiceInstance';
import { staffCytologyQcOverrideService } from './staffCytologyQcOverrideServiceInstance';
import { specimenDictionaryService as mockSpecimenDictionaryService } from '../specimenDictionary/specimenDictionaryServiceInstance';
import { resolveCytologyReportLocale } from './resolveCytologyReportLanguage';
import { cytologySignOutRecordService } from './cytologySignOutRecordServiceInstance';
import { publishReportReleasedEvent } from '../reports/publishReportReleasedEvent';
import { generateCytologyReportPdfSnapshot } from './generateCytologyReportPdfSnapshot';
import { mockRegistrySettingsService } from '../facilities/mockRegistrySettingsService';
import { mockFacilityRegistryOverrideService } from '../facilities/mockFacilityRegistryOverrideService';
import { cytologyRegistryOutboundQueueService } from './cytologyRegistryOutboundQueueServiceInstance';
import { dispatchInterfaceMessage } from '../interfaceDispatch/dispatchInterfaceMessage';
import { screeningRegistryConfigService } from '../screeningRegistry/screeningRegistryConfigServiceInstance';
import { cytologyComplianceFeaturesService } from './cytologyComplianceFeaturesServiceInstance';

export const signOutCytologyCaseDeps: CytologySignOutDeps = {
  // Batch 519 (PS-273): the review's synoptic template, from the Synoptic Library (loaded on first use, so the
  // services barrel doesn't pull in the template service).
  getSynopticTemplate: id => import('./cytologyTemplateLibraryDeps').then(m => m.cytologyTemplateLibraryDeps.getTemplate(id)),
  enforce: (capability, context) => authorizationService.enforce(capability as any, context as any),
  signatureGate: signatureGate as any,
  getSessionUser,
  resolveFinalizeAuthorityContext: caseData => resolveFinalizeAuthorityContext(caseData as any),
  getActiveSupervisionAssignment: (activityTypeId, userId, subspecialtyId) =>
    mockQaSupervisionAssignmentService.getActiveAssignmentForUser(activityTypeId, userId, subspecialtyId).then(r => (r.ok ? r.data : null)),
  releaseForCountersign: input => countersignService.release(input as any),
  // Batch 485: the real per-specimen completion path (signOutCytologyCase.ts's own doc comment has the full reasoning).
  countersign: {
    getForSpecimen: (caseId, specimenId) => countersignService.getForSpecimen(caseId, specimenId),
    countersign: input => countersignService.countersign(input),
    getAll: () => countersignService.getAll(),
  },
  // PS-71 (Batch 458): saves carry the version the change was built from.
  getCase: caseId => caseRouter.getCase(caseId),
  updateCase: (caseId, patch, expectedVersion) => caseRouter.updateCase(caseId, patch as any, expectedVersion),
  getAllCases: () => caseRouter.getAll() as any,
  getUserEmail: async userId => {
    const res = await mockUserService.getById(userId).catch(() => null);
    return res?.ok ? res.data?.email : undefined;
  },
  sendEmail: message => sendEmail(message as any),
  logAudit: event => mockAuditService.logEvent(event),
  sendGate: registryId => registrySendGateCheck('screening', registryId),
  getAllReviews: () => cytologyReviewRecordService.getAll() as any,
  createQcAssignment: assignment => cytologyQcCaseAssignmentService.create(assignment) as any,
  // Batch 501: one open QC assignment per specimen; the QC Rules engine and its sampling counters.
  getQcAssignmentsForCase: caseId => cytologyQcCaseAssignmentService.getByCaseId(caseId) as any,
  applyQcTrigger: (id, changes) => cytologyQcCaseAssignmentService.applyAdditionalTrigger(id, changes) as any,
  getActiveQcRules: () => cytologyQcRuleService.getActive() as any,
  qcSamplingStates: mockCytologyQcSamplingStateService,
  getQcSettings: async (facilityId, userId) => {
    const [enterprise, facility, staff] = await Promise.all([
      cytologyQcSettingsService.get(),
      facilityCytologyQcOverrideService.getForFacility(facilityId),
      staffCytologyQcOverrideService.getForStaff(userId),
    ]);
    return enterprise.ok && facility.ok && staff.ok ? { enterprise: enterprise.data, facility: facility.data, staff: staff.data } : null;
  },
  random: () => Math.random(),
  getSpecimenDictionary: () => mockSpecimenDictionaryService.getAll() as any,
  resolveReportLocale: facilityId => resolveCytologyReportLocale(facilityId),
  getCaseSignOutRecords: caseId => cytologySignOutRecordService.getByCaseId(caseId) as any,
  createSignOutRecord: input => cytologySignOutRecordService.create(input as any) as any,
  publishReportReleased: event => publishReportReleasedEvent(event),
  // Batch 534: every cytology report output follows the laboratory's release delay.
  releaseReport: async (event, hold) => (await import('../reportRelease/releaseThroughDelay')).releaseThroughDelay(event, hold),
  generatePdfSnapshot: reportContent => generateCytologyReportPdfSnapshot(reportContent),
  // Batch 532: the consolidated case report.
  generateCaseReportPdfSnapshot: async (caseData, records) => {
    const [{ resolveCytologyCaseReport }, { generateCytologyCaseReportPdfSnapshot }] = await Promise.all([
      import('./resolveCytologyCaseReport'), import('./generateCytologyCaseReportPdf'),
    ]);
    return generateCytologyCaseReportPdfSnapshot(resolveCytologyCaseReport(caseData, records));
  },
  getRegistrySettings: async facilityId => {
    const [enterprise, facility] = await Promise.all([
      mockRegistrySettingsService.get(),
      mockFacilityRegistryOverrideService.getForFacility(facilityId),
    ]);
    return { enterprise: enterprise.ok ? enterprise.data : { registryId: 'none' }, facility: facility.ok ? facility.data : null };
  },
  getComplianceSettings: facilityId => cytologyComplianceFeaturesService.forFacility(facilityId),
  getRegistryConfig: async registryId => {
    const res = await screeningRegistryConfigService.get(registryId);
    return res.ok ? res.data : { registryId, requireMappedCodes: true, codeMappings: [] };
  },
  registryQueue: {
    enqueue: entry => cytologyRegistryOutboundQueueService.enqueue(entry as any) as any,
    markSent: id => cytologyRegistryOutboundQueueService.markSent(id),
    markFailed: (id, failure) => cytologyRegistryOutboundQueueService.markFailed(id, failure as any),
    getByCaseId: caseId => cytologyRegistryOutboundQueueService.getByCaseId(caseId) as any,
  },
  dispatchInterfaceMessage: (queueId, kind, payload) => dispatchInterfaceMessage(queueId, kind as any, payload) as any,
  // Batch 452 (PS-156): the configured correlation window.
  getHistologyCorrelationRule: facilityId => getEffectiveHistologyCorrelationRule(facilityId),
  now: () => new Date(),
  newId: () => crypto.randomUUID(),
};

/** Batch 533: urgent preliminary reports (releaseCytologyPreliminary.ts), on the same services as sign-out. */
export const cytologyPreliminaryDeps: import('./releaseCytologyPreliminary').CytologyPreliminaryDeps = {
  ...signOutCytologyCaseDeps,
  renderPdfSnapshot: content => generateCytologyReportPdfSnapshot(content),
};
