// src/utils/labels/vialRackZplTemplates.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 615 (PS-360): vial/tube labels and rack/batch labels for network
// printing through the interface engine. Cassette and slide labels already
// had templates (zplTemplates.ts); these are the two missing families:
//   - VIAL: aliquots and molecular extracts (a tube or vial label);
//   - RACK: staining racks, molecular plates and racks, WSI scan batches.
//
// Built in the browser, like the cassette and slide templates. The barcode is
// a plain Code 128 of the vial or rack id (the same plain id the
// local-bridge route has always printed through simpleZplTemplate.ts); these
// are lab-internal containers, so there is no GS1 company prefix to register.
//
// The label stock size and printer resolution decide what fits. The size
// defaults to the Label Designer's size for the matching label type
// (LABEL_TYPE_DEFAULT_SIZE_MM) and can be passed in; the module width steps
// down (3, 2, 1 dots) until the barcode fits the label, and an id too long
// even at 1 dot is refused with a reason rather than printed unreadable.
// Text lines are given highest priority first; lines that do not fit the
// remaining height are dropped from the bottom and reported.
// ─────────────────────────────────────────────────────────────────────────────

import { mmToDots } from './simpleZplTemplate';
import { LABEL_TYPE_DEFAULT_SIZE_MM } from '@/services/labelDesigner/ILabelLayoutService';

export type RackLabelKind = 'staining_rack' | 'molecular_plate' | 'molecular_rack' | 'wsi_batch';

export interface LabelStockSize { widthMm: number; heightMm: number }

/** Default stock per label family: the Label Designer's sizes. */
export const VIAL_DEFAULT_SIZE: LabelStockSize = LABEL_TYPE_DEFAULT_SIZE_MM.molecular_specimen; // 1 x 0.5 in
export const RACK_DEFAULT_SIZE: Record<RackLabelKind, LabelStockSize> = {
  staining_rack: LABEL_TYPE_DEFAULT_SIZE_MM.molecular_rack,
  molecular_rack: LABEL_TYPE_DEFAULT_SIZE_MM.molecular_rack,
  molecular_plate: LABEL_TYPE_DEFAULT_SIZE_MM.molecular_plate,
  wsi_batch: LABEL_TYPE_DEFAULT_SIZE_MM.molecular_plate,
};

export type VialRackZplError = 'barcodeEmpty' | 'barcodeInvalid' | 'barcodeTooLong' | 'noRoom';

export interface VialRackZplOk {
  ok: true;
  zpl: string;
  /** Narrow-bar width chosen so the Code 128 fits, in dots. */
  moduleDots: number;
  /** Text lines left off because the label is too short for them. */
  droppedLines: number;
}
export interface VialRackZplFailure { ok: false; error: VialRackZplError }

const MARGIN_MM = 1;
const QUIET_MODULES = 20; // 10 on each side
const MIN_FONT_MM = 1.6;
const MAX_FONT_MM = 2.8;

const sanitize = (v: string): string => v.replace(/[\^~]/g, '');

/** Code 128 symbol width in modules for n characters (code set B, worst case): start + data + check + stop. */
export const code128Modules = (n: number): number => 11 * (n + 2) + 13;

/** Printable ASCII only: what Code 128 set B can carry. */
const printableAscii = (v: string): boolean => /^[\x20-\x7e]+$/.test(v);

interface Spec {
  barcode: string;
  /** Highest priority first. */
  lines: string[];
  size: LabelStockSize;
  dpi: number;
}

function build(spec: Spec): VialRackZplOk | VialRackZplFailure {
  const barcode = spec.barcode.trim();
  if (!barcode) return { ok: false, error: 'barcodeEmpty' };
  if (!printableAscii(barcode)) return { ok: false, error: 'barcodeInvalid' };
  const clean = sanitize(barcode);
  const { dpi, size } = spec;
  const widthDots = mmToDots(size.widthMm, dpi);
  const heightDots = mmToDots(size.heightMm, dpi);
  const marginDots = mmToDots(MARGIN_MM, dpi);
  const usable = widthDots - 2 * marginDots;
  const modules = code128Modules(clean.length) + QUIET_MODULES;
  const moduleDots = [3, 2, 1].find(m => modules * m <= usable);
  if (!moduleDots) return { ok: false, error: 'barcodeTooLong' };

  // The barcode takes about 45% of the height; the lines share the rest.
  const barcodeHeight = Math.max(mmToDots(4, dpi), Math.round(heightDots * 0.45) - marginDots);
  const textTop = marginDots + barcodeHeight + mmToDots(0.6, dpi);
  const room = heightDots - marginDots - textTop;
  const lines = spec.lines.map(sanitize).filter(l => l.trim().length > 0);
  const minFont = mmToDots(MIN_FONT_MM, dpi);
  const maxFont = mmToDots(MAX_FONT_MM, dpi);
  if (room < minFont && lines.length > 0) {
    // Not even one line fits under the barcode: print the barcode alone.
    return { ok: true, zpl: wrap(widthDots, heightDots, marginDots, barcodeHeight, moduleDots, clean, []), moduleDots, droppedLines: lines.length };
  }
  const fit = Math.max(0, Math.min(lines.length, Math.floor(room / minFont)));
  const kept = lines.slice(0, fit);
  const font = kept.length > 0 ? Math.max(minFont, Math.min(maxFont, Math.floor(room / kept.length))) : 0;
  const textCommands = kept.map((line, i) => `^FO${marginDots},${textTop + i * font}^A0N,${font},${font}^FD${line}^FS`);
  return { ok: true, zpl: wrap(widthDots, heightDots, marginDots, barcodeHeight, moduleDots, clean, textCommands), moduleDots, droppedLines: lines.length - kept.length };
}

function wrap(widthDots: number, heightDots: number, margin: number, barcodeHeight: number, moduleDots: number, barcode: string, text: string[]): string {
  return [
    '^XA',
    '^CI28',
    `^PW${widthDots}`,
    `^LL${heightDots}`,
    `^FO${margin + Math.floor(QUIET_MODULES / 2) * moduleDots},${margin}`,
    `^BY${moduleDots}`,
    `^BCN,${barcodeHeight},N,N,N`,
    `^FD${barcode}^FS`,
    ...text,
    '^XZ',
  ].join('\n');
}

export interface VialZplFields {
  /** The vial or tube id: printed as Code 128. */
  vialId: string;
  /** Text lines under the barcode, highest priority first (already translated). */
  lines: string[];
}

export function buildVialZplTemplate(fields: VialZplFields, dpi: number, size: LabelStockSize = VIAL_DEFAULT_SIZE): VialRackZplOk | VialRackZplFailure {
  return build({ barcode: fields.vialId, lines: fields.lines, size, dpi });
}

export interface RackZplFields {
  kind: RackLabelKind;
  /** The rack, plate or batch id: printed as Code 128. */
  rackId: string;
  /** Text lines under the barcode, highest priority first (already translated). */
  lines: string[];
}

export function buildRackZplTemplate(fields: RackZplFields, dpi: number, size: LabelStockSize = RACK_DEFAULT_SIZE[fields.kind]): VialRackZplOk | VialRackZplFailure {
  return build({ barcode: fields.rackId, lines: fields.lines, size, dpi });
}
