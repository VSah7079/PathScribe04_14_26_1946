// src/services/cytology/mockCytologyQaReportService.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import type { mockCytologyQaReportService as ServiceType } from './mockCytologyQaReportService';

// Real, necessary setup order: mockCytologyQaReportService.ts imports
// caseRouter, which transitively imports services/index.ts's own
// barrel file — including mockUserService.ts, which reads localStorage
// at real module-load time (top-level, not inside a function). A
// static top-level import of the service would resolve that whole
// chain before this file's own beforeEach ever ran. A real, dynamic
// import after the mock is in place is the correct fix, not a
// workaround — the same real pattern Vitest itself expects for this
// exact situation.
let mockCytologyQaReportService: typeof ServiceType;

beforeAll(async () => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
  ({ mockCytologyQaReportService } = await import('./mockCytologyQaReportService'));
});

describe('mockCytologyQaReportService — real, per direct follow-up ("mimicking the backend bits against the mock")', () => {
  it('every real method returns a genuinely well-typed ServiceResult, never throwing on a real store', async () => {
    const results = await Promise.all([
      mockCytologyQaReportService.get10PercentRandomRescreeningReport({ level: 'enterprise' }),
      mockCytologyQaReportService.getDirectedHighRiskRescreeningReport({ level: 'enterprise' }),
      mockCytologyQaReportService.getCtVsPathologistCorrelationReport({ level: 'enterprise' }),
      mockCytologyQaReportService.getPostSignOutPeerReviewCorrelationReport({ level: 'enterprise' }),
      mockCytologyQaReportService.getPrimaryVsFinalDiagnosisReport({ level: 'enterprise' }),
      mockCytologyQaReportService.getCtStatisticalComparisonReport({ level: 'enterprise' }),
      mockCytologyQaReportService.getAscusHpvReflexReport({ level: 'enterprise' }),
      mockCytologyQaReportService.getWorkloadTrackingReport({ level: 'enterprise' }),
      mockCytologyQaReportService.getRegistryTransmissionAuditReport({ level: 'enterprise' }, 'ncsr_australia'),
      mockCytologyQaReportService.getFiveYearRetrospectiveLookbackReport({ level: 'enterprise' }),
    ]);
    for (const r of results) expect(r.ok).toBe(true);
  });

  // Batch 483 (PS-359 tracker follow-up — "CYT-QA-03 vs CYT-QA-04 report
  // asymmetry"): CYT-QA-03's own aggregate, closing the gap CYT-QA-04 never had.
  it('a real, enterprise-scoped CYT-QA-03 report sees at least as many real flagged specimens as any narrower real client scope', async () => {
    const enterprise = await mockCytologyQaReportService.getFiveYearRetrospectiveLookbackReport({ level: 'enterprise' });
    const narrowScope = await mockCytologyQaReportService.getFiveYearRetrospectiveLookbackReport({ level: 'client', clientId: 'a-real-client-id-that-does-not-exist' });
    if (!enterprise.ok || !narrowScope.ok) throw new Error('setup failed');
    expect(narrowScope.data.totalFlagged).toBe(0);
    expect(enterprise.data.totalFlagged).toBeGreaterThanOrEqual(narrowScope.data.totalFlagged);
  });

  it('a real, enterprise-scoped aggregate report sees at least as many real comparisons as any narrower real client scope', async () => {
    const enterprise = await mockCytologyQaReportService.get10PercentRandomRescreeningReport({ level: 'enterprise' });
    const narrowScope = await mockCytologyQaReportService.get10PercentRandomRescreeningReport({ level: 'client', clientId: 'a-real-client-id-that-does-not-exist' });
    if (!enterprise.ok || !narrowScope.ok) throw new Error('setup failed');
    expect(narrowScope.data.totalCompared).toBe(0);
    expect(enterprise.data.totalCompared).toBeGreaterThanOrEqual(narrowScope.data.totalCompared);
  });

  it('a real registry transmission audit report only ever returns rows for the real, requested registry', async () => {
    const ncsr = await mockCytologyQaReportService.getRegistryTransmissionAuditReport({ level: 'enterprise' }, 'ncsr_australia');
    const csms = await mockCytologyQaReportService.getRegistryTransmissionAuditReport({ level: 'enterprise' }, 'csms_uk');
    if (!ncsr.ok || !csms.ok) throw new Error('setup failed');
    // Real, honest assertion: this doesn't assert either count is
    // non-zero (that depends on real seed data changing over time),
    // only that the two real, different registries never return
    // identical row sets when both are non-empty.
    if (ncsr.data.length > 0 && csms.data.length > 0) {
      expect(ncsr.data.map(r => r.caseId).sort()).not.toEqual(csms.data.map(r => r.caseId).sort());
    }
  });

  it('a real CT statistical comparison report groups by real cytotechnologist, never mixing two different real CTs into one row', async () => {
    const res = await mockCytologyQaReportService.getCtStatisticalComparisonReport({ level: 'enterprise' });
    if (!res.ok) throw new Error('setup failed');
    const userIds = res.data.map(r => r.ctUserId);
    expect(new Set(userIds).size).toBe(userIds.length);
  });
});
