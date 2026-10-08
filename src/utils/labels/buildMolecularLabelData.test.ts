// src/utils/labels/buildMolecularLabelData.test.ts
import { describe, it, expect } from 'vitest';
import type { MolecularBatch } from '@/services/molecular/IMolecularBatchService';
import {
  buildMolecularSpecimenLabelData, buildMolecularPlateLabelData, buildMolecularRackLabelData, buildMolecularDeckLocationLabelData,
  molecularSpecimenZplTextLines, molecularPlateZplTextLines, molecularRackZplTextLines, molecularDeckLocationZplTextLines,
} from './buildMolecularLabelData';

const PRINTED_AT = '2026-09-06T17:00:00.000Z';

function makeBatch(overrides: Partial<MolecularBatch> = {}): MolecularBatch {
  return {
    id: 'mb-001', batchBarcode: 'BATCH-20260906-0042', batchUuid: 'e3b0c442-98fc-4c14-963b-944882006122',
    assayCode: 'HPV_HR_PCR', assayName: 'High-Risk HPV Real-Time PCR', targetInstrumentId: 'PANTHER_02',
    deckSlot: 'SLOT_A1', plateUuid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', plateBarcode: 'PLT-HPV-20260906-012',
    plateLayout: '96_well', reagentLots: [], status: 'active', createdAt: '2026-09-06T16:47:35.000Z',
    createdByUserId: 'u1', createdByUserName: 'Test User',
    wells: [
      { wellPosition: 'A01', sampleType: 'CONTROL_NTC', containerBarcode: 'CTRL-NTC-001' },
      { wellPosition: 'A03', sampleType: 'PATIENT_SPECIMEN', containerBarcode: 'SPEC-20260906-00008831', accessionNumber: 'PS26-100452', aliquotVolumeUl: 200 },
      { wellPosition: 'A04', sampleType: 'PATIENT_SPECIMEN' }, // not scanned in yet
      { wellPosition: 'A05', sampleType: 'PATIENT_SPECIMEN', containerBarcode: 'SPEC-20260906-00008832' }, // scanned, no accession matched
    ],
    ...overrides,
  };
}

describe('buildMolecularSpecimenLabelData (PS-231)', () => {
  it('builds exactly one label per scanned-in patient specimen well, in well order, skipping controls and unscanned wells', () => {
    const labels = buildMolecularSpecimenLabelData(makeBatch(), PRINTED_AT);
    expect(labels).toEqual([
      { containerBarcode: 'SPEC-20260906-00008831', accessionNumber: 'PS26-100452', aliquotVolumeUl: 200, printedAt: PRINTED_AT },
      { containerBarcode: 'SPEC-20260906-00008832', accessionNumber: '—', aliquotVolumeUl: undefined, printedAt: PRINTED_AT },
    ]);
  });

  it('builds no labels for a batch with no scanned patient specimen wells', () => {
    const controlsOnly = makeBatch({ wells: [
      { wellPosition: 'A01', sampleType: 'CONTROL_NTC', containerBarcode: 'CTRL-NTC-001' },
      { wellPosition: 'A02', sampleType: 'PATIENT_SPECIMEN' },
    ] });
    expect(buildMolecularSpecimenLabelData(controlsOnly, PRINTED_AT)).toEqual([]);
    expect(buildMolecularSpecimenLabelData(makeBatch({ wells: [] }), PRINTED_AT)).toEqual([]);
  });

  it('the thermal label text under the barcode is the accession number', () => {
    const [first] = buildMolecularSpecimenLabelData(makeBatch(), PRINTED_AT);
    expect(molecularSpecimenZplTextLines(first)).toEqual(['PS26-100452']);
  });
});

describe('buildMolecularPlateLabelData (PS-231)', () => {
  it('carries the batch plate barcode, assay name and target instrument', () => {
    const label = buildMolecularPlateLabelData(makeBatch(), PRINTED_AT);
    expect(label).toEqual({ plateBarcode: 'PLT-HPV-20260906-012', assayName: 'High-Risk HPV Real-Time PCR', targetInstrumentId: 'PANTHER_02', printedAt: PRINTED_AT });
    expect(molecularPlateZplTextLines(label)).toEqual(['High-Risk HPV Real-Time PCR', 'PANTHER_02']);
  });
});

describe('buildMolecularRackLabelData (PS-231)', () => {
  it('uses the supplied sequence number in the RACK-MOLE barcode', () => {
    expect(buildMolecularRackLabelData(7, PRINTED_AT)).toEqual({ rackBarcode: 'RACK-MOLE-00007', printedAt: PRINTED_AT });
    expect(buildMolecularRackLabelData(12345, PRINTED_AT).rackBarcode).toBe('RACK-MOLE-12345');
    expect(molecularRackZplTextLines(buildMolecularRackLabelData(7, PRINTED_AT))).toEqual(['RACK-MOLE-00007']);
  });
});

describe('buildMolecularDeckLocationLabelData (PS-231)', () => {
  it('builds the LOC-INST label from the instrument and assigned deck slot', () => {
    const label = buildMolecularDeckLocationLabelData(makeBatch(), PRINTED_AT);
    expect(label).toEqual({ deckLocationLabel: 'LOC-INST-PANTHER_02-SLOT_A1', targetInstrumentId: 'PANTHER_02', deckSlot: 'SLOT_A1', printedAt: PRINTED_AT });
    expect(molecularDeckLocationZplTextLines(label!)).toEqual(['PANTHER_02', 'SLOT_A1']);
  });

  it('builds nothing when no deck slot is assigned', () => {
    expect(buildMolecularDeckLocationLabelData(makeBatch({ deckSlot: undefined }), PRINTED_AT)).toBeNull();
    expect(buildMolecularDeckLocationLabelData(makeBatch({ deckSlot: '' }), PRINTED_AT)).toBeNull();
  });
});
