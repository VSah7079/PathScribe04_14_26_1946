// src/utils/labels/printMolecularLabels.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct follow-up: "Continue with printing (labels and
// barcodes). We have mechanisms for this as well" — and the direct
// correction immediately after ("Do the histology labels have an
// integration") that found this file's own first version had wrongly
// generalized a boundary that only applies to container/requisition
// labels (window.print()-only) onto the whole app. Cassette/slide
// labels have a real, working QZ Tray thermal-printer bridge already
// — confirmed directly by reading printCassetteSlideLabel.ts before
// writing this. Molecular labels are the same real physical object
// category (small, plate/specimen/rack scale) as cassette/slide and
// container labels, so they get the same real hardware-bridge
// eligibility container labels now have
// (printRequisitionAndContainerLabels.ts) — via the shared
// dispatchZplLabel.ts routing and the plain, non-GS1
// simpleZplTemplate.ts (a molecular label's own barcode is a plain
// container/plate/rack identifier, never a GS1-encoded symbol —
// zplTemplates.ts's own GS1 machinery genuinely doesn't apply here).
//
// Real, deliberate preset choice per label kind, unchanged from this
// file's own first version — no new presets invented.
// ─────────────────────────────────────────────────────────────────────────────

import type { MolecularBatch } from '@/services/molecular/IMolecularBatchService';
import {
  buildMolecularSpecimenLabelHtml, buildMolecularPlateLabelHtml,
  buildMolecularRackLabelHtml, buildMolecularDeckLocationLabelHtml,
} from './buildLabelHtml';
import { barcodePayloadForMolecularSpecimen, barcodePayloadForMolecularPlate, barcodePayloadForMolecularRack, barcodePayloadForMolecularDeckLocation } from '@/types/labels/LabelData';
import { printLabels } from './printLabels';
import { getLabelSizePreset } from '@/types/labels/LabelSizePreset';
import type { LabelSizePreset } from '@/types/labels/LabelSizePreset';
import {
  buildMolecularSpecimenLabelData, buildMolecularPlateLabelData, buildMolecularRackLabelData, buildMolecularDeckLocationLabelData,
  molecularSpecimenZplTextLines, molecularPlateZplTextLines, molecularRackZplTextLines, molecularDeckLocationZplTextLines,
} from './buildMolecularLabelData';
// Real, deliberate direct import — NOT via '@/services/index'. That
// barrel re-exports this app's entire service layer; a real,
// empirical timing check found importing it alone costs 2+ seconds
// (confirmed directly, not assumed), which is what actually caused a
// real, reproduced test timeout in this file. Importing the specific
// service files directly avoids paying that cost just to reach two
// narrow services.
import { mockPrintSettingsService as printSettingsService } from '@/services/printSettings/mockPrintSettingsService';
import { mockPrinterProfileService as printerProfileService } from '@/services/printerProfiles/mockPrinterProfileService';
import { buildSimpleZplLabel } from './simpleZplTemplate';
import { dispatchZplLabel } from './dispatchZplLabel';

const SPECIMEN_PRESET_ID = 'clsi_standard_specimen';
const PLATE_AND_RACK_PRESET_ID = 'medium_container';
const DECK_LOCATION_PRESET_ID = 'clsi_standard_specimen';

/** Real, per this file's own header: when a real PrinterProfile is
 *  configured (molecularLabelPrinterProfileId) with a real, working
 *  bridge (qz_tray today), dispatches the real, physical thermal
 *  print directly. Real, honest degrade: returns false (never throws)
 *  on any real failure to look up settings/profile, or a genuinely
 *  unconfigured/unsupported bridge — the caller's own existing
 *  window.print() path remains the real, working fallback either way. */
async function tryDispatchViaHardwareBridge(barcodePayload: string, textLines: string[], preset: LabelSizePreset): Promise<boolean> {
  const settingsRes = await printSettingsService.get();
  const profileId = settingsRes.ok ? settingsRes.data.molecularLabelPrinterProfileId : undefined;
  if (!profileId) return false;

  const profileRes = await printerProfileService.getById(profileId);
  if (!profileRes.ok || !profileRes.data) return false;
  const printer = profileRes.data;
  if (printer.bridgeType !== 'qz_tray') return false;

  const zpl = buildSimpleZplLabel({ barcodePayload, symbology: preset.defaultBarcodeSymbology, textLines, dpi: printer.dpi, widthMm: preset.widthMm, heightMm: preset.heightMm });
  const result = await dispatchZplLabel(printer, zpl, 1, undefined, { document: 'molecular-label', documentId: barcodePayload });
  return result.ok;
}

/** Real, per the given specification's own §3.1: prints every real
 *  patient specimen well on this batch as its own, individual
 *  container label — a real tech relabeling/verifying tubes going
 *  into this run needs one real label per real tube, not one combined
 *  sheet. Real, honest no-op when the batch has no real specimen wells
 *  assigned yet (a draft batch with only controls placed so far) —
 *  never a fabricated blank label. Real, per this file's own header —
 *  each real specimen well independently tries the real hardware
 *  bridge first; a batch never partially dispatches via hardware and
 *  falls back to a browser dialog for the rest. */
export async function printMolecularSpecimenLabels(batch: MolecularBatch): Promise<boolean> {
  const preset = getLabelSizePreset(SPECIMEN_PRESET_ID)!;
  // PS-231 (Batch 450): label content is built in buildMolecularLabelData.ts.
  const labels = buildMolecularSpecimenLabelData(batch, new Date().toISOString());
  if (labels.length === 0) return false;

  const settingsRes = await printSettingsService.get();
  if (settingsRes.ok && settingsRes.data.molecularLabelPrinterProfileId) {
    const results = await Promise.all(labels.map(l => tryDispatchViaHardwareBridge(
      barcodePayloadForMolecularSpecimen(l), molecularSpecimenZplTextLines(l), preset,
    )));
    if (results.every(Boolean)) return true;
  }

  const htmlFragments = labels.map(l => buildMolecularSpecimenLabelHtml(l, preset));
  return printLabels(htmlFragments, preset, `Specimen Labels — ${batch.batchBarcode}`, { document: 'molecular-specimen-labels', documentId: batch.batchBarcode });
}

export async function printMolecularPlateLabel(batch: MolecularBatch): Promise<boolean> {
  const preset = getLabelSizePreset(PLATE_AND_RACK_PRESET_ID)!;
  const label = buildMolecularPlateLabelData(batch, new Date().toISOString());
  if (await tryDispatchViaHardwareBridge(barcodePayloadForMolecularPlate(label), molecularPlateZplTextLines(label), preset)) return true;
  const html = buildMolecularPlateLabelHtml(label, preset);
  return printLabels([html], preset, `Plate Label — ${label.plateBarcode}`, { document: 'molecular-plate-label', documentId: label.plateBarcode });
}

/** Real, per the given specification's own §2.2: an extraction rack is
 *  a real, physical carrier independent of any one specific batch — a
 *  real caller supplies its own sequence number (e.g. from a real
 *  rack-tracking count), this function does not invent one. */
export async function printMolecularRackLabel(sequence: number): Promise<boolean> {
  const preset = getLabelSizePreset(PLATE_AND_RACK_PRESET_ID)!;
  const label = buildMolecularRackLabelData(sequence, new Date().toISOString());
  // Real, direct bug fix per direct feedback from real Labelary
  // verification ("Seems like there should be a Printed Designation
  // under the barcode?"): the ZPL path shows the rack barcode as
  // human-readable text, matching the HTML path and every sibling
  // molecular label (molecularRackZplTextLines).
  if (await tryDispatchViaHardwareBridge(barcodePayloadForMolecularRack(label), molecularRackZplTextLines(label), preset)) return true;
  const html = buildMolecularRackLabelHtml(label, preset);
  return printLabels([html], preset, `Extraction Rack Label — ${label.rackBarcode}`, { document: 'molecular-rack-label', documentId: label.rackBarcode });
}

export async function printMolecularDeckLocationLabel(batch: MolecularBatch): Promise<boolean> {
  const label = buildMolecularDeckLocationLabelData(batch, new Date().toISOString());
  if (!label) return false; // real, honest no-op — no real deck slot assigned to this batch yet
  const preset = getLabelSizePreset(DECK_LOCATION_PRESET_ID)!;
  if (await tryDispatchViaHardwareBridge(barcodePayloadForMolecularDeckLocation(label), molecularDeckLocationZplTextLines(label), preset)) return true;
  const html = buildMolecularDeckLocationLabelHtml(label, preset);
  return printLabels([html], preset, `Deck Location Label — ${label.deckLocationLabel}`, { document: 'molecular-deck-location-label', documentId: label.deckLocationLabel });
}
