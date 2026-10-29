import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { clinicalIndicationCaseFields, clinicalIndicationOrigin, importedClinicalIndication } from './clinicalIndicationProvenance';
import { surgicalMismatchInput } from '../clinical/clinicalMismatchInputs';
import type { Case } from '@/types/case/Case';

const imported = importedClinicalIndication({ clinicalIndication: 'Right breast lump, BI-RADS 4.', clinicalIndicationSource: 'obr31' });

describe('clinical indication provenance (Batch 714)', () => {
  it('an order without an indication imports nothing', () => {
    expect(importedClinicalIndication({})).toBeNull();
    expect(importedClinicalIndication({ clinicalIndication: '   ' })).toBeNull();
  });
  it('as imported it is marked as from the order and names the field', () => {
    expect(imported).toEqual({ text: 'Right breast lump, BI-RADS 4.', field: 'obr31' });
    expect(clinicalIndicationOrigin('Right breast lump, BI-RADS 4.', imported)).toBe('order');
    expect(clinicalIndicationCaseFields('Right breast lump, BI-RADS 4.', imported)).toEqual({
      clinicalIndicationSource: 'order', orderClinicalIndication: 'Right breast lump, BI-RADS 4.', orderClinicalIndicationField: 'obr31',
    });
  });
  it('an edit becomes editedFromOrder and keeps the original order text', () => {
    expect(clinicalIndicationOrigin('Right breast lump, BI-RADS 5.', imported)).toBe('editedFromOrder');
    expect(clinicalIndicationOrigin('', imported)).toBe('editedFromOrder');
    expect(clinicalIndicationCaseFields('Right breast lump, BI-RADS 5.', imported).orderClinicalIndication).toBe('Right breast lump, BI-RADS 4.');
  });
  it('manual accessioning: blank has no marker, typed text is entered', () => {
    expect(clinicalIndicationOrigin('', null)).toBeNull();
    expect(clinicalIndicationCaseFields('', null)).toEqual({ clinicalIndicationSource: undefined, orderClinicalIndication: undefined, orderClinicalIndicationField: undefined });
    expect(clinicalIndicationOrigin('Query melanoma', null)).toBe('entered');
  });
  it('the mismatch check reads the stored indication, so order text reaches it (and an edit replaces it)', () => {
    const asOrder = { order: { clinicalIndication: 'Right breast lump, BI-RADS 4.', ...clinicalIndicationCaseFields('Right breast lump, BI-RADS 4.', imported) } } as unknown as Case;
    expect(surgicalMismatchInput(asOrder).clinicalIndication).toBe('Right breast lump, BI-RADS 4.');
    const edited = { order: { clinicalIndication: 'Mass, BI-RADS 5.', ...clinicalIndicationCaseFields('Mass, BI-RADS 5.', imported) } } as unknown as Case;
    expect(surgicalMismatchInput(edited).clinicalIndication).toBe('Mass, BI-RADS 5.');
  });
  it('the Accession page imports and stores through this service', () => {
    const src = readFileSync('src/pages/AccessionPage/AccessionPage.tsx', 'utf8');
    expect(src).toContain('setOrderIndication(importedClinicalIndication(order))');
    expect(src).toContain('...clinicalIndicationCaseFields(clinicalIndication, orderIndication)');
    expect(src).toContain('<ClinicalIndicationField');
  });
});
