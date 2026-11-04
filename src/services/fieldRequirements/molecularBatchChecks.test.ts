import { describe, it, expect } from 'vitest';
import { resolveFieldRequirements, FIELD_REQUIREMENT_PAGES, FIELD_GROUP_ORDER } from './fieldRequirementRules';
import { molecularCreateMissing, molecularWellsMissingSpecimen, molecularSupersedeMissing, MOLECULAR_BATCH_DEFAULT_REQUIREMENTS } from './molecularBatchChecks';
import type { MolecularWell, MolecularReagentLot } from '../molecular/IMolecularBatchService';

const defaults = resolveFieldRequirements('molecularBatch', {});
const patient = (pos: string, over: Partial<MolecularWell> = {}): MolecularWell => ({ wellPosition: pos, sampleType: 'PATIENT_SPECIMEN', ...over });
const control = (pos: string, lot?: string, exp?: string): MolecularWell => ({
  wellPosition: pos, sampleType: 'CONTROL_NTC',
  controlInfo: lot ? { controlId: 'c', controlLotNumber: lot, controlExpirationDate: exp ?? '', expectedValue: 'NEGATIVE' } : undefined,
} as MolecularWell);
const base = { assayCode: 'st-hpv', assayName: 'HPV', targetInstrumentId: 'PANTHER_01', reagentLots: [] as MolecularReagentLot[] };

describe('molecular plate builder Field Requirements (Batch 405)', () => {
  it('the run, patient-well specimen, control lot and supersede reason are locked; the rest are switches', () => {
    const byId = Object.fromEntries(FIELD_REQUIREMENT_PAGES.molecularBatch.map(f => [f.id, f.default]));
    expect(byId).toEqual({
      assayCode: 'locked', assayName: 'locked', targetInstrument: 'locked', deckSlot: 'optional', reagentLots: 'optional',
      patientSpecimen: 'locked', aliquotVolume: 'optional', controlLotInfo: 'locked', supersedeReason: 'locked',
    });
    expect(MOLECULAR_BATCH_DEFAULT_REQUIREMENTS).toEqual(defaults);
    expect(FIELD_GROUP_ORDER).toEqual(expect.arrayContaining(['molecularRun', 'molecularWells', 'molecularSupersede']));
  });
  it('every patient well names its specimen by barcode or accession (Pete)', () => {
    const wells = [patient('A01', { containerBarcode: 'SPEC-1' }), patient('A02'), patient('A03', { accessionNumber: 'PS26-1' }), control('A04', 'L1', '2027-01-01')];
    expect(molecularWellsMissingSpecimen(wells)).toEqual(['A02']);
    expect(molecularCreateMissing({ ...base, wells }, defaults)).toEqual(['patientSpecimen']);
    expect(molecularCreateMissing({ ...base, wells: wells.filter(w => w.wellPosition !== 'A02') }, defaults)).toEqual([]);
  });
  it('the run fields and the control lot are asked for; switches only when turned on', () => {
    expect(molecularCreateMissing({ ...base, assayCode: '', targetInstrumentId: ' ', wells: [control('A01')] }, defaults)).toEqual(['assayCode', 'targetInstrument', 'controlLotInfo']);
    const strict = resolveFieldRequirements('molecularBatch', { deckSlot: true, reagentLots: true, aliquotVolume: true });
    expect(molecularCreateMissing({ ...base, wells: [patient('A01', { containerBarcode: 'S' })] }, strict)).toEqual(['deckSlot', 'reagentLots', 'aliquotVolume']);
  });
  it('superseding needs a reason, which cannot be switched off', () => {
    expect(molecularSupersedeMissing(' ', resolveFieldRequirements('molecularBatch', { supersedeReason: false }))).toEqual(['supersedeReason']);
    expect(molecularSupersedeMissing('Mis-scanned', defaults)).toEqual([]);
  });
});
