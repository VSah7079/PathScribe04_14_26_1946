// Batch 410 (PS-359): what the Cytology Workspace loads for a case.
import { describe, it, expect } from 'vitest';
import { loadCytologyWorkspace } from './loadCytologyWorkspace';
import { makeWorkspaceDeps } from './cytologyWorkspaceTestDeps';

const caseData = {
  id: 'C1', patient: { id: 'PT1' }, order: { facilityId: 'F1' },
  specimens: [{ id: 'SP0', specimenDictionaryEntryId: 'surg' }, { id: 'SP1', specimenDictionaryEntryId: 'pap' }],
};
const dictionary = [{ id: 'surg', type: 'Surgical' }, { id: 'pap', type: 'Cytology', categories: ['GYN_CYTOLOGY'], defaultSynopticTemplateId: 'tpl' }];

describe('loadCytologyWorkspace', () => {
  it('finds the cytology specimen, its reviews and the latest completed AI result; the facility decides nomenclature and modality', async () => {
    const { deps } = makeWorkspaceDeps({
      getCase: async () => caseData as never,
      getSpecimenDictionary: async () => ({ ok: true, data: dictionary }),
      getNomenclatureSettings: async () => ({ enterprise: { nomenclatureSystem: 'bethesda' }, facility: { overrides: { nomenclatureSystem: 'bscc' } } }),
      getInstrumentationSettings: async () => ({ enterprise: { modality: 'wsi' }, facility: { overrides: { modality: 'traditional_guided' } } }),
      getCategoriesFor: async system => ({ ok: true, data: [{ id: `${system}-1`, active: true }, { id: 'old', active: false }] as never }),
      getReviewsForSpecimen: async id => ({ ok: true, data: [{ id: `rv-${id}` }] as never }),
      getAiResults: async () => ({ ok: true, data: [{ id: 'ai1', status: 'completed', completedAt: '2026-01-01' }] }),
      getFacilityJurisdiction: async () => 'UK',
    });
    const w = await loadCytologyWorkspace('C1', 'U1', deps);
    expect(w.specimenId).toBe('SP1');
    expect(w.reviews).toEqual([{ id: 'rv-SP1' }]);
    expect(w.aiScreeningResult?.id).toBe('ai1');
    expect(w.labJurisdiction).toBe('UK');
    expect(w.categories.map(c => c.id)).toEqual([`${w.nomenclatureSystem}-1`]);
    expect(w.defaultSynopticTemplateId).toBe('tpl');
  });

  it('falls back safely: jurisdiction US (no advanced-CT exception), WSI, no specimen', async () => {
    const { deps } = makeWorkspaceDeps({ getCase: async () => ({ id: 'C1', specimens: [] }) as never });
    const w = await loadCytologyWorkspace('C1', undefined, deps);
    expect(w).toMatchObject({ specimenId: null, labJurisdiction: 'US', instrumentationModality: 'wsi', reviews: [], patientHistory: null });
  });

  it('Batch 411: lists every cytology specimen with its status, and opens the first not yet signed out, or the one asked for', async () => {
    const multi = { ...caseData, specimens: [...caseData.specimens, { id: 'SP2', label: 'B', specimenDictionaryEntryId: 'pap' }, { id: 'SP3', label: 'C', specimenDictionaryEntryId: 'pap' }] };
    const over = {
      getCase: async () => multi as never,
      getSpecimenDictionary: async () => ({ ok: true as const, data: dictionary }),
      getCaseSignOutRecords: async () => ({ ok: true as const, data: [{ specimenId: 'SP1' }] as never }),
    };
    const { deps } = makeWorkspaceDeps(over);
    const w = await loadCytologyWorkspace('C1', 'U1', deps);
    expect(w.cytologySpecimens.map(s => [s.id, s.status])).toEqual([['SP1', 'signedOut'], ['SP2', 'draft'], ['SP3', 'draft']]);
    expect(w.specimenId).toBe('SP2');
    expect((await loadCytologyWorkspace('C1', 'U1', deps, 'SP3')).specimenId).toBe('SP3');
    expect((await loadCytologyWorkspace('C1', 'U1', deps, 'SP0')).specimenId).toBe('SP2');
  });
});

