// Batch 451 (PS-209): the Cytology Workspace fetches the patient's real
// encounters (cytologyWorkspaceDeps.listEncounters → the encounter service) and
// feeds their diagnoses into the high-risk factors that send a new initial
// review to targeted QC (saveCytologyReview's QC selection).
import { describe, it, expect, beforeEach, vi } from 'vitest';
// The mock services read browser storage when imported.
const memoryStorage = vi.hoisted(() => {
  const make = () => {
    const store: Record<string, string> = {};
    return { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; }, clear: () => {}, key: () => null, length: 0 };
  };
  (globalThis as any).localStorage = make();
  return make;
});
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));
import { cytologyWorkspaceDeps } from './cytologyWorkspaceDeps';
import { saveCytologyReview, type SaveCytologyReviewInput } from './saveCytologyReview';
import { makeWorkspaceDeps } from './cytologyWorkspaceTestDeps';
import { EMPTY_DRAFT } from './cytologyReviewDraft';

const ENCOUNTERS_KEY = 'pathscribe_encounters';
const encounter = (id: string, patientId: string, codes: string[]) =>
  ({ id, patientId, organisationId: 'ORG1', encounterNumber: id, createdAt: '2026-09-01T00:00:00Z', admitTime: '2026-09-01T00:00:00Z', diagnoses: codes.map(code => ({ code })) });
function seedEncounters(list: unknown[]) {
  (globalThis as any).localStorage.setItem(ENCOUNTERS_KEY, JSON.stringify(list));
}

beforeEach(() => {
  (globalThis as any).localStorage = memoryStorage();
});

const categories = [
  { id: 'nilm', section: 'interpretation_result', usage: 'primary', diagnosticRank: 0, requiresPathologistReview: false, active: true },
] as never[];
const caseData = { id: 'C1', patient: { id: 'PT1' }, order: { facilityId: 'F1' }, specimens: [{ id: 'SP1', cytologyScreening: {} }] } as never;
const input = (): SaveCytologyReviewInput => ({
  form: { kind: 'standard', draft: { ...EMPTY_DRAFT, primaryInterpretationId: 'nilm' } },
  caseData, specimenId: 'SP1', specimen: { id: 'SP1', description: 'Pap', cytologyScreening: {} },
  user: { id: 'CT1', name: 'CT One' }, isPathologist: false, reviewMode: 'primary_manual',
  editingReviewId: null, reviews: [], resolvedRole: 'primary_screen', categories, activeScreeningSeconds: 600,
});

describe('Cytology Workspace patient encounters (PS-209)', () => {
  it('cytologyWorkspaceDeps.listEncounters returns that patient\'s encounters from the encounter service, and no one else\'s', async () => {
    seedEncounters([encounter('E1', 'PT1', ['B20']), encounter('E2', 'PT2', ['Z94.0']), encounter('E3', 'PT1', ['E11.9'])]);
    const res = await cytologyWorkspaceDeps.listEncounters('PT1');
    expect(res.ok).toBe(true);
    expect((res as { data: { id: string }[] }).data.map(e => e.id).sort()).toEqual(['E1', 'E3']);
  });

  it('a qualifying encounter diagnosis (B20, immunocompromised) sends a new negative initial review to targeted high-risk QC, through the real listEncounters', async () => {
    seedEncounters([encounter('E1', 'PT1', ['B20'])]);
    const listEncounters = vi.fn(cytologyWorkspaceDeps.listEncounters);
    const { deps, updates } = makeWorkspaceDeps({ listEncounters });
    const result = await saveCytologyReview(input(), deps);
    expect(listEncounters).toHaveBeenCalledWith('PT1');
    expect(result.qcFlagApplied).toBe('targeted_high_risk');
    expect(updates[0].patch.specimens[0].cytologyScreening.qcFlag).toMatchObject({ reason: 'targeted_high_risk', flaggedBy: 'system' });
  });

  it('the same patient with only non-qualifying encounter diagnoses is not flagged high-risk', async () => {
    seedEncounters([encounter('E1', 'PT1', ['E11.9'])]);
    const { deps } = makeWorkspaceDeps({ listEncounters: cytologyWorkspaceDeps.listEncounters });
    expect((await saveCytologyReview(input(), deps)).qcFlagApplied).toBeUndefined();
  });

  it('another patient\'s qualifying encounter is never used', async () => {
    seedEncounters([encounter('E2', 'PT2', ['B20'])]);
    const { deps } = makeWorkspaceDeps({ listEncounters: cytologyWorkspaceDeps.listEncounters });
    expect((await saveCytologyReview(input(), deps)).qcFlagApplied).toBeUndefined();
  });
});
