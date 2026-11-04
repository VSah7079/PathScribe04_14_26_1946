// src/services/reportAppearance/renderDocumentStyle.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 609 (PS-35, PS-127): the lab's document style (Configuration → System →
// Document Style: font family, size in px, weight, underline, case, for the
// header, body and footer) as it goes in a render request, so the report
// renderer (functions/main.py and cytology_report.py) draws it. The surgical
// report sends the template's own resolved style (contextBuilder.ts); the
// cytology report, which has no template, sends the lab's.
// ─────────────────────────────────────────────────────────────────────────────

import type { LabelConfig } from '../../types/template';
import {
  getOrgDocumentStyleDefault, getOrgHeaderStyleDefault, getOrgFooterStyleDefault,
} from '../../components/Config/System/documentStyleConfig';

export interface RenderDocumentStyle { header: LabelConfig; body: LabelConfig; footer: LabelConfig; }

/** The lab's header, body and footer styles, as saved (or the built-in defaults). */
export function renderDocumentStyle(): RenderDocumentStyle {
  return { header: getOrgHeaderStyleDefault(), body: getOrgDocumentStyleDefault(), footer: getOrgFooterStyleDefault() };
}
