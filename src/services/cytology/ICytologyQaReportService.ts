// src/services/cytology/ICytologyQaReportService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct follow-up: "I thought we were mimicking the backend
// bits against the mock while the real backend gets built" — a real,
// important correction to how Phase 49/50 were originally built. Every
// ordinary CRUD service in this app (all 126 of them) already follows
// a real Interface → Mock (localStorage) → Firestore (real, later)
// pattern, where the interface itself never changes when the
// implementation swaps — that's the real reason a mock-to-real
// migration for ordinary record lookups is safe and incremental.
//
// The seven QA report resolvers built in Phase 49 did NOT follow that
// pattern — they were bare, standalone pure functions, called directly
// from CytologyQaTab.tsx after it fetched every raw record itself via
// .getAll(). That shape doesn't survive a real backend migration: a
// real database would compute these aggregates server-side (a real
// GROUP BY, not send every raw row to the browser) — but a pure
// function taking a full array as its own parameter has no way to
// express "fetch less, aggregate where the data lives."
//
// This interface is the real fix: every method takes a real QaScope
// (the same real filter a WHERE clause would apply) and returns
// already-aggregated data, never raw records. The real resolver
// functions from Phase 49 aren't thrown away — they become the real,
// internal implementation detail of the mock below. When a real
// backend eventually replaces the mock, this interface — and every
// real caller of it — needs zero changes; only the implementation
// (mock fetch-and-reduce vs. a real server-side query) differs.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult } from '../types';
import type { QaScope } from '@/services/qualityAssurance/qaScope';
import type { RegistryId } from '@/services/facilities/IRegistrySettingsService';
import type { CytologyQaAggregateReport } from './resolveCytologyQaAggregateReport';
import type { CytologyCtStatisticalComparisonRow } from './resolveCytologyCtStatisticalComparisonReport';
import type { CytologyAscusHpvReflexRow } from './resolveCytologyAscusHpvReflexReport';
import type { CytologyWorkloadTrackingRow } from './resolveCytologyWorkloadTrackingReport';
import type { CytologyRegistryTransmissionAuditRow } from './resolveCytologyRegistryTransmissionAuditReport';
import type { QaActivityRecord } from '@/types/quality/QaActivityRecord';
import type { CytologyHistologyCorrelationReport } from './resolveCytologyHistologyCorrelationReport';
import type { CytologyUnscreenedBacklogRow } from './resolveCytologyUnscreenedBacklogReport';
import type { CytologyPrimaryHpvFailsafeAuditRow } from './resolveCytologyPrimaryHpvFailsafeAuditReport';
import type { CytologyEuComplianceMatrixRow } from './resolveCytologyEuComplianceMatrixReport';
import type { CytologyHpvPositivityMonitorRow } from './resolveCytologyHpvPositivityMonitorReport';
import type { CytologyMolecularQcFailureRateRow } from './resolveCytologyMolecularQcFailureRateReport';
import type { CytologyMolecularLotToLotTrendRow } from './resolveCytologyMolecularLotToLotTrendReport';
import type { CytologyApacProficiencyTestReport } from './resolveCytologyApacProficiencyTestReport';
import type { CytologyFiveYearLookbackReport } from './resolveCytologyFiveYearRetrospectiveLookbackReport';

export interface ICytologyQaReportService {
  get10PercentRandomRescreeningReport(scope: QaScope): Promise<ServiceResult<CytologyQaAggregateReport>>;
  getDirectedHighRiskRescreeningReport(scope: QaScope): Promise<ServiceResult<CytologyQaAggregateReport>>;
  getCtVsPathologistCorrelationReport(scope: QaScope): Promise<ServiceResult<CytologyQaAggregateReport>>;
  getPostSignOutPeerReviewCorrelationReport(scope: QaScope): Promise<ServiceResult<CytologyQaAggregateReport>>;
  /** Batch 459 (PS-152): each signed-out specimen's primary screen vs the review chosen as its Final Diagnosis. */
  getPrimaryVsFinalDiagnosisReport(scope: QaScope): Promise<ServiceResult<CytologyQaAggregateReport>>;
  getCtStatisticalComparisonReport(scope: QaScope): Promise<ServiceResult<CytologyCtStatisticalComparisonRow[]>>;
  getAscusHpvReflexReport(scope: QaScope): Promise<ServiceResult<CytologyAscusHpvReflexRow[]>>;
  /** Batch 572: `timezone`, the lab's, decides each entry's day (as the end-of-day sign-off does). */
  getWorkloadTrackingReport(scope: QaScope, timezone?: string): Promise<ServiceResult<CytologyWorkloadTrackingRow[]>>;
  getRegistryTransmissionAuditReport(scope: QaScope, registryId: RegistryId): Promise<ServiceResult<CytologyRegistryTransmissionAuditRow[]>>;
  getGynCytologySecondaryScreeningAuditReport(scope: QaScope): Promise<ServiceResult<QaActivityRecord[]>>;
  getHistologyCorrelationReport(scope: QaScope): Promise<ServiceResult<CytologyHistologyCorrelationReport>>;
  getUnscreenedBacklogReport(scope: QaScope): Promise<ServiceResult<CytologyUnscreenedBacklogRow[]>>;
  getPrimaryHpvFailsafeAuditReport(scope: QaScope): Promise<ServiceResult<CytologyPrimaryHpvFailsafeAuditRow[]>>;
  getEuComplianceMatrixReport(scope: QaScope): Promise<ServiceResult<CytologyEuComplianceMatrixRow[]>>;
  getHpvPositivityMonitorReport(scope: QaScope): Promise<ServiceResult<CytologyHpvPositivityMonitorRow[]>>;
  getMolecularQcFailureRateReport(scope: QaScope): Promise<ServiceResult<CytologyMolecularQcFailureRateRow[]>>;
  getMolecularLotToLotTrendReport(scope: QaScope): Promise<ServiceResult<CytologyMolecularLotToLotTrendRow[]>>;
  getApacProficiencyTestReport(scope: QaScope): Promise<ServiceResult<CytologyApacProficiencyTestReport>>;
  /** Batch 483 (PS-359 tracker follow-up — "CYT-QA-03 vs CYT-QA-04 report
   *  asymmetry"): the aggregate CYT-QA-03 (5-Year Retrospective Lookback)
   *  report — every specimen whose retrospectiveReviewFlag has been set
   *  (Specimen.ts, Phase 58), its outcome once reviewed (Phase 60), and
   *  roll-up counts. See this report's own resolver for the real reasoning. */
  getFiveYearRetrospectiveLookbackReport(scope: QaScope): Promise<ServiceResult<CytologyFiveYearLookbackReport>>;
}
