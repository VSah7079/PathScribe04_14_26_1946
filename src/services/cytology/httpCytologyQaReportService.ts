// src/services/cytology/httpCytologyQaReportService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-499): the API server's version of ICytologyQaReportService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CYTOLOGY_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { ICytologyQaReportService } from './ICytologyQaReportService';

type P<K extends keyof ICytologyQaReportService> = Parameters<ICytologyQaReportService[K]>;
const BASE = '/api/cytology/cytology-qa-report';

export const createHttpCytologyQaReportService = (client: ApiHttpClient): ICytologyQaReportService =>
  buildHttpService<ICytologyQaReportService>(client, {
    get10PercentRandomRescreeningReport: result('POST', () => `${BASE}/get10-percent-random-rescreening-report`, { body: (scope: P<'get10PercentRandomRescreeningReport'>[0]) => (scope) }),
    getDirectedHighRiskRescreeningReport: result('POST', () => `${BASE}/get-directed-high-risk-rescreening-report`, { body: (scope: P<'getDirectedHighRiskRescreeningReport'>[0]) => (scope) }),
    getCtVsPathologistCorrelationReport: result('POST', () => `${BASE}/get-ct-vs-pathologist-correlation-report`, { body: (scope: P<'getCtVsPathologistCorrelationReport'>[0]) => (scope) }),
    getPostSignOutPeerReviewCorrelationReport: result('POST', () => `${BASE}/get-post-sign-out-peer-review-correlation-report`, { body: (scope: P<'getPostSignOutPeerReviewCorrelationReport'>[0]) => (scope) }),
    getPrimaryVsFinalDiagnosisReport: result('POST', () => `${BASE}/get-primary-vs-final-diagnosis-report`, { body: (scope: P<'getPrimaryVsFinalDiagnosisReport'>[0]) => (scope) }),
    getCtStatisticalComparisonReport: result('POST', () => `${BASE}/get-ct-statistical-comparison-report`, { body: (scope: P<'getCtStatisticalComparisonReport'>[0]) => (scope) }),
    getAscusHpvReflexReport: result('POST', () => `${BASE}/get-ascus-hpv-reflex-report`, { body: (scope: P<'getAscusHpvReflexReport'>[0]) => (scope) }),
    getWorkloadTrackingReport: result('POST', () => `${BASE}/get-workload-tracking-report`, { body: (scope: P<'getWorkloadTrackingReport'>[0], timezone: P<'getWorkloadTrackingReport'>[1]) => ({ scope, timezone }) }),
    getRegistryTransmissionAuditReport: result('POST', () => `${BASE}/get-registry-transmission-audit-report`, { body: (scope: P<'getRegistryTransmissionAuditReport'>[0], registryId: P<'getRegistryTransmissionAuditReport'>[1]) => ({ scope, registryId }) }),
    getGynCytologySecondaryScreeningAuditReport: result('POST', () => `${BASE}/get-gyn-cytology-secondary-screening-audit-report`, { body: (scope: P<'getGynCytologySecondaryScreeningAuditReport'>[0]) => (scope) }),
    getHistologyCorrelationReport: result('POST', () => `${BASE}/get-histology-correlation-report`, { body: (scope: P<'getHistologyCorrelationReport'>[0]) => (scope) }),
    getUnscreenedBacklogReport: result('POST', () => `${BASE}/get-unscreened-backlog-report`, { body: (scope: P<'getUnscreenedBacklogReport'>[0]) => (scope) }),
    getPrimaryHpvFailsafeAuditReport: result('POST', () => `${BASE}/get-primary-hpv-failsafe-audit-report`, { body: (scope: P<'getPrimaryHpvFailsafeAuditReport'>[0]) => (scope) }),
    getEuComplianceMatrixReport: result('POST', () => `${BASE}/get-eu-compliance-matrix-report`, { body: (scope: P<'getEuComplianceMatrixReport'>[0]) => (scope) }),
    getHpvPositivityMonitorReport: result('POST', () => `${BASE}/get-hpv-positivity-monitor-report`, { body: (scope: P<'getHpvPositivityMonitorReport'>[0]) => (scope) }),
    getMolecularQcFailureRateReport: result('POST', () => `${BASE}/get-molecular-qc-failure-rate-report`, { body: (scope: P<'getMolecularQcFailureRateReport'>[0]) => (scope) }),
    getMolecularLotToLotTrendReport: result('POST', () => `${BASE}/get-molecular-lot-to-lot-trend-report`, { body: (scope: P<'getMolecularLotToLotTrendReport'>[0]) => (scope) }),
    getApacProficiencyTestReport: result('POST', () => `${BASE}/get-apac-proficiency-test-report`, { body: (scope: P<'getApacProficiencyTestReport'>[0]) => (scope) }),
    getFiveYearRetrospectiveLookbackReport: result('POST', () => `${BASE}/get-five-year-retrospective-lookback-report`, { body: (scope: P<'getFiveYearRetrospectiveLookbackReport'>[0]) => (scope) }),
  });
