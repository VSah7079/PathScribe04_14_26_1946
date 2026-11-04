// src/utils/labels/printVialRackLabel.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 615 (PS-360): prints a vial/tube label or a rack/batch label. Same
// routing as the cassette and slide labels (printCassetteSlideLabel.ts):
//   - "Direct via Interface Engine" printers get a VIAL or RACK payload
//     (carrying the ZPL PathScribe built), sent through the tracker so the
//     engine's answer, Retry and the audit work as they do for slides;
//   - QZ Tray and PathScribe Agent printers get the ZPL through
//     dispatchZplLabel.ts.
// A layout saved in the Label Designer for the matching label type
// (molecular specimen, plate or rack) replaces the built-in layout on both
// routes. Staining racks and WSI scan batches have no Designer type yet and
// use the built-in layout.
// ─────────────────────────────────────────────────────────────────────────────

import i18n from '@/i18n/config';
import { formatDate } from '@/utils/formatDate';
import type { PrinterProfile } from '@/services/printerProfiles/IPrinterProfileService';
import { applySavedLayout } from '@/services/labelDesigner/savedLayoutRegistry';
import type { LabelType } from '@/services/labelDesigner/ILabelLayoutService';
import { networkPrintJobs } from '@/services/networkPrint/networkPrintJobsInstance';
import { dispatchZplLabel } from './dispatchZplLabel';
import { buildVialRackNetworkPrintPayload } from './dispatchNetworkPrintJob';
import {
  buildVialZplTemplate, buildRackZplTemplate,
  type LabelStockSize, type RackLabelKind, type VialRackZplError, type VialRackZplOk,
} from './vialRackZplTemplates';

export type PrintVialRackResult = { ok: true; droppedLines: number } | { ok: false; message: string };

const errorMessage = (error: VialRackZplError, id: string, dpi: number): string =>
  i18n.t(`networkPrint.label.vialRack.${error}`, { id, dpi });

export interface PrintVialLabelInput {
  vialId: string;
  /** The case, when the vial belongs to one. */
  accessionNumber?: string;
  /** What is in the vial, e.g. "DNA extract" (already in the user's language). */
  description?: string;
  volumeUl?: number;
  copies?: number;
  /** The label stock, when it is not the Label Designer's vial size. */
  size?: LabelStockSize;
}

export interface PrintRackLabelInput {
  kind: RackLabelKind;
  rackId: string;
  /** The assay or batch name printed under the kind. */
  title?: string;
  itemCount?: number;
  /** ISO date or time the label stands for; printed in the user's locale. */
  date?: string;
  copies?: number;
  size?: LabelStockSize;
}

const RACK_DESIGNER_TYPE: Partial<Record<RackLabelKind, LabelType>> = {
  molecular_plate: 'molecular_plate',
  molecular_rack: 'molecular_rack',
};

/** The text under a vial barcode, highest priority first. */
export function vialLabelLines(input: Pick<PrintVialLabelInput, 'accessionNumber' | 'description' | 'volumeUl'>): string[] {
  return [
    input.accessionNumber ?? '',
    input.description ?? '',
    input.volumeUl !== undefined ? i18n.t('networkPrint.label.vialRack.volume', { volume: input.volumeUl }) : '',
  ].filter(l => l.trim().length > 0);
}

/** The text under a rack or batch barcode, highest priority first. */
export function rackLabelLines(input: Pick<PrintRackLabelInput, 'kind' | 'title' | 'itemCount' | 'date'>): string[] {
  return [
    i18n.t(`networkPrint.label.vialRack.kind.${input.kind}`),
    input.title ?? '',
    input.itemCount !== undefined ? i18n.t('networkPrint.label.vialRack.items', { count: input.itemCount }) : '',
    input.date ? formatDate(input.date, i18n.language) : '',
  ].filter(l => l.trim().length > 0);
}

async function send(
  built: VialRackZplOk, printer: PrinterProfile, copies: number,
  route: { labelType: 'VIAL' | 'RACK'; barcode: string; lines: string[]; accessionNumber?: string; rackKind?: RackLabelKind; designer?: LabelType; values: Record<string, string> },
): Promise<PrintVialRackResult> {
  const zpl = route.designer ? applySavedLayout(route.designer, { barcode: route.barcode, ...route.values }, printer.dpi, built.zpl) : built.zpl;
  if (printer.bridgeType === 'direct_interface_engine') {
    const payload = buildVialRackNetworkPrintPayload({
      accessionNumber: route.accessionNumber, caseId: route.accessionNumber, labelType: route.labelType, barcode: route.barcode,
      rackKind: route.rackKind, lines: route.lines, zpl, printer, copies,
    });
    if (payload.ok === false) return { ok: false, message: payload.errors.join('; ') };
    await networkPrintJobs.send(payload.payload);
    return { ok: true, droppedLines: built.droppedLines };
  }
  const result = await dispatchZplLabel(printer, zpl, copies, undefined, {
    document: route.labelType === 'VIAL' ? 'vial-label' : 'rack-label', documentId: route.barcode, caseId: route.accessionNumber ?? null,
  });
  return result.ok ? { ok: true, droppedLines: built.droppedLines } : { ok: false, message: result.message };
}

export async function printVialLabel(input: PrintVialLabelInput, printer: PrinterProfile): Promise<PrintVialRackResult> {
  const lines = vialLabelLines(input);
  const built = buildVialZplTemplate({ vialId: input.vialId, lines }, printer.dpi, input.size);
  if (built.ok === false) return { ok: false, message: errorMessage(built.error, input.vialId, printer.dpi) };
  return send(built, printer, input.copies ?? 1, {
    labelType: 'VIAL', barcode: input.vialId.trim(), lines, accessionNumber: input.accessionNumber, designer: 'molecular_specimen',
    values: {
      containerBarcode: input.vialId.trim(), accessionNumber: input.accessionNumber ?? '',
      aliquotVolumeUl: input.volumeUl !== undefined ? String(input.volumeUl) : '', printedAt: new Date().toISOString(),
    },
  });
}

export async function printRackLabel(input: PrintRackLabelInput, printer: PrinterProfile): Promise<PrintVialRackResult> {
  const lines = rackLabelLines(input);
  const built = buildRackZplTemplate({ kind: input.kind, rackId: input.rackId, lines }, printer.dpi, input.size);
  if (built.ok === false) return { ok: false, message: errorMessage(built.error, input.rackId, printer.dpi) };
  const designer = RACK_DESIGNER_TYPE[input.kind];
  const idKey = input.kind === 'molecular_plate' ? 'plateBarcode' : 'rackBarcode';
  return send(built, printer, input.copies ?? 1, {
    labelType: 'RACK', barcode: input.rackId.trim(), lines, rackKind: input.kind, designer,
    values: { [idKey]: input.rackId.trim(), assayName: input.title ?? '', printedAt: input.date ?? new Date().toISOString() },
  });
}
