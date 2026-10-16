// src/services/cytology/cytologyWorkloadSummaryDeps.ts
// Batch 574: what the workload counter reads with (the Cytology Workspace's own inputs, plus every facility's
// cap override for the worklist), wired once so the pages don't import mock services.
import { cytologyWorkspaceDeps } from './cytologyWorkspaceDeps';
import { mockFacilityCytologyWorkloadCapOverrideService } from './mockFacilityCytologyWorkloadCapOverrideService';
import type { CytologyWorkloadSummaryDeps } from './cytologyWorkloadSummary';

export const cytologyWorkloadSummaryDeps: CytologyWorkloadSummaryDeps = {
  now: cytologyWorkspaceDeps.now,
  getComplianceSettings: cytologyWorkspaceDeps.getComplianceSettings,
  getFacilityJurisdiction: cytologyWorkspaceDeps.getFacilityJurisdiction,
  getWorkloadCaps: cytologyWorkspaceDeps.getWorkloadCaps,
  getLedgerInWindow: cytologyWorkspaceDeps.getLedgerInWindow,
  getAllFacilityWorkloadCaps: async () => {
    const r = await mockFacilityCytologyWorkloadCapOverrideService.getAll();
    return r.ok ? r.data.map(o => o.overrides) : null;
  },
};
