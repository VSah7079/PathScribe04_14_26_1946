// src/utils/labels/buildMolecularLabelData.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-231 (Batch 450): what goes on each molecular label, moved out of
// printMolecularLabels.ts so it can be tested without a printer or a print
// window. Unchanged behaviour:
//   - specimen labels: one per patient-specimen well that has a scanned
//     container barcode (controls and not-yet-scanned wells get none); a
//     missing accession prints as '—';
//   - plate label: the batch's plate barcode, assay and target instrument;
//   - extraction rack label: RACK-MOLE barcode from the caller's sequence;
//   - deck location label: only when the batch has a deck slot (null otherwise).
// The *ZplTextLines helpers are the human-readable lines the thermal (ZPL)
// path prints under each barcode.
// ─────────────────────────────────────────────────────────────────────────────

import type { MolecularBatch } from '@/services/molecular/IMolecularBatchService';
import type {
  MolecularSpecimenLabelData, MolecularPlateLabelData, MolecularRackLabelData, MolecularDeckLocationLabelData,
} from '@/types/labels/LabelData';
import { generateExtractionRackBarcode, generateDeckLocationLabel } from '@/services/molecular/resolveMolecularBarcodes';

const NO_ACCESSION = '—';

export function buildMolecularSpecimenLabelData(batch: MolecularBatch, printedAt: string): MolecularSpecimenLabelData[] {
  return batch.wells
    .filter(w => w.sampleType === 'PATIENT_SPECIMEN' && w.containerBarcode)
    .map(w => ({
      containerBarcode: w.containerBarcode!, accessionNumber: w.accessionNumber ?? NO_ACCESSION,
      aliquotVolumeUl: w.aliquotVolumeUl, printedAt,
    }));
}

export function molecularSpecimenZplTextLines(data: MolecularSpecimenLabelData): string[] {
  return [data.accessionNumber];
}

export function buildMolecularPlateLabelData(batch: MolecularBatch, printedAt: string): MolecularPlateLabelData {
  return { plateBarcode: batch.plateBarcode, assayName: batch.assayName, targetInstrumentId: batch.targetInstrumentId, printedAt };
}

export function molecularPlateZplTextLines(data: MolecularPlateLabelData): string[] {
  return [data.assayName, data.targetInstrumentId];
}

export function buildMolecularRackLabelData(sequence: number, printedAt: string): MolecularRackLabelData {
  return { rackBarcode: generateExtractionRackBarcode(sequence), printedAt };
}

export function molecularRackZplTextLines(data: MolecularRackLabelData): string[] {
  return [data.rackBarcode];
}

/** Null when the batch has no deck slot assigned yet: there is no label to print. */
export function buildMolecularDeckLocationLabelData(batch: MolecularBatch, printedAt: string): MolecularDeckLocationLabelData | null {
  if (!batch.deckSlot) return null;
  return {
    deckLocationLabel: generateDeckLocationLabel(batch.targetInstrumentId, batch.deckSlot),
    targetInstrumentId: batch.targetInstrumentId, deckSlot: batch.deckSlot, printedAt,
  };
}

export function molecularDeckLocationZplTextLines(data: MolecularDeckLocationLabelData): string[] {
  return [data.targetInstrumentId, data.deckSlot];
}
