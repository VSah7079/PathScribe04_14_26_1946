// Batch 631: what PathScribe hands the interface engine for an hrHPV result going to a national register.
import { describe, it, expect } from 'vitest';
import { buildHpvRegistryResultPayload, type HpvRegistryResultInput } from './buildHpvRegistryResultPayload';

const input = (over: Partial<HpvRegistryResultInput> = {}): HpvRegistryResultInput => ({
  messageId: 'm-1', timestamp: '2026-10-19T00:00:00Z', jurisdiction: 'AU', facilityId: 'f-1',
  patient: { mrn: 'M-1', name: 'Test Patient', dateOfBirth: '1980-01-01' },
  accessionNumber: 'S26-1', specimenLetter: 'A', isSelfCollected: true, hpvResult: 'Positive',
  genotype: { hpv16: true, hpv18Or45: false, otherHighRisk: false }, ...over,
});

describe('buildHpvRegistryResultPayload', () => {
  it('carries the collection method (SC or CL), the genotype as 16/18/other, and the recall recommendation', () => {
    const p = buildHpvRegistryResultPayload(input());
    expect(p).toMatchObject({ registryId: 'ncsr_australia', collectionMethod: 'SC', hpvResult: 'Positive', hpvGenotypes: ['HPV_16'], genotypeResolved: true });
    expect(p.recallRecommendation?.recommendations.map(r => r.recommendation_code)).toEqual(['AU_REFER_COLPOSCOPY', 'AU_RECALL_CLINICIAN_LBC']);
    expect(p.recallRecommendation).toMatchObject({ priority: 'urgent', targetWeeks: { min: 2, max: 4 } });
    expect(p.recallRecommendation?.recommendations[0]).toMatchObject({ authority: 'PATHSCRIBE_INTERNAL', status: 'PLACEHOLDER_MAPPED', target_registry: 'AU_NCSR' });
    expect(buildHpvRegistryResultPayload(input({ isSelfCollected: false })).collectionMethod).toBe('CL');
  });
  it('a clinician-collected result carries no recall recommendation; New Zealand uses its own register id and codes', () => {
    expect(buildHpvRegistryResultPayload(input({ isSelfCollected: false })).recallRecommendation).toBeUndefined();
    const nz = buildHpvRegistryResultPayload(input({ jurisdiction: 'NZ', genotype: { hpv16: false, hpv18Or45: false, otherHighRisk: true } }));
    expect(nz.registryId).toBe('ncsp_new_zealand');
    expect(nz.recallRecommendation?.recommendations.map(r => r.recommendation_code)).toEqual(['NZ_RECALL_CLINICIAN_LBC']);
    expect(nz.hpvGenotypes).toEqual(['HPV_OTHER']);
  });
  it('a Positive result with only the 18/45 group is flagged as not resolved', () => {
    const p = buildHpvRegistryResultPayload(input({ genotype: { hpv16: false, hpv18Or45: true, otherHighRisk: false } }));
    expect(p.hpvGenotypes).toEqual([]);
    expect(p.genotypeResolved).toBe(false);
  });
  it('Negative and Invalid carry no genotype; Invalid self-collected recommends a repeat collection', () => {
    expect(buildHpvRegistryResultPayload(input({ hpvResult: 'Negative', genotype: undefined })).genotypeResolved).toBe(true);
    const inv = buildHpvRegistryResultPayload(input({ hpvResult: 'Invalid', genotype: undefined }));
    expect(inv.hpvGenotypes).toEqual([]);
    expect(inv.recallRecommendation?.recommendations.map(r => r.recommendation_code)).toEqual(['AU_RECALL_REPEAT_COLLECTION']);
  });
  it('the NATA identifier is sent as null (PathScribe does not hold it) and national identifiers default to none', () => {
    const p = buildHpvRegistryResultPayload(input());
    expect(p.laboratoryAccreditationId).toBeNull();
    expect(p.patient.nationalIdentifiers).toEqual([]);
  });
});
