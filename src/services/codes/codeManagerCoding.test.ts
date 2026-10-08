import { describe, it, expect } from 'vitest';
import { resolveCodeManagerSave, buildCodeManagerExistingCodes, type CodeManagerSpecimen } from './codeManagerCoding';

const specA = (): CodeManagerSpecimen => ({ id: 'sp-A', label: 'A' });
const specB = (): CodeManagerSpecimen => ({ id: 'sp-B', label: 'B' });

describe('resolveCodeManagerSave (PS-141)', () => {
  it('keeps a SNOMED code applied to a specimen on that specimen, and a SNOMED code with no specimen case-level', () => {
    const { newCoding, updatedSpecimens } = resolveCodeManagerSave([
      { system: 'SNOMED', code: '35917007', display: 'Adenocarcinoma', specimenId: 'sp-A' },
      { system: 'SNOMED', code: '64572001', display: 'Disease', specimenId: null },
    ], [specA(), specB()]);

    expect(updatedSpecimens[0].coding?.snomed).toEqual([{ code: '35917007', description: 'Adenocarcinoma' }]);
    expect(updatedSpecimens[1].coding?.snomed).toBeUndefined();
    expect(newCoding.snomed.map(c => c.code)).toEqual(['64572001']);
    // the specimen-level code is never flattened into the case-level list
    expect(newCoding.snomed.some(c => c.code === '35917007')).toBe(false);
  });

  it('routes each specimen\'s SNOMED codes to its own specimen only', () => {
    const { updatedSpecimens, newCoding } = resolveCodeManagerSave([
      { system: 'SNOMED', code: '111', display: 'one', specimenId: 'sp-A' },
      { system: 'SNOMED', code: '222', display: 'two', specimenId: 'sp-B' },
    ], [specA(), specB()]);
    expect(updatedSpecimens[0].coding?.snomed?.map(c => c.code)).toEqual(['111']);
    expect(updatedSpecimens[1].coding?.snomed?.map(c => c.code)).toEqual(['222']);
    expect(newCoding.snomed).toEqual([]);
  });

  it('keeps the same SNOMED code applied twice to one specimen as two associations (never deduped)', () => {
    const { updatedSpecimens } = resolveCodeManagerSave([
      { system: 'SNOMED', code: '111', display: 'one', specimenId: 'sp-A' },
      { system: 'SNOMED', code: '111', display: 'one', specimenId: 'sp-A' },
    ], [specA()]);
    expect(updatedSpecimens[0].coding?.snomed).toHaveLength(2);
  });

  it('clears a specimen\'s stale SNOMED codes when the user removed all of them in the modal', () => {
    const before = { ...specA(), coding: { snomed: [{ code: '111', description: 'one' }] } };
    const { updatedSpecimens } = resolveCodeManagerSave([], [before]);
    expect(updatedSpecimens[0].coding?.snomed).toBeUndefined();
  });

  it('splits ICD-10 the same way: specimen codes on the specimen, unattached codes case-level', () => {
    const { updatedSpecimens, newCoding } = resolveCodeManagerSave([
      { system: 'ICD', code: 'C18.9', display: 'Colon ca', specimenId: 'sp-A' },
      { system: 'ICD', code: 'R19.5', display: 'Occult blood', specimenId: null },
    ], [specA()]);
    expect(updatedSpecimens[0].coding?.icd10).toEqual([{ code: 'C18.9', description: 'Colon ca' }]);
    expect(newCoding.icd10.map(c => c.code)).toEqual(['R19.5']);
  });

  it('does not mutate the input specimens', () => {
    const before = { ...specA(), coding: { snomed: [{ code: '111', description: 'one' }] } };
    const snapshot = JSON.parse(JSON.stringify(before));
    resolveCodeManagerSave([{ system: 'SNOMED', code: '222', display: 'two', specimenId: 'sp-A' }], [before]);
    expect(before).toEqual(snapshot);
  });

  it('diffs CPT per specimen by count: a second identical code is an addition, a dropped one a removal', () => {
    const before = { ...specA(), coding: { cpt: ['88305', '88342'] } };
    const { additionsBySpecimen, removalsBySpecimen, updatedSpecimens } = resolveCodeManagerSave([
      { system: 'CPT', code: '88305', display: '88305', specimenId: 'sp-A' },
      { system: 'CPT', code: '88305', display: '88305', specimenId: 'sp-A' },
    ], [before]);
    expect(updatedSpecimens[0].coding?.cpt).toEqual(['88305', '88305']);
    expect(additionsBySpecimen.get('sp-A')).toEqual(['88305']);
    expect(removalsBySpecimen.get('sp-A')).toEqual(['88342']);
  });
});

describe('buildCodeManagerExistingCodes (PS-141)', () => {
  it('shows each specimen\'s saved SNOMED codes against that specimen on reopen', () => {
    const existing = buildCodeManagerExistingCodes({ snomed: [{ system: 'SNOMED', code: '999', display: 'case-level' }] }, [
      { id: 'sp-A', coding: { snomed: [{ code: '111', description: 'one' }] } },
      { id: 'sp-B', coding: { snomed: [{ code: '222', description: 'two' }] } },
    ]);
    const snomed = existing.filter(c => c.system === 'SNOMED');
    expect(snomed.find(c => c.code === '111')?.specimenId).toBe('sp-A');
    expect(snomed.find(c => c.code === '222')?.specimenId).toBe('sp-B');
    expect(snomed.find(c => c.code === '999')?.specimenId).toBeUndefined();
    expect(snomed.find(c => c.code === '111')?.display).toBe('one');
  });

  it('round-trips: codes saved per specimen reopen against the same specimen', () => {
    const { updatedSpecimens, newCoding } = resolveCodeManagerSave([
      { system: 'SNOMED', code: '111', display: 'one', specimenId: 'sp-A' },
      { system: 'SNOMED', code: '222', display: 'two', specimenId: 'sp-B' },
    ], [specA(), specB()]);
    const reopened = buildCodeManagerExistingCodes(newCoding, updatedSpecimens);
    expect(reopened.map(c => [c.system, c.code, c.specimenId])).toEqual([
      ['SNOMED', '111', 'sp-A'],
      ['SNOMED', '222', 'sp-B'],
    ]);
  });

  it('gives the same SNOMED code applied twice to one specimen distinct ids', () => {
    const existing = buildCodeManagerExistingCodes(undefined, [
      { id: 'sp-A', coding: { snomed: [{ code: '111', description: 'one' }, { code: '111', description: 'one' }] } },
    ]);
    const ids = existing.map(c => c.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it('gives the same ICD-10 code applied twice to one specimen distinct ids', () => {
    const existing = buildCodeManagerExistingCodes(undefined, [
      { id: 'sp-A', coding: { icd10: [{ code: 'C18.9', description: 'x' }, { code: 'C18.9', description: 'x' }] } },
    ]);
    const ids = existing.filter(c => c.system === 'ICD').map(c => c.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(existing.every(c => c.specimenId === 'sp-A')).toBe(true);
  });

  it('never gives the same code on two different specimens the same id', () => {
    const existing = buildCodeManagerExistingCodes(undefined, [
      { id: 'sp-A', coding: { snomed: [{ code: '111', description: 'one' }] } },
      { id: 'sp-B', coding: { snomed: [{ code: '111', description: 'one' }] } },
    ]);
    expect(new Set(existing.map(c => c.id)).size).toBe(2);
  });
});

// Batch 450: reopening the Code Manager left out a specimen's ICD-O codes, and
// saving (which takes the modal's full set) then erased them.
describe('Code Manager keeps ICD-O codes across reopen and save (Batch 450)', () => {
  const coded = (): CodeManagerSpecimen => ({ id: 'sp-A', label: 'A', coding: {
    icdO: [{ code: '8140/3', description: 'Adenocarcinoma, NOS' }],
    snomed: [{ code: '35917007', description: 'Adenocarcinoma' }],
  } });

  it('reopening shows the specimen\'s ICD-O codes against that specimen', () => {
    const existing = buildCodeManagerExistingCodes(undefined, [coded()]);
    expect(existing.filter(c => c.system === 'ICD-O')).toEqual([
      expect.objectContaining({ code: '8140/3', display: 'Adenocarcinoma, NOS', specimenId: 'sp-A' }),
    ]);
  });

  it('saving the reopened set unchanged keeps the ICD-O code (and everything else) on the specimen', () => {
    const before = coded();
    const existing = buildCodeManagerExistingCodes(undefined, [before]);
    const { updatedSpecimens } = resolveCodeManagerSave(existing.map(c => ({ system: c.system, code: c.code, display: c.display, specimenId: c.specimenId })), [before]);
    expect(updatedSpecimens[0].coding?.icdO).toEqual(before.coding?.icdO);
    expect(updatedSpecimens[0].coding?.snomed).toEqual(before.coding?.snomed);
  });

  it('removing the ICD-O code in the modal still clears it', () => {
    const { updatedSpecimens } = resolveCodeManagerSave([{ system: 'SNOMED', code: '35917007', display: 'Adenocarcinoma', specimenId: 'sp-A' }], [coded()]);
    expect(updatedSpecimens[0].coding?.icdO).toBeUndefined();
  });
});
