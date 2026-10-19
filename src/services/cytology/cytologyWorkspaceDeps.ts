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
import { specimenDictionaryService as mockSpecimenDictionaryService } from '../specimenDictionary/specimenDictionaryServiceInstance';
import { cytologyCategoryService } from './cytologyCategoryServiceInstance';
import { cytologyNomenclatureSettingsService } from './cytologyNomenclatureSettingsServiceInstance';
import { facilityCytologyNomenclatureOverrideService } from './facilityCytologyNomenclatureOverrideServiceInstance';
import { cytologyInstrumentationService } from './cytologyInstrumentationServiceInstance';
import { facilityCytologyInstrumentationOverrideService } from './facilityCytologyInstrumentationOverrideServiceInstance';
import { mockFacilityService } from '../facilities/mockFacilityService';
import { mockUserService } from '../users/mockUserService';
import { pathologyLexiconService } from './pathologyLexiconServiceInstance';
import { cytologyQcSettingsService } from './cytologyQcSettingsServiceInstance';
import { facilityCytologyQcOverrideService } from './facilityCytologyQcOverrideServiceInstance';
import { staffCytologyQcOverrideService } from './staffCytologyQcOverrideServiceInstance';
import { cytologyWorkloadCapSettingsService } from './cytologyWorkloadCapSettingsServiceInstance';
import { facilityCytologyWorkloadCapOverrideService } from './facilityCytologyWorkloadCapOverrideServiceInstance';
import { staffCytologyWorkloadCapOverrideService } from './staffCytologyWorkloadCapOverrideServiceInstance';
import { cytologyWorkloadLedgerService } from './cytologyWorkloadLedgerServiceInstance';
import { snomedCervicalHistologySeverityMappingService } from './snomedCervicalHistologySeverityMappingServiceInstance';
import { cytologyReviewRecordService } from './cytologyReviewRecordServiceInstance';
import { cytologySignOutRecordService } from './cytologySignOutRecordServiceInstance';
import { aiScreeningResultService as mockAiScreeningResultService } from '../digitalPathology/aiScreeningResultServiceInstance';
import { mockEncounterService } from '../encounters/mockEncounterService';
import { qaActivityRecordService as mockQaActivityRecordService } from '../quality/qaActivityRecordServiceInstance';
import { mockAuditService } from '../auditlog/mockAuditService';
import { resolveDecantCassetteColor } from '@/utils/resolveDecantCassetteColor';
import { cytologyComplianceFeaturesService } from './cytologyComplianceFeaturesServiceInstance';
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
  getAllCategories: () => cytologyCategoryService.getAll() as any,
  getCategoriesFor: system => cytologyCategoryService.getByNomenclatureSystem(system) as any,
  getNomenclatureSettings: async facilityId => {
    const [enterprise, facility] = await Promise.all([
      cytologyNomenclatureSettingsService.get(),
      facilityId ? facilityCytologyNomenclatureOverrideService.getForFacility(facilityId) : none,
    ]);
    return { enterprise: dataOr(enterprise as any), facility: dataOr(facility as any) };
  },
  getInstrumentationSettings: async facilityId => {
    const [enterprise, facility] = await Promise.all([
      cytologyInstrumentationService.get(),
      facilityId ? facilityCytologyInstrumentationOverrideService.getForFacility(facilityId) : none,
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
  getPathologyLexicon: () => pathologyLexiconService.getAll() as any,
  getQcSettings: async (facilityId, userId) => {
    const [enterprise, facility, staff] = await Promise.all([
      cytologyQcSettingsService.get(),
      facilityCytologyQcOverrideService.getForFacility(facilityId),
      staffCytologyQcOverrideService.getForStaff(userId),
    ]);
    return enterprise.ok && facility.ok && staff.ok ? { enterprise: enterprise.data, facility: facility.data, staff: staff.data } : null;
  },
  getWorkloadCaps: async (facilityId, userId) => {
    const [enterprise, facility, staff] = await Promise.all([
      cytologyWorkloadCapSettingsService.get(),
      facilityId ? facilityCytologyWorkloadCapOverrideService.getForFacility(facilityId) : none,
      staffCytologyWorkloadCapOverrideService.getForStaff(userId),
    ]);
    const all = [enterprise, facility, staff] as any[];
    return all.every(r => r.ok) ? { enterprise: all[0].data, facility: all[1].data, staff: all[2].data } : null;
  },
  getComplianceSettings: facilityId => cytologyComplianceFeaturesService.forFacility(facilityId),
  getSnomedSeverityMapping: () => snomedCervicalHistologySeverityMappingService.getAll() as any,

  getReviewsForSpecimen: specimenId => cytologyReviewRecordService.getBySpecimenId(specimenId) as any,
  getAllReviews: () => cytologyReviewRecordService.getAll() as any,
  createReview: input => cytologyReviewRecordService.create(input) as any,
  updateReview: (reviewId, userId, patch) => cytologyReviewRecordService.update(reviewId, userId, patch) as any,
  getSignOutRecords: specimenId => cytologySignOutRecordService.getBySpecimenId(specimenId) as any,
  getCaseSignOutRecords: caseId => cytologySignOutRecordService.getByCaseId(caseId) as any,
  getAiResults: caseId => mockAiScreeningResultService.getByCaseId(caseId) as any,

  getLedgerInWindow: (userId, start, end) => cytologyWorkloadLedgerService.getForUserInWindow(userId, start, end) as any,
  recordLedgerEntry: entry => cytologyWorkloadLedgerService.record(entry),
  listEncounters: patientId => mockEncounterService.listForPatient(patientId) as any,
  createQaActivity: record => mockQaActivityRecordService.create(record) as any,
  logAudit: event => mockAuditService.logEvent(event),

  resolveDecantCassetteColor: (decantType, context) => resolveDecantCassetteColor(decantType, context as any),
  resolveReportLocale: facilityId => resolveCytologyReportLocale(facilityId),
  // Batch 539 (PS-539 D2): made by the report renderer; a preview carries the watermark.
  renderReportPdf: (content, options) =>
    renderCytologyReportPdf(content, options?.preview ? { watermarkText: cytologyPreviewWatermarkFor(content.language) } : {}),
};
