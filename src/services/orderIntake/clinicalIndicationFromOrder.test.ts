import { describe, it, expect } from 'vitest';
import { clinicalIndicationFromOrder, CLINICAL_INDICATION_SOURCE_IDS } from './clinicalIndicationFromOrder';

describe('clinicalIndicationFromOrder (Batch 714)', () => {
  it('returns null when nothing is present (no invention)', () => {
    expect(clinicalIndicationFromOrder(undefined)).toBeNull();
    expect(clinicalIndicationFromOrder({})).toBeNull();
    expect(clinicalIndicationFromOrder({ obr31: ['  '], dg1: [{}], nte: [''], fhirReasonCode: [{ coding: [{}] }] })).toBeNull();
  });
  it('names each source', () => {
    expect(clinicalIndicationFromOrder({ obr31: ['Lump right breast'] })).toEqual({ text: 'Lump right breast', source: 'obr31' });
    expect(clinicalIndicationFromOrder({ orc16: [{ text: 'Surveillance' }] })).toEqual({ text: 'Surveillance', source: 'orc16' });
    expect(clinicalIndicationFromOrder({ dg1: [{ code: 'N63.10', description: 'Unspecified lump in right breast' }] }))
      .toEqual({ text: 'Unspecified lump in right breast (N63.10)', source: 'dg1' });
    expect(clinicalIndicationFromOrder({ nte: ['Query lymphoma', 'Night sweats'] })).toEqual({ text: 'Query lymphoma Night sweats', source: 'nte' });
    expect(clinicalIndicationFromOrder({ fhirReasonCode: [{ text: 'Abnormal Pap' }] })).toEqual({ text: 'Abnormal Pap', source: 'fhirReasonCode' });
    expect(clinicalIndicationFromOrder({ fhirReasonCode: [{ coding: [{ display: 'HSIL', code: '123' }] }] })).toEqual({ text: 'HSIL', source: 'fhirReasonCode' });
    expect(clinicalIndicationFromOrder({ fhirReasonReference: ['Cecal polyp'] })).toEqual({ text: 'Cecal polyp', source: 'fhirReasonReference' });
  });
  it('takes the first source in priority order that has text', () => {
    const all = {
      fhirReasonReference: ['E'], fhirReasonCode: [{ text: 'D' }], nte: ['C'], dg1: [{ description: 'B2' }], orc16: ['B'], obr31: ['A'],
    };
    const order = [...CLINICAL_INDICATION_SOURCE_IDS];
    expect(order).toEqual(['obr31', 'orc16', 'dg1', 'nte', 'fhirReasonCode', 'fhirReasonReference']);
    const picked: string[] = [];
    const rest: Record<string, unknown> = { ...all };
    for (const id of order) {
      picked.push(clinicalIndicationFromOrder(rest)!.source);
      delete rest[id];
    }
    expect(picked).toEqual(order);
    expect(clinicalIndicationFromOrder(rest)).toBeNull();
  });
  it('skips an empty higher-priority source', () => {
    expect(clinicalIndicationFromOrder({ obr31: [''], orc16: [{}], dg1: [{ description: 'Polyp' }] })).toEqual({ text: 'Polyp', source: 'dg1' });
  });
  it('combines DG1 diagnoses and codes only as given; a code alone stays a code', () => {
    expect(clinicalIndicationFromOrder({ dg1: [{ code: 'K63.5' }, { description: 'Anaemia' }, { code: 'D64.9', description: 'Anaemia' }, { code: 'K63.5' }] }))
      .toEqual({ text: 'K63.5; Anaemia; Anaemia (D64.9)', source: 'dg1' });
  });
  it('joins repeats and tidies whitespace', () => {
    expect(clinicalIndicationFromOrder({ obr31: ['  Pelvic\n pain ', { display: 'Menorrhagia' }, 'Pelvic pain'] })).toEqual({ text: 'Pelvic pain; Menorrhagia', source: 'obr31' });
  });
});
