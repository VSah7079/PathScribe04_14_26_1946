// src/services/labelDesigner/savedLayoutRegistry.ts
// Batch 606 (PS-26 / PS-153): the label print paths build their output
// synchronously, so they read the saved designer layouts directly from the same
// store the designer writes (mockLabelLayoutService), through this one function.
// Facility override first (where the label type allows one), then the
// enterprise default, then nothing, which means "use the built-in layout".

import { storageGet } from '../mockStorage';
import { resolveLabelLayoutForFacility } from './ILabelLayoutService';
import type { LabelLayout, LabelType } from './ILabelLayoutService';
import { buildLabelLayoutZpl } from './buildLabelLayoutZpl';
import { isFieldVisible } from './labelFieldVisibility';
import { LABEL_TYPE_DEFAULT_SYMBOLOGY } from './ILabelLayoutService';
import { safeBarcodeSvg } from '../../utils/labels/safeBarcodeSvg';
import { escapeHtml, sanitizeSvgMarkup } from '../security/sanitizeHtml';

const STORE_KEY = 'label_designer_layouts';

export function getSavedLayout(labelType: LabelType, facilityId?: string): LabelLayout | undefined {
  try {
    const all = storageGet<LabelLayout[]>(STORE_KEY, []);
    const layout = resolveLabelLayoutForFacility(labelType, facilityId, all);
    return layout && layout.fields.length > 0 ? layout : undefined;
  } catch {
    return undefined;
  }
}

/** The ZPL for a saved layout filled with this label's own values, or null when no layout is saved. */
export function renderSavedLayoutZpl(
  labelType: LabelType, values: Record<string, string>, dpi: number, facilityId?: string,
): string | null {
  const layout = getSavedLayout(labelType, facilityId);
  if (!layout) return null;
  const zpl = buildLabelLayoutZpl(layout, labelType, values, dpi);
  // A GS1 payload carries FNC1 as "_1", which the printer reads only with ^FH.
  return /_1/.test(values.barcode ?? '') ? zpl.replace(/(\^BXN[^\n]*\n)\^FD/g, '$1^FH^FD') : zpl;
}

/** Turns a label data object into the string values a layout reads, with the barcode payload added. */
export function labelValues(data: object, barcode: string): Record<string, string> {
  const out: Record<string, string> = { barcode };
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === 'string' || typeof v === 'number') out[k] = String(v);
  }
  return out;
}

/** The label as positioned HTML for the browser print dialog, or null when no layout is saved. */
export function renderSavedLayoutHtml(
  labelType: LabelType, values: Record<string, string>, facilityId?: string,
): string | null {
  const layout = getSavedLayout(labelType, facilityId);
  if (!layout) return null;
  const parts = layout.fields.filter(f => isFieldVisible(f, values)).map(f => {
    const box = `position:absolute;left:${f.xMm}mm;top:${f.yMm}mm;width:${f.widthMm}mm;height:${f.heightMm}mm;overflow:hidden;`;
    if (f.fieldKey === 'barcode') {
      const svg = sanitizeSvgMarkup(safeBarcodeSvg(values.barcode ?? '', LABEL_TYPE_DEFAULT_SYMBOLOGY[labelType], escapeHtml(values.barcode ?? '')));
      return `<div class="ps-label-barcode" style="${box}">${svg}</div>`;
    }
    // 1 mm of font height is about 2.83 pt.
    return `<div style="${box}font-size:${(f.fontSizeMm * 2.83).toFixed(1)}pt;line-height:1;white-space:nowrap;">${escapeHtml(values[f.fieldKey] ?? '')}</div>`;
  });
  return `<div class="ps-label ps-label--saved" style="position:relative;width:${layout.widthMm}mm;height:${layout.heightMm}mm;">${parts.join('')}</div>`;
}

/** Saved-layout HTML when one exists, otherwise the built-in layout's HTML. */
export function applySavedLayoutHtml(
  labelType: LabelType, values: Record<string, string>, builtInHtml: string, facilityId?: string,
): string {
  return renderSavedLayoutHtml(labelType, values, facilityId) ?? builtInHtml;
}

/** Saved-layout ZPL when one exists, otherwise the built-in layout's ZPL. */
export function applySavedLayout(
  labelType: LabelType, values: Record<string, string>, dpi: number, builtInZpl: string, facilityId?: string,
): string {
  return renderSavedLayoutZpl(labelType, values, dpi, facilityId) ?? builtInZpl;
}
