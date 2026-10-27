// src/services/cytology/mockCytologyQaReportService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per ICytologyQaReportService.ts's own header: the mock
// implementation of the real, backend-shaped QA report interface.
// Internally, this still does exactly what CytologyQaTab.tsx used to
// do itself before this fix — fetch every raw record via the existing
// mock CRUD services, filter by scope, and call the real Phase 49
// resolver functions. That's genuinely fine for a mock: the point of
// this file's existence isn't to make the mock itself fast, it's to
// put a real, stable interface boundary between "where the data
// happens to live today" and "what a caller is allowed to assume."
// A real, future implementation of ICytologyQaReportService can
// replace every one of these method bodies with a real server-side
// query, and CytologyQaTab.tsx — the only real caller — needs zero
// changes to keep working.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult } from '../types';
import type { QaScope } from '@/services/qualityAssurance/qaScope';
import { caseMatchesScope } from '@/services/qualityAssurance/qaScope';
import type { RegistryId } from '@/services/facilities/IRegistrySettingsService';
import type { ICytologyQaReportService } from './ICytologyQaReportService';
import { mockCytologyReviewRecordService } from './mockCytologyReviewRecordService';
import { mockCytologyCategoryService } from './mockCytologyCategoryService';
import { mockCytologyRegistryOutboundQueueService } from './mockCytologyRegistryOutboundQueueService';
import { mockCytologySignOutRecordService } from './mockCytologySignOutRecordService';
import { mockCytologyWorkloadLedgerService } from './mockCytologyWorkloadLedgerService';
import { mockCytologyScreeningHoursService } from './mockCytologyScreeningHoursService';
import { mockCytologyWorkloadCapSettingsService } from './mockCytologyWorkloadCapSettingsService';
import { caseRouter } from '@/services/cases/CaseRouter';
import { getSessionUser, canViewCrossTenantQaData } from '@/services/auth/caseAccessControl';
import { qaActivityRecordService } from '../quality/qaActivityRecordServiceInstance';
import { mockFacilityService } from '@/services/facilities/mockFacilityService';
import { GYN_CYTOLOGY_SECONDARY_SCREENING_ACTIVITY_TYPE_ID, CYTO_HISTO_CORRELATION_ACTIVITY_TYPE_ID } from '@/services/quality/mockQaActivityTypeService';
import { resolveCytologyHistologyCorrelationReport } from './resolveCytologyHistologyCorrelationReport';
import { isUnsatisfactoryAdequacy } from './classifyCytologyAgreement';
import { resolveCytologyUnscreenedBacklogReport, type CytologyBacklogSpecimenInput } from './resolveCytologyUnscreenedBacklogReport';
import { resolveCytologyPrimaryHpvFailsafeAuditReport, type CytologyPrimaryHpvFailsafeSpecimenInput } from './resolveCytologyPrimaryHpvFailsafeAuditReport';
import { loadMolecularOrders } from '../molecularOrders/mockMolecularOrderStore';
import { mockScreeningIntervalService } from './mockScreeningIntervalService';
import { resolveScreeningIntervalAdherence, type ScreeningAdherenceInput } from './screeningIntervals';
import type { MolecularQcRunRecord } from './IMolecularQcRunRecordService';
import { resolveCytologyEuComplianceMatrixReport, type CytologyEuComplianceSpecimenInput } from './resolveCytologyEuComplianceMatrixReport';
import { resolveCytologyHpvPositivityMonitorReport, type CytologyHpvIndicationType, type CytologyHpvPositivitySpecimenInput } from './resolveCytologyHpvPositivityMonitorReport';
import { mockMolecularQcRunRecordService } from './mockMolecularQcRunRecordService';
import { mockCytologyProficiencyTestResultService } from './mockCytologyProficiencyTestResultService';
import { resolveCytologyMolecularQcFailureRateReport } from './resolveCytologyMolecularQcFailureRateReport';
import { resolveCytologyMolecularLotToLotTrendReport } from './resolveCytologyMolecularLotToLotTrendReport';
import { resolveCytologyApacProficiencyTestReport } from './resolveCytologyApacProficiencyTestReport';
import type { CytologyReviewRecord } from '@/types/cytology/CytologyReviewRecord';
import type { CytologyCategoryEntry } from './ICytologyCategoryService';
import type { CytologySignOutRecord } from '@/types/cytology/CytologySignOutRecord';
import {
  resolveCytology10PercentRandomRescreeningReport,
  resolveCytologyDirectedHighRiskRescreeningReport,
  resolveCytologyCtVsPathologistCorrelationReport,
  resolveCytologyPostSignOutPeerReviewCorrelationReport,
  resolveCytologyPrimaryVsFinalDiagnosisReport,
} from './resolveCytologyQaReports';
import type { CytologySpecimenFinalDiagnosisRef } from './resolveCytologyPeerReviewComparisonPairs';
import { resolveCytologyCtStatisticalComparisonReport } from './resolveCytologyCtStatisticalComparisonReport';
import { resolveCytologyAscusHpvReflexReport, type CytologySpecimenHpvContext } from './resolveCytologyAscusHpvReflexReport';
import { dayStartFromSettings } from './screeningHoursRules';
import { resolveCytologyWorkloadTrackingReport } from './resolveCytologyWorkloadTrackingReport';
import { resolveCytologyRegistryTransmissionAuditReport } from './resolveCytologyRegistryTransmissionAuditReport';
import { resolveCytologyFiveYearRetrospectiveLookbackReport, type CytologyFiveYearLookbackSpecimenInput } from './resolveCytologyFiveYearRetrospectiveLookbackReport';

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });

/** Real, shared fetch-and-scope step every review-based report needs.
 *  Real, honest note matching this file's own header: in a real
 *  backend, `scope` would become a real WHERE clause evaluated by the
 *  database itself, not a client-side array filter run after fetching
 *  everything — this mock's own real limitation, not the interface's. */
async function fetchScopedReviewsAndCategories(scope: QaScope) {
  const session = getSessionUser();
  const crossTenant = canViewCrossTenantQaData(session);
  const [reviewsRes, categoriesRes, casesRes] = await Promise.all([
    mockCytologyReviewRecordService.getAll(),
    mockCytologyCategoryService.getAll(),
    caseRouter.getAll(undefined, { includeOrchestration: true, bypassAccessControl: crossTenant }),
  ]);
  const caseById: Record<string, any> = {};
  if (casesRes.ok) for (const c of casesRes.data as any[]) caseById[c.id] = c;
  const reviews: CytologyReviewRecord[] = reviewsRes.ok ? reviewsRes.data : [];
  const categories: CytologyCategoryEntry[] = categoriesRes.ok ? categoriesRes.data : [];
  const scopedReviews = reviews.filter(r => caseMatchesScope(caseById[r.caseId] ?? {}, scope));
  return { scopedReviews, categories, caseById };
}

/** Batch 608 (#77): a molecular QC run is in scope when it sits at the selected organisation or facility.
 *  A run with no location is lab-wide: it shows at enterprise level only. */
export function runMatchesScope(run: Pick<MolecularQcRunRecord, 'organisationId' | 'facilityId'>, scope: QaScope): boolean {
  if (scope.level === 'enterprise') return true;
  if (scope.level === 'client') return run.facilityId === scope.clientId;
  return run.organisationId === scope.organisationId;
}

/** Each in-scope specimen's chosen Final Diagnosis review (peer review and Batch 459's PS-152 report). */
function finalDiagnosisRefs(caseById: Record<string, any>, scope: QaScope): CytologySpecimenFinalDiagnosisRef[] {
  const refs: CytologySpecimenFinalDiagnosisRef[] = [];
  for (const c of Object.values(caseById) as any[]) {
    if (!caseMatchesScope(c, scope)) continue;
    for (const sp of c?.specimens ?? []) {
      const reviewRecordId = sp?.cytologyScreening?.finalDiagnosis?.reviewRecordId;
      if (reviewRecordId) refs.push({ specimenId: sp.id, caseId: c.id, finalDiagnosisReviewRecordId: reviewRecordId });
    }
  }
  return refs;
}

export const mockCytologyQaReportService: ICytologyQaReportService = {
  async get10PercentRandomRescreeningReport(scope) {
    const { scopedReviews, categories } = await fetchScopedReviewsAndCategories(scope);
    return ok(resolveCytology10PercentRandomRescreeningReport(scopedReviews, categories));
  },

  async getDirectedHighRiskRescreeningReport(scope) {
    const { scopedReviews, categories } = await fetchScopedReviewsAndCategories(scope);
    return ok(resolveCytologyDirectedHighRiskRescreeningReport(scopedReviews, categories));
  },

  async getCtVsPathologistCorrelationReport(scope) {
    const { scopedReviews, categories } = await fetchScopedReviewsAndCategories(scope);
    return ok(resolveCytologyCtVsPathologistCorrelationReport(scopedReviews, categories));
  },

  async getPostSignOutPeerReviewCorrelationReport(scope) {
    const { scopedReviews, categories, caseById } = await fetchScopedReviewsAndCategories(scope);
    return ok(resolveCytologyPostSignOutPeerReviewCorrelationReport(scopedReviews, finalDiagnosisRefs(caseById, scope), categories));
  },

  async getPrimaryVsFinalDiagnosisReport(scope) {
    const { scopedReviews, categories, caseById } = await fetchScopedReviewsAndCategories(scope);
    return ok(resolveCytologyPrimaryVsFinalDiagnosisReport(scopedReviews, finalDiagnosisRefs(caseById, scope), categories));
  },

  async getGynCytologySecondaryScreeningAuditReport(scope) {
    const [recordsRes, casesRes] = await Promise.all([
      qaActivityRecordService.getAll(),
      caseRouter.getAll(undefined, { includeOrchestration: true, bypassAccessControl: canViewCrossTenantQaData(getSessionUser()) }),
    ]);
    const caseById: Record<string, any> = {};
    if (casesRes.ok) for (const c of casesRes.data as any[]) caseById[c.id] = c;
    const records = recordsRes.ok ? recordsRes.data : [];
    const scoped = records.filter(
      r => r.activityTypeId === GYN_CYTOLOGY_SECONDARY_SCREENING_ACTIVITY_TYPE_ID && caseMatchesScope(caseById[r.caseId] ?? {}, scope),
    );
    return ok(scoped);
  },

  async getHistologyCorrelationReport(scope) {
    const [recordsRes, casesRes] = await Promise.all([
      qaActivityRecordService.getAll(),
      caseRouter.getAll(undefined, { includeOrchestration: true, bypassAccessControl: canViewCrossTenantQaData(getSessionUser()) }),
    ]);
    const caseById: Record<string, any> = {};
    if (casesRes.ok) for (const c of casesRes.data as any[]) caseById[c.id] = c;
    const records = recordsRes.ok ? recordsRes.data : [];
    const scoped = records.filter(
      r => r.activityTypeId === CYTO_HISTO_CORRELATION_ACTIVITY_TYPE_ID && caseMatchesScope(caseById[r.caseId] ?? {}, scope),
    );

    // Real, per this report's own resolver: case info keyed by the
    // real cytology caseId (the record's own caseId) and, separately,
    // by every real histologyCaseId referenced in fieldValues — a
    // given case can appear in both roles across different records,
    // so both lookups draw from the same real caseById map.
    const buildCaseInfo = (c: any): { patientMrn?: string; accessionNumber?: string; specimenDate?: string } => {
      const specimens = (c?.specimens as any[]) ?? [];
      const specimenDate = specimens.map(sp => sp.receivedAt).filter(Boolean).sort()[0];
      return { patientMrn: c?.patient?.mrn, accessionNumber: c?.accession?.accessionNumber, specimenDate };
    };
    const cytologyCaseInfoById: Record<string, ReturnType<typeof buildCaseInfo>> = {};
    const histologyCaseInfoById: Record<string, ReturnType<typeof buildCaseInfo>> = {};
    for (const r of scoped) {
      if (caseById[r.caseId]) cytologyCaseInfoById[r.caseId] = buildCaseInfo(caseById[r.caseId]);
      const histCaseId = r.fieldValues.histologyCaseId as string | undefined;
      if (histCaseId && caseById[histCaseId]) histologyCaseInfoById[histCaseId] = buildCaseInfo(caseById[histCaseId]);
    }

    return ok(resolveCytologyHistologyCorrelationReport(scoped, cytologyCaseInfoById, histologyCaseInfoById));
  },

  async getCtStatisticalComparisonReport(scope) {
    const { scopedReviews, categories } = await fetchScopedReviewsAndCategories(scope);
    const primaryScreenReviews = scopedReviews.filter(r => r.role === 'primary_screen');
    return ok(resolveCytologyCtStatisticalComparisonReport(primaryScreenReviews, categories));
  },

  async getAscusHpvReflexReport(scope) {
    const { scopedReviews, categories, caseById } = await fetchScopedReviewsAndCategories(scope);
    const primaryScreenReviews = scopedReviews.filter(r => r.role === 'primary_screen');
    const specimenHpvBySpecimenId: Record<string, CytologySpecimenHpvContext> = {};
    for (const c of Object.values(caseById) as any[]) {
      for (const sp of c?.specimens ?? []) {
        if (sp?.cytologyScreening) {
          specimenHpvBySpecimenId[sp.id] = { hpvOrderReason: sp.cytologyScreening.hpvOrderReason, hpvResult: sp.cytologyScreening.hpvResult };
        }
      }
    }
    return ok(resolveCytologyAscusHpvReflexReport(primaryScreenReviews, categories, specimenHpvBySpecimenId));
  },

  async getWorkloadTrackingReport(_scope, timezone) {
    // Real, honest scope note: workload ledger entries carry no real
    // facility/client field of their own to filter by yet — real,
    // separate follow-on if per-scope workload filtering is wanted;
    // this real report is Enterprise-wide until then, matching the
    // exact real limitation already flagged in Phase 50's own README
    // note about the Enterprise-only cap.
    const [ledgerRes, capRes, signOffRes] = await Promise.all([
      mockCytologyWorkloadLedgerService.getAll(),
      mockCytologyWorkloadCapSettingsService.get(),
      // Batch 572 (F7, option C): the end-of-day sign-offs, whose hours count where there is one.
      mockCytologyScreeningHoursService.getAll(),
    ]);
    const ledgerEntries = ledgerRes.ok ? ledgerRes.data : [];
    const enterpriseCap = capRes.ok ? capRes.data.dailySlideCap : 100;
    // Batch 574: the lab's day starts at its set hour (a night shift on one date), as it was at the time.
    const dayStart = dayStartFromSettings(capRes.ok ? capRes.data : null);
    return ok(resolveCytologyWorkloadTrackingReport(ledgerEntries, {}, enterpriseCap, signOffRes.ok ? signOffRes.data : [], timezone, dayStart));
  },

  async getRegistryTransmissionAuditReport(_scope, registryId: RegistryId) {
    const queueRes = await mockCytologyRegistryOutboundQueueService.getAll();
    const queueEntries = queueRes.ok ? queueRes.data : [];
    const caseIds = Array.from(new Set(queueEntries.map(e => e.caseId)));
    const signOutResults = await Promise.all(caseIds.map(id => mockCytologySignOutRecordService.getByCaseId(id)));
    const signOutByCaseId: Record<string, CytologySignOutRecord[]> = {};
    signOutResults.forEach((res, i) => { if (res.ok) signOutByCaseId[caseIds[i]] = res.data; });
    return ok(resolveCytologyRegistryTransmissionAuditReport(queueEntries, signOutByCaseId, registryId));
  },

  async getUnscreenedBacklogReport(scope) {
    const { scopedReviews, caseById } = await fetchScopedReviewsAndCategories(scope);
    const reviewedSpecimenIds = new Set(scopedReviews.map(r => r.specimenId));
    const cases = Object.values(caseById) as any[];
    const caseIds = cases.filter(c => caseMatchesScope(c, scope)).map(c => c.id);
    const signOutResults = await Promise.all(caseIds.map(id => mockCytologySignOutRecordService.getByCaseId(id)));
    const signedOutSpecimenIds = new Set<string>();
    signOutResults.forEach(res => { if (res.ok) for (const s of res.data) signedOutSpecimenIds.add(s.specimenId); });

    const backlogSpecimens: CytologyBacklogSpecimenInput[] = [];
    for (const c of cases) {
      if (!caseMatchesScope(c, scope)) continue;
      for (const sp of c?.specimens ?? []) {
        if (!sp?.cytologyScreening) continue; // real, only cytology-relevant specimens belong in this report
        if (signedOutSpecimenIds.has(sp.id)) continue; // real, already-signed-out specimens are not backlog
        backlogSpecimens.push({
          caseId: c.id, specimenId: sp.id, accessionId: c?.accession?.accessionNumber,
          collectedAt: sp.collectedAt, receivedAt: sp.receivedAt,
          hasAnyReview: reviewedSpecimenIds.has(sp.id),
        });
      }
    }
    return ok(resolveCytologyUnscreenedBacklogReport(backlogSpecimens, new Date()));
  },

  async getPrimaryHpvFailsafeAuditReport(scope) {
    const [{ scopedReviews, caseById, categories }, facilitiesRes] = await Promise.all([
      fetchScopedReviewsAndCategories(scope),
      mockFacilityService.getAll(),
    ]);
    const jurisdictionByFacilityId: Record<string, string> = {};
    if (facilitiesRes.ok) for (const f of facilitiesRes.data) jurisdictionByFacilityId[f.id] = f.jurisdiction;

    const UK_JURISDICTIONS = new Set(['GB_EW', 'GB_SCT', 'GB_NIR']);
    const primaryScreenBySpecimenId = new Map(scopedReviews.filter(r => r.role === 'primary_screen').map(r => [r.specimenId, r]));

    const inputs: CytologyPrimaryHpvFailsafeSpecimenInput[] = [];
    for (const c of Object.values(caseById) as any[]) {
      if (!caseMatchesScope(c, scope)) continue;
      const jurisdiction = jurisdictionByFacilityId[c?.order?.facilityId];
      if (!jurisdiction || !UK_JURISDICTIONS.has(jurisdiction)) continue;
      for (const sp of c?.specimens ?? []) {
        if (!sp?.cytologyScreening) continue;
        const triageReview = primaryScreenBySpecimenId.get(sp.id);
        inputs.push({
          jurisdiction,
          hpvPositive: sp.cytologyScreening.hpvResult === 'Positive',
          cytologyTriagePerformed: !!triageReview,
          cytologyTriageInadequate: triageReview ? isUnsatisfactoryAdequacy(triageReview.adequacySelections?.map((s: any) => s.categoryId), categories) : false,
          followUp: sp.cytologyScreening.hpvFollowUp,
        });
      }
    }
    return ok(resolveCytologyPrimaryHpvFailsafeAuditReport(inputs));
  },

  async getEuComplianceMatrixReport(scope) {
    const [{ caseById }, facilitiesRes, recordsRes, intervalsRes] = await Promise.all([
      fetchScopedReviewsAndCategories(scope),
      mockFacilityService.getAll(),
      qaActivityRecordService.getAll(),
      mockScreeningIntervalService.get(),
    ]);
    const jurisdictionByFacilityId: Record<string, string> = {};
    const registryIdByFacilityId: Record<string, string | undefined> = {};
    if (facilitiesRes.ok) for (const f of facilitiesRes.data) { jurisdictionByFacilityId[f.id] = f.jurisdiction; registryIdByFacilityId[f.id] = f.nationalRegistryId; }
    // Batch 608 (#52): each patient's cytology screens by date, across every case, for interval adherence.
    type ScreenCase = { patient?: { id?: string }; specimens?: { cytologyScreening?: unknown; collectedAt?: string; receivedAt?: string }[] };
    const screenDates = (c: ScreenCase): string[] => (c?.specimens ?? []).filter(sp => sp?.cytologyScreening).map(sp => sp.collectedAt ?? sp.receivedAt).filter((d): d is string => !!d);
    const screensByPatient = new Map<string, string[]>();
    for (const c of Object.values(caseById) as ScreenCase[]) {
      const pid = c?.patient?.id;
      if (pid) screensByPatient.set(pid, [...(screensByPatient.get(pid) ?? []), ...screenDates(c)]);
    }
    const adherenceInputs: ScreeningAdherenceInput[] = [];

    const EU_JURISDICTIONS = new Set(['FR', 'DE', 'NL', 'BE', 'IE']);
    const inputs: CytologyEuComplianceSpecimenInput[] = [];
    const countryByCaseId: Record<string, string> = {};
    for (const c of Object.values(caseById) as any[]) {
      if (!caseMatchesScope(c, scope)) continue;
      const jurisdiction = jurisdictionByFacilityId[c?.order?.facilityId];
      if (!jurisdiction || !EU_JURISDICTIONS.has(jurisdiction)) continue;
      countryByCaseId[c.id] = jurisdiction;
      for (const sp of c?.specimens ?? []) {
        if (!sp?.cytologyScreening) continue;
        const hpvOrderReason = sp.cytologyScreening.hpvOrderReason;
        inputs.push({
          countryCode: jurisdiction,
          hpvStatus: hpvOrderReason === 'co_test' ? 'co_test' as const : hpvOrderReason ? 'primary' as const : 'not_applicable' as const,
          nationalRegistryId: registryIdByFacilityId[c?.order?.facilityId],
          platform: sp.cytologyScreening.liquidBasedPlatform,
        });
        const screenedAt: string | undefined = sp.collectedAt ?? sp.receivedAt;
        const previous = (screensByPatient.get(c?.patient?.id) ?? []).filter(d => screenedAt && d < screenedAt).sort().pop();
        adherenceInputs.push({ countryCode: jurisdiction, dateOfBirth: c?.patient?.dateOfBirth, screenedAt, previousScreenAt: previous });
      }
    }

    const records = recordsRes.ok ? recordsRes.data : [];
    const nonConformityCountByCountry: Record<string, number> = {};
    for (const r of records) {
      if (r.outcome !== 'discordant') continue;
      const country = countryByCaseId[r.caseId];
      if (!country) continue;
      nonConformityCountByCountry[country] = (nonConformityCountByCountry[country] ?? 0) + 1;
    }

    const adherence = resolveScreeningIntervalAdherence(adherenceInputs, intervalsRes.ok ? intervalsRes.data : []);
    return ok(resolveCytologyEuComplianceMatrixReport(inputs, nonConformityCountByCountry, adherence));
  },

  async getHpvPositivityMonitorReport(scope) {
    const { caseById } = await fetchScopedReviewsAndCategories(scope);
    // Batch 608 (#76): an in-house molecular order names the assay; a name typed on the specimen wins.
    const orderAssayBySpecimen = new Map(loadMolecularOrders().filter(o => o.assayName).map(o => [o.specimenId, o.assayName]));
    const inputs: CytologyHpvPositivitySpecimenInput[] = [];
    for (const c of Object.values(caseById) as any[]) {
      if (!caseMatchesScope(c, scope)) continue;
      const testingSite = c?.order?.facilityId ?? 'Unknown Site';
      for (const sp of c?.specimens ?? []) {
        const screening = sp?.cytologyScreening;
        // Real, only genuinely completed HPV tests belong in a
        // positivity monitor — Pending/Not Performed/undefined are
        // not real results to tally.
        if (screening?.hpvResult !== 'Positive' && screening?.hpvResult !== 'Negative') continue;
        const indicationType: CytologyHpvIndicationType = screening.hpvOrderReason === 'co_test' ? 'co_testing'
          : screening.hpvOrderReason === 'ascus_reflex' ? 'ascus_triage'
          : screening.hpvOrderReason === 'post_treatment_surveillance' ? 'post_treatment_follow_up'
          : 'primary_screening';
        const genotype = screening.hpvGenotypeDetail;
        inputs.push({
          testingSite,
          indicationType,
          assayName: screening.hpvAssayName ?? orderAssayBySpecimen.get(sp.id),
          hpvPositive: screening.hpvResult === 'Positive',
          hpv16Positive: !!genotype?.hpv16,
          hpv18Or45Positive: !!genotype?.hpv18Or45,
          otherHrPositive: !!genotype?.otherHighRisk,
        });
      }
    }
    return ok(resolveCytologyHpvPositivityMonitorReport(inputs));
  },

  // Real, per direct instruction ("synthesize synthetic values and
  // add them to the seed"): MOL-QA-02 and MOL-QA-04 both read the same
  // real MolecularQcRunRecord seed data. Real, honest scope note: an
  // instrument QC run has no real case/facility linkage in this data
  // model — it's real, lab-wide operational data, not scoped clinical
  // data — so _scope is accepted for interface consistency with every
  // other report here, but genuinely has nothing to filter against.
  async getMolecularQcFailureRateReport(scope) {
    const runsRes = await mockMolecularQcRunRecordService.getAll();
    const runs = runsRes.ok ? runsRes.data.filter(r => runMatchesScope(r, scope)) : [];
    return ok(resolveCytologyMolecularQcFailureRateReport(runs));
  },

  async getMolecularLotToLotTrendReport(scope) {
    const runsRes = await mockMolecularQcRunRecordService.getAll();
    const runs = runsRes.ok ? runsRes.data.filter(r => runMatchesScope(r, scope)) : [];
    return ok(resolveCytologyMolecularLotToLotTrendReport(runs));
  },

  // Real, per direct guidance on APAC-QA-01 — real, honest scope
  // note, same reasoning as the two molecular reports above: a real
  // PT grade is real, lab-wide operational data (the whole lab's own
  // real EQA performance), not scoped clinical data — _scope is
  // accepted for interface consistency, but genuinely has nothing to
  // filter against.
  async getApacProficiencyTestReport(_scope) {
    const resultsRes = await mockCytologyProficiencyTestResultService.getAll();
    const results = resultsRes.ok ? resultsRes.data : [];
    return ok(resolveCytologyApacProficiencyTestReport(results));
  },

  // Batch 483 (PS-359 tracker follow-up — "CYT-QA-03 vs CYT-QA-04 report
  // asymmetry"): CYT-QA-03's trigger/outcome data (retrospectiveReviewFlag,
  // Specimen.ts) has existed since Phase 58/60 with no aggregate ever
  // reading it back — same real caseById + caseMatchesScope pattern
  // getUnscreenedBacklogReport above already uses for a specimen-level
  // (not QaActivityRecord-based) report.
  async getFiveYearRetrospectiveLookbackReport(scope) {
    const { caseById } = await fetchScopedReviewsAndCategories(scope);
    const specimens: CytologyFiveYearLookbackSpecimenInput[] = [];
    for (const c of Object.values(caseById) as any[]) {
      if (!caseMatchesScope(c, scope)) continue;
      for (const sp of c?.specimens ?? []) {
        const flag = sp?.retrospectiveReviewFlag;
        if (!flag) continue;
        specimens.push({
          caseId: c.id, specimenId: sp.id, accessionId: c?.accession?.accessionNumber,
          triggeredByCaseId: flag.triggeredByCaseId, triggeredAt: flag.triggeredAt,
          outcome: flag.outcome, correctiveAction: flag.correctiveAction,
          reviewedByName: flag.reviewedByName, reviewedAt: flag.reviewedAt,
        });
      }
    }
    return ok(resolveCytologyFiveYearRetrospectiveLookbackReport(specimens));
  },
};
