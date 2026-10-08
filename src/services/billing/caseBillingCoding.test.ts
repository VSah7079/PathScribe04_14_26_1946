// Batch 460: the billing review panel's coding changes (shared by three screens).
import { describe, it, expect } from 'vitest';
import {
  codingWithApproved, codingWithRejected, codingWithOverride, codingWithoutCode, codingWithCorrection, groupApprovalsByUnit,
  specimensWithBaseCodeAdded, specimensWithBaseCodeRemoved, specimensWithBaseCodeCorrected, specimensWithMatrixCode, matrixSlidesWithEvaluatedCores,
} from './caseBillingCoding';

const coding = { cpt: [{ code: '88342', stainOrderId: 's1' }], rejectedCpt: [{ code: '88313', stainOrderId: 's9' }] };

describe('unit coding', () => {
  it('approving adds the codes and keeps the declined ones', () => {
    expect(codingWithApproved(coding, [{ code: '88341', stainOrderId: 's2' }])).toEqual({
      cpt: [{ code: '88342', stainOrderId: 's1' }, { code: '88341', stainOrderId: 's2' }], rejectedCpt: coding.rejectedCpt,
    });
    expect(codingWithApproved(undefined, [{ code: 'X' }])).toEqual({ cpt: [{ code: 'X', stainOrderId: undefined }], rejectedCpt: [] });
  });
  it('declining records the code for that stain only', () => {
    expect(codingWithRejected(coding, '88341', 's2').rejectedCpt).toEqual([...coding.rejectedCpt, { code: '88341', stainOrderId: 's2' }]);
  });
  it('an override declines the old code and applies the new one for the same stain, in one change', () => {
    const r = codingWithOverride({}, '88342', '88341', 's1');
    expect(r).toEqual({ cpt: [{ code: '88341', stainOrderId: 's1' }], rejectedCpt: [{ code: '88342', stainOrderId: 's1' }] });
  });
  it('deleting removes one match by code and stain; the declined list is kept', () => {
    const c = { cpt: [{ code: 'A', stainOrderId: 's1' }, { code: 'A', stainOrderId: 's2' }], rejectedCpt: [{ code: 'Z' }] };
    expect(codingWithoutCode(c, 'A', 's2')).toEqual({ cpt: [{ code: 'A', stainOrderId: 's1' }], rejectedCpt: [{ code: 'Z' }] });
    expect(codingWithoutCode(c, 'A', 'nope').cpt).toHaveLength(2);
    expect(c.cpt).toHaveLength(2); // the input is not changed
  });
  it('a correction replaces the applied code in place', () => {
    expect(codingWithCorrection(coding, '88342', '88341', 's1').cpt).toEqual([{ code: '88341', stainOrderId: 's1' }]);
  });
  it('approve all groups by unit and keeps repeated codes', () => {
    expect(groupApprovalsByUnit([
      { specimenId: 'A', blockId: '1', code: '88342', stainOrderId: 'x' },
      { specimenId: 'A', blockId: '1', code: '88342', stainOrderId: 'y' },
      { specimenId: 'B', blockId: '1', code: '88305' },
    ])).toEqual([
      { specimenId: 'A', blockId: '1', codes: [{ code: '88342', stainOrderId: 'x' }, { code: '88342', stainOrderId: 'y' }] },
      { specimenId: 'B', blockId: '1', codes: [{ code: '88305', stainOrderId: undefined }] },
    ]);
  });
});

describe('specimen and matrix coding', () => {
  const specimens = [{ id: 'A', coding: { cpt: ['88305'], icd10: [] } }, { id: 'B' }];
  it('base codes are added, removed and corrected on the one specimen', () => {
    expect(specimensWithBaseCodeAdded(specimens, 'B', '88112')[1].coding.cpt).toEqual(['88112']);
    expect(specimensWithBaseCodeRemoved(specimens, 'A', '88305')[0].coding).toEqual({ cpt: [], icd10: [] });
    expect(specimensWithBaseCodeCorrected(specimens, 'A', '88305', '88307')[0].coding.cpt).toEqual(['88307']);
    expect(specimensWithBaseCodeAdded(specimens, 'B', 'X')[0]).toBe(specimens[0]);
  });
  it('matrix codes are kept per specimen and matrix block, applied or declined', () => {
    let s: any[] = specimensWithMatrixCode(specimens, 'A', 'M1', '88342', 'st', 'applied');
    s = specimensWithMatrixCode(s, 'A', 'M1', '88341', 'st2', 'rejected');
    expect(s[0].matrixBlockCoding).toEqual([{ matrixBlockId: 'M1', cpt: [{ code: '88342', stainOrderId: 'st' }], rejectedCpt: [{ code: '88341', stainOrderId: 'st2' }] }]);
  });
  it('evaluated cores are set on the one matrix stain', () => {
    const slides = [{ id: 'a' }, { id: 'b' }];
    expect(matrixSlidesWithEvaluatedCores(slides, 'b', ['A'])).toEqual([{ id: 'a' }, { id: 'b', evaluatedSpecimenIds: ['A'] }]);
  });
});
