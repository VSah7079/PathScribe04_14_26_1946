// Batch 451 (PS-212): the accession form's "persistent contact bleeding"
// checkbox, recorded on each cytology/FNA specimen and nothing else.
import { describe, it, expect } from 'vitest';
import { resolveAccessionSpecimenCytologyScreening, contactBleedingFromChoice } from './resolveAccessionSpecimenCytologyScreening';

describe('resolveAccessionSpecimenCytologyScreening (PS-212)', () => {
  it('ticked, records the observation on a Cytology specimen and on an FNA specimen', () => {
    expect(resolveAccessionSpecimenCytologyScreening('Cytology', true)).toEqual({ persistentContactBleedingAtCollection: true });
    expect(resolveAccessionSpecimenCytologyScreening('FNA', true)).toEqual({ persistentContactBleedingAtCollection: true });
  });

  it('ticked, records nothing on a non-cytology specimen or one with no dictionary entry', () => {
    expect(resolveAccessionSpecimenCytologyScreening('Kidney', true)).toBeUndefined();
    expect(resolveAccessionSpecimenCytologyScreening(undefined, true)).toBeUndefined();
  });

  // Batch 452 (Pete, Oct 4): an explicit "no" is stored; only "not recorded" stores nothing.
  it('an explicit "no" is recorded as false on cytology and FNA specimens', () => {
    expect(resolveAccessionSpecimenCytologyScreening('Cytology', false)).toEqual({ persistentContactBleedingAtCollection: false });
    expect(resolveAccessionSpecimenCytologyScreening('FNA', false)).toEqual({ persistentContactBleedingAtCollection: false });
    expect(resolveAccessionSpecimenCytologyScreening('Kidney', false)).toBeUndefined();
  });

  it('"not recorded" (undefined) records nothing', () => {
    expect(resolveAccessionSpecimenCytologyScreening('Cytology', undefined)).toBeUndefined();
  });

  it('the form choice maps Yes → true, No → false, Not recorded → undefined', () => {
    expect([contactBleedingFromChoice('yes'), contactBleedingFromChoice('no'), contactBleedingFromChoice('')]).toEqual([true, false, undefined]);
  });
});

describe('Batch 608 (#47): prior cervical procedure', () => {
  it('records the choice on cytology specimens, alone or with the bleeding answer', async () => {
    const { resolveAccessionSpecimenCytologyScreening: r } = await import('./resolveAccessionSpecimenCytologyScreening');
    expect(r('Cytology', undefined, 'leep')).toEqual({ priorCervicalProcedure: 'leep' });
    expect(r('Cytology', false, 'none')).toEqual({ persistentContactBleedingAtCollection: false, priorCervicalProcedure: 'none' });
    expect(r('Cytology', undefined, '')).toBeUndefined();
    expect(r('Surgical', undefined, 'leep')).toBeUndefined();
  });
});
