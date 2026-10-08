// src/utils/labels/safeBarcodeSvg.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-256 (Batch 451): moved out of LabelDesignerPage.tsx unchanged. A
// defensive wrapper around generateBarcodeSvg.ts for the live designer
// canvas: generateBarcodeSvg throws on a payload the symbology can't encode
// (an empty payload, say), and a live canvas must never break on that. On
// failure it returns a visible placeholder (the caller's translated
// `errorText`) instead. Print paths keep calling generateBarcodeSvg
// directly, where a visible failure is the right outcome.
// ─────────────────────────────────────────────────────────────────────────────

import { generateBarcodeSvg } from './generateBarcodeSvg';

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));

export function safeBarcodeSvg(payload: string, symbology: 'code128' | 'datamatrix', errorText: string): string {
  try {
    return generateBarcodeSvg(payload, symbology);
  } catch {
    // Batch 451: the text goes into HTML, so it is escaped.
    return `<div class="ps-designer-barcode-error">${escapeHtml(errorText)}</div>`;
  }
}
