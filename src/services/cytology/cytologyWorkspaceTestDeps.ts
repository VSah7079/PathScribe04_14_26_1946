// Batch 410: a fake CytologyWorkspaceDeps for the workspace services' tests.
// Everything allowed and empty unless a test overrides it; writes are recorded.
import { vi } from 'vitest';
import type { CytologyWorkspaceDeps } from './cytologyWorkspacePorts';

export const WORKSPACE_NOW = new Date('2026-09-30T18:00:00.000Z');

export function makeWorkspaceDeps(over: Partial<CytologyWorkspaceDeps> = {}) {
  const updates: { caseId: string; patch: any }[] = [];
  const audit: any[] = [];
  const qa: any[] = [];
  const ledger: any[] = [];
  const deps: CytologyWorkspaceDeps = {
    enforce: vi.fn(async () => ({ allowed: true })),
    now: () => WORKSPACE_NOW,
    random: () => 0.99,
    newId: () => 'n1',
    getCase: async () => undefined,
    getAllCases: async () => ({ ok: true, data: [] }),
    updateCase: vi.fn(async (caseId: string, patch: any) => { updates.push({ caseId, patch }); }),
    listCasesForUser: async () => [],
    returnToCytologyPool: vi.fn(async () => undefined),
    listCytotechnologists: async () => [],
    assignCaseToUser: vi.fn(async () => undefined),
    getSpecimenDictionary: async () => ({ ok: true, data: [] }),
    getAllCategories: async () => ({ ok: true, data: [] }),
    getCategoriesFor: async () => ({ ok: true, data: [] }),
    getNomenclatureSettings: async () => ({ enterprise: { nomenclatureSystem: 'bethesda' }, facility: null }),
    getInstrumentationSettings: async () => ({ enterprise: { modality: 'wsi' }, facility: null }),
    getFacilityJurisdiction: async () => undefined,
    getProviderCredentials: async () => undefined,
    getPathologyLexicon: async () => ({ ok: true, data: [] }),
    getQcSettings: async () => null,
    getWorkloadCaps: async () => null,
    getComplianceSettings: async () => ({ enterprise: { workloadCap: 'on', fiveYearLookback: 'on' }, facility: null }),
    getSnomedSeverityMapping: async () => ({ ok: true, data: [] }),
    getReviewsForSpecimen: async () => ({ ok: true, data: [] }),
    getAllReviews: async () => ({ ok: true, data: [] }),
    createReview: vi.fn(async (input: any) => ({ ok: true as const, data: { id: 'rv-new', recordedAt: WORKSPACE_NOW.toISOString(), ...input } })),
    updateReview: vi.fn(async (id: string, _u: string, patch: any) => ({ ok: true as const, data: { id, ...patch } })),
    getSignOutRecords: async () => ({ ok: true, data: [] }),
    getCaseSignOutRecords: async () => ({ ok: true, data: [] }),
    getAiResults: async () => ({ ok: true, data: [] }),
    getLedgerInWindow: async () => ({ ok: true, data: [] }),
    recordLedgerEntry: vi.fn(async (e: any) => { ledger.push(e); }),
    listEncounters: async () => ({ ok: true, data: [] }),
    createQaActivity: vi.fn(async (r: any) => { qa.push(r); return { ok: true as const, data: { id: 'qa-1' } }; }),
    logAudit: vi.fn((e: any) => { audit.push(e); }),
    resolveDecantCassetteColor: async () => 'blue',
    resolveReportLocale: async () => 'en',
    renderReportPdf: vi.fn(async () => new Uint8Array([37, 80, 68, 70])),
    ...over,
  };
  return { deps, updates, audit, qa, ledger };
}
