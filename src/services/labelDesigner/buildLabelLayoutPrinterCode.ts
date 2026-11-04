// src/services/labelDesigner/buildLabelLayoutPrinterCode.ts
// Batch 606 (PS-27 / PS-153): one saved layout, three printer languages. ZPL
// (Zebra) comes from buildLabelLayoutZpl. EPL2 (Zebra LP/TLP) and DPL (Datamax)
// are translated from the same field list, so a lab with older printers does
// not redraw the label. Positions, text and barcode type carry over exactly;
// barcode command syntax differs a little by printer model, so the output is a
// starting point to confirm on the lab's own printer, and the designer says so.

import { buildLabelLayoutZpl } from './buildLabelLayoutZpl';
import { isFieldVisible } from './labelFieldVisibility';
import { LABEL_TYPE_DEFAULT_SYMBOLOGY } from './ILabelLayoutService';
import type { LabelLayout, LabelType } from './ILabelLayoutService';
import { mmToDots } from '../../utils/labels/simpleZplTemplate';

export type PrinterLanguage = 'zpl' | 'epl' | 'dpl';
export const PRINTER_LANGUAGES: readonly PrinterLanguage[] = ['zpl', 'epl', 'dpl'];

const q = (v: string) => v.replace(/"/g, "'").replace(/[\r\n]+/g, ' ');
const pad = (n: number, w: number) => String(Math.max(0, Math.round(n))).padStart(w, '0').slice(-w);

function buildEpl(layout: LabelLayout, labelType: LabelType, values: Record<string, string>, dpi: number): string {
  const symbology = LABEL_TYPE_DEFAULT_SYMBOLOGY[labelType];
  const out = ['N', `q${mmToDots(layout.widthMm, dpi)}`, `Q${mmToDots(layout.heightMm, dpi)},24`];
  for (const f of layout.fields.filter(x => isFieldVisible(x, values))) {
    const x = mmToDots(f.xMm, dpi); const y = mmToDots(f.yMm, dpi);
    const value = q(values[f.fieldKey] ?? f.fieldKey);
    if (f.fieldKey === 'barcode') {
      out.push(symbology === 'datamatrix'
        ? `b${x},${y},D,"${value}"`
        : `B${x},${y},0,1,2,4,${mmToDots(f.heightMm, dpi)},N,"${value}"`);
    } else {
      // EPL font 3 at 1x is the closest built-in size; multipliers scale it with the field's font size.
      const mult = Math.max(1, Math.min(8, Math.round(mmToDots(f.fontSizeMm, dpi) / 16)));
      out.push(`A${x},${y},0,3,${mult},${mult},N,"${value}"`);
    }
  }
  out.push('P1');
  return out.join('\n');
}

function buildDpl(layout: LabelLayout, labelType: LabelType, values: Record<string, string>): string {
  const symbology = LABEL_TYPE_DEFAULT_SYMBOLOGY[labelType];
  // <STX>m selects metric units, so positions below are in tenths of a millimetre.
  const out = ['\u0002m', '\u0002L', 'D11'];
  for (const f of layout.fields.filter(x => isFieldVisible(x, values))) {
    const row = pad(f.yMm * 10, 4); const col = pad(f.xMm * 10, 4);
    const value = q(values[f.fieldKey] ?? f.fieldKey);
    if (f.fieldKey === 'barcode') {
      out.push(symbology === 'datamatrix'
        ? `1W1d${pad(f.heightMm * 10, 3)}${row}${col}${value}`
        : `1a21${pad(f.heightMm * 10, 3)}${row}${col}${value}`);
    } else {
      out.push(`1911${pad(f.fontSizeMm * 10, 3)}${row}${col}${value}`);
    }
  }
  out.push('E');
  return out.join('\n');
}

export function buildLabelLayoutPrinterCode(
  layout: LabelLayout, labelType: LabelType, values: Record<string, string>, dpi: number, language: PrinterLanguage,
): string {
  if (language === 'epl') return buildEpl(layout, labelType, values, dpi);
  if (language === 'dpl') return buildDpl(layout, labelType, values);
  return buildLabelLayoutZpl(layout, labelType, values, dpi);
}
