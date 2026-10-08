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
import { mockQaSupervisionAssignmentService } from '../quality/mockQaSupervisionAssignmentService';
import { mockCountersignService } from '../cases/mockCountersignService';
import { caseRouter } from '../cases/CaseRouter';
import { mockUserService } from '../users/mockUserService';
import { sendEmail } from '../communications/notificationService';
import { mockAuditService } from '../auditlog/mockAuditService';
import { mockCytologyReviewRecordService } from './mockCytologyReviewRecordService';
import { mockCytologyQcCaseAssignmentService } from '../cytologyQc/mockCytologyQcCaseAssignmentService';
import { mockCytologyQcSettingsService } from './mockCytologyQcSettingsService';
import { mockFacilityCytologyQcOverrideService } from './mockFacilityCytologyQcOverrideService';
import { mockStaffCytologyQcOverrideService } from './mockStaffCytologyQcOverrideService';
import { mockSpecimenDictionaryService } from '../specimenDictionary/mockSpecimenDictionaryService';
import { resolveCytologyReportLocale } from './resolveCytologyReportLanguage';
import { mockCytologySignOutRecordService } from './mockCytologySignOutRecordService';
import { publishReportReleasedEvent } from '../reports/publishReportReleasedEvent';
import { generateCytologyReportPdfSnapshot } from './generateCytologyReportPdfSnapshot';
import { mockRegistrySettingsService } from '../facilities/mockRegistrySettingsService';
import { mockFacilityRegistryOverrideService } from '../facilities/mockFacilityRegistryOverrideService';
import { mockCytologyRegistryOutboundQueueService } from './mockCytologyRegistryOutboundQueueService';
import { dispatchInterfaceMessage } from '../interfaceDispatch/dispatchInterfaceMessage';
import { mockScreeningRegistryConfigService } from '../screeningRegistry/mockScreeningRegistryConfigService';
import { mockCytologyComplianceFeaturesService } from './mockCytologyComplianceFeaturesService';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const signOutCytologyCaseDeps: CytologySignOutDeps = {
  enforce: (capability, context) => authorizationService.enforce(capability as any, context as any),
  signatureGate: signatureGate as any,
  getSessionUser,
  resolveFinalizeAuthorityContext: caseData => resolveFinalizeAuthorityContext(caseData as any),
  getActiveSupervisionAssignment: (activityTypeId, userId, subspecialtyId) =>
    mockQaSupervisionAssignmentService.getActiveAssignmentForUser(activityTypeId, userId, subspecialtyId).then(r => (r.ok ? r.data : null)),
  releaseForCountersign: input => mockCountersignService.release(input as any),
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
  getAllReviews: () => mockCytologyReviewRecordService.getAll() as any,
  createQcAssignment: assignment => mockCytologyQcCaseAssignmentService.create(assignment) as any,
  getQcSettings: async (facilityId, userId) => {
    const [enterprise, facility, staff] = await Promise.all([
      mockCytologyQcSettingsService.get(),
      mockFacilityCytologyQcOverrideService.getForFacility(facilityId),
      mockStaffCytologyQcOverrideService.getForStaff(userId),
    ]);
    return enterprise.ok && facility.ok && staff.ok ? { enterprise: enterprise.data, facility: facility.data, staff: staff.data } : null;
  },
  random: () => Math.random(),
  getSpecimenDictionary: () => mockSpecimenDictionaryService.getAll() as any,
  resolveReportLocale: facilityId => resolveCytologyReportLocale(facilityId),
  getCaseSignOutRecords: caseId => mockCytologySignOutRecordService.getByCaseId(caseId) as any,
  createSignOutRecord: input => mockCytologySignOutRecordService.create(input as any) as any,
  publishReportReleased: event => publishReportReleasedEvent(event),
  generatePdfSnapshot: reportContent => generateCytologyReportPdfSnapshot(reportContent),
  getRegistrySettings: async facilityId => {
    const [enterprise, facility] = await Promise.all([
      mockRegistrySettingsService.get(),
      mockFacilityRegistryOverrideService.getForFacility(facilityId),
    ]);
    return { enterprise: enterprise.ok ? enterprise.data : { registryId: 'none' }, facility: facility.ok ? facility.data : null };
  },
  getComplianceSettings: facilityId => mockCytologyComplianceFeaturesService.forFacility(facilityId),
  getRegistryConfig: async registryId => {
    const res = await mockScreeningRegistryConfigService.get(registryId);
    return res.ok ? res.data : { registryId, requireMappedCodes: true, codeMappings: [] };
  },
  registryQueue: {
    enqueue: entry => mockCytologyRegistryOutboundQueueService.enqueue(entry as any) as any,
    markSent: id => mockCytologyRegistryOutboundQueueService.markSent(id),
    markFailed: (id, failure) => mockCytologyRegistryOutboundQueueService.markFailed(id, failure as any),
    getByCaseId: caseId => mockCytologyRegistryOutboundQueueService.getByCaseId(caseId) as any,
  },
  dispatchInterfaceMessage: (queueId, kind, payload) => dispatchInterfaceMessage(queueId, kind as any, payload) as any,
  // Batch 452 (PS-156): the configured correlation window.
  getHistologyCorrelationRule: facilityId => getEffectiveHistologyCorrelationRule(facilityId),
  now: () => new Date(),
  newId: () => crypto.randomUUID(),
};
