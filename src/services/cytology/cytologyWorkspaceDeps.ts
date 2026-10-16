// src/services/cytology/cytologyWorkspaceDeps.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 410. The real services the Cytology Workspace's services use
// (loadCytologyWorkspace, saveCytologyReview, cytologyCaseActions), wired once
// here so CytologyScreeningPage.tsx doesn't import them (deployment-neutral UI).
// ─────────────────────────────────────────────────────────────────────────────

import { materialEventBus } from '../material/materialEvents';
import type { CytologyWorkspaceDeps } from './cytologyWorkspacePorts';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { caseRouter } from '../cases/CaseRouter';
import { applyPoolRouting } from '../cases/casePoolAssignmentService';
import { mockSpecimenDictionaryService } from '../specimenDictionary/mockSpecimenDictionaryService';
import { mockCytologyCategoryService } from './mockCytologyCategoryService';
import { mockCytologyNomenclatureSettingsService } from './mockCytologyNomenclatureSettingsService';
import { mockFacilityCytologyNomenclatureOverrideService } from './mockFacilityCytologyNomenclatureOverrideService';
import { mockCytologyInstrumentationService } from './mockCytologyInstrumentationService';
import { mockFacilityCytologyInstrumentationOverrideService } from './mockFacilityCytologyInstrumentationOverrideService';
import { mockFacilityService } from '../facilities/mockFacilityService';
import { mockUserService } from '../users/mockUserService';
import { mockPathologyLexiconService } from './mockPathologyLexiconService';
import { mockCytologyQcSettingsService } from './mockCytologyQcSettingsService';
import { mockFacilityCytologyQcOverrideService } from './mockFacilityCytologyQcOverrideService';
import { mockStaffCytologyQcOverrideService } from './mockStaffCytologyQcOverrideService';
import { mockCytologyWorkloadCapSettingsService } from './mockCytologyWorkloadCapSettingsService';
import { mockFacilityCytologyWorkloadCapOverrideService } from './mockFacilityCytologyWorkloadCapOverrideService';
import { mockStaffCytologyWorkloadCapOverrideService } from './mockStaffCytologyWorkloadCapOverrideService';
import { mockCytologyWorkloadLedgerService } from './mockCytologyWorkloadLedgerService';
import { mockSnomedCervicalHistologySeverityMappingService } from './mockSnomedCervicalHistologySeverityMappingService';
import { mockCytologyReviewRecordService } from './mockCytologyReviewRecordService';
import { mockCytologySignOutRecordService } from './mockCytologySignOutRecordService';
import { mockAiScreeningResultService } from '../digitalPathology/mockAiScreeningResultService';
import { mockEncounterService } from '../encounters/mockEncounterService';
import { mockQaActivityRecordService } from '../quality/mockQaActivityRecordService';
import { mockAuditService } from '../auditlog/mockAuditService';
import { resolveDecantCassetteColor } from '@/utils/resolveDecantCassetteColor';
import { mockCytologyComplianceFeaturesService } from './mockCytologyComplianceFeaturesService';
import { resolveCytologyReportLocale } from './resolveCytologyReportLanguage';
import { renderCytologyReportPdf } from './renderCytologyPdf';
import { cytologyPreviewWatermarkFor } from './cytologyPdfLabelsFor';

const none = Promise.resolve({ ok: true as const, data: null });
const dataOr = <T>(res: { ok: boolean; data?: T }, fallback: T | null = null) => (res.ok ? (res.data as T) : fallback);

export const cytologyWorkspaceDeps: CytologyWorkspaceDeps = {
  enforce: (capability, context) => authorizationService.enforce(capability as any, context as any),
  now: () => new Date(),
  random: () => Math.random(),
  newId: () => Date.now().toString(36),
  // Batch 453: decants through the atomic, versioned material save.
  saveDecantChange: async (caseId, change, expectedVersion) => (await import('../material/caseMaterialService')).applyDecantChangeLive(caseId, change, expectedVersion),
  publishMaterialEvent: event => materialEventBus.publish(event),

  getCase: (caseId, userId) => caseRouter.getCase(caseId, userId),
  getAllCases: filter => caseRouter.getAll(filter as any) as any,
  // PS-71 (Batch 458): forwards the version the change was built from.
  updateCase: (caseId, patch, expectedVersion) => caseRouter.updateCase(caseId, patch as any, expectedVersion),
  listCasesForUser: userId => caseRouter.listCasesForUser(userId),
  returnToCytologyPool: caseData => applyPoolRouting(caseData, '1', 'Cytology'),

  getSpecimenDictionary: () => mockSpecimenDictionaryService.getAll() as any,
  getAllCategories: () => mockCytologyCategoryService.getAll() as any,
  getCategoriesFor: system => mockCytologyCategoryService.getByNomenclatureSystem(system) as any,
  getNomenclatureSettings: async facilityId => {
    const [enterprise, facility] = await Promise.all([
      mockCytologyNomenclatureSettingsService.get(),
      facilityId ? mockFacilityCytologyNomenclatureOverrideService.getForFacility(facilityId) : none,
    ]);
    return { enterprise: dataOr(enterprise as any), facility: dataOr(facility as any) };
  },
  getInstrumentationSettings: async facilityId => {
    const [enterprise, facility] = await Promise.all([
      mockCytologyInstrumentationService.get(),
      facilityId ? mockFacilityCytologyInstrumentationOverrideService.getForFacility(facilityId) : none,
    ]);
    return { enterprise: dataOr(enterprise as any), facility: dataOr(facility as any) };
  },
  getFacilityJurisdiction: async facilityId => {
    const res = await mockFacilityService.getById(facilityId);
    return res.ok ? res.data.jurisdiction : undefined;
  },
  getProviderCredentials: async userId => {
    const res = await mockUserService.getById(userId);
    return res.ok ? res.data.providerCredentials : undefined;
  },
  getPathologyLexicon: () => mockPathologyLexiconService.getAll() as any,
  getQcSettings: async (facilityId, userId) => {
    const [enterprise, facility, staff] = await Promise.all([
      mockCytologyQcSettingsService.get(),
      mockFacilityCytologyQcOverrideService.getForFacility(facilityId),
      mockStaffCytologyQcOverrideService.getForStaff(userId),
    ]);
    return enterprise.ok && facility.ok && staff.ok ? { enterprise: enterprise.data, facility: facility.data, staff: staff.data } : null;
  },
  getWorkloadCaps: async (facilityId, userId) => {
    const [enterprise, facility, staff] = await Promise.all([
      mockCytologyWorkloadCapSettingsService.get(),
      facilityId ? mockFacilityCytologyWorkloadCapOverrideService.getForFacility(facilityId) : none,
      mockStaffCytologyWorkloadCapOverrideService.getForStaff(userId),
    ]);
    const all = [enterprise, facility, staff] as any[];
    return all.every(r => r.ok) ? { enterprise: all[0].data, facility: all[1].data, staff: all[2].data } : null;
  },
  getComplianceSettings: facilityId => mockCytologyComplianceFeaturesService.forFacility(facilityId),
  getSnomedSeverityMapping: () => mockSnomedCervicalHistologySeverityMappingService.getAll() as any,

  getReviewsForSpecimen: specimenId => mockCytologyReviewRecordService.getBySpecimenId(specimenId) as any,
  getAllReviews: () => mockCytologyReviewRecordService.getAll() as any,
  createReview: input => mockCytologyReviewRecordService.create(input) as any,
  updateReview: (reviewId, userId, patch) => mockCytologyReviewRecordService.update(reviewId, userId, patch) as any,
  getSignOutRecords: specimenId => mockCytologySignOutRecordService.getBySpecimenId(specimenId) as any,
  getCaseSignOutRecords: caseId => mockCytologySignOutRecordService.getByCaseId(caseId) as any,
  getAiResults: caseId => mockAiScreeningResultService.getByCaseId(caseId) as any,

  getLedgerInWindow: (userId, start, end) => mockCytologyWorkloadLedgerService.getForUserInWindow(userId, start, end) as any,
  recordLedgerEntry: entry => mockCytologyWorkloadLedgerService.record(entry),
  listEncounters: patientId => mockEncounterService.listForPatient(patientId) as any,
  createQaActivity: record => mockQaActivityRecordService.create(record) as any,
  logAudit: event => mockAuditService.logEvent(event),

  resolveDecantCassetteColor: (decantType, context) => resolveDecantCassetteColor(decantType, context as any),
  resolveReportLocale: facilityId => resolveCytologyReportLocale(facilityId),
  // Batch 539 (PS-539 D2): made by the report renderer; a preview carries the watermark.
  renderReportPdf: (content, options) =>
    renderCytologyReportPdf(content, options?.preview ? { watermarkText: cytologyPreviewWatermarkFor(content.language) } : {}),
};
