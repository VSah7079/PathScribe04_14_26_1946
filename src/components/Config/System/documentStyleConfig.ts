// src/components/Config/System/documentStyleConfig.ts
// ─────────────────────────────────────────────────────────────
// Real source of truth for the org-wide default report font style.
//
// Confirmed by direct investigation before building this: the report's
// actual rendered default font (.rp-page's font-family in pathscribe.css)
// was, until this feature, 100% hardcoded CSS with zero configuration
// anywhere — not org-wide, not per-facility, nothing. A per-template
// override (ReportTemplate.documentStyle.body) already exists as the
// next layer up; this file adds the missing layer beneath it.
//
// Same "null/unset = inherit" two-layer convention already used for
// AI Orchestrator mode (see orchestratorModeConfig.ts, this file's own
// direct model) and Facility.tatFirstTouchHours/jurisdiction/etc.:
//   1. ORG DEFAULT     — org-wide, admin-editable here, kept in the lab
//      settings store. Defaults to Arial/10pt per direct product decision
//      if never explicitly set (fresh install) — not an arbitrary guess.
//   2. TEMPLATE OVERRIDE — ReportTemplate.documentStyle.body, set per
//      template in the Template Assembly editor. Wins over the org
//      default when set. Resolved directly in contextBuilder.ts, since
//      that's where the real, resolved ReportTemplate is already in
//      hand — no separate async lookup needed the way per-facility
//      settings require (this cascade has no facility dimension).
// A third layer — per-component labelConfig — already existed before
// either of the above; it continues to win over both via ordinary CSS
// inheritance (see ReportPreviewRenderer.tsx).
// ─────────────────────────────────────────────────────────────

import type { LabelConfig } from '../../../types/template';
import { readLabSetting, saveLabSetting } from '../../../services/labSettings/labSettingsStore';

const ORG_DOCUMENT_STYLE_KEY = 'pathscribe_org_document_style_body';
const ORG_DOCUMENT_STYLE_HEADER_KEY = 'pathscribe_org_document_style_header';
const ORG_DOCUMENT_STYLE_FOOTER_KEY = 'pathscribe_org_document_style_footer';

// position isn't meaningful for a document-wide default (there's no
// single "label" to position at this level — see LabelConfig's own doc
// comment) — carried only because LabelConfig requires it; never read
// in this context.
//
// Batch 612 (Pete: "7.5 is really too small"): sizes are in points, the size
// they print at, and the built-in defaults are 10 to 11 pt: body 10, header 11
// bold, footer 10. A lab that saved its own style before Batch 612 has sizes in
// pixels (printed at 0.75 pt each): those are read as "legacy_px" and print as
// they always did until the lab converts them (services/reportAppearance/
// fontUnits.ts, "Convert to points" in Document Style).
const FALLBACK_DEFAULT: LabelConfig = { position: 'above', fontFamily: 'Arial', fontSize: 10, units: 'pt' };
// Real feature (Step 2): header/footer get their own sensible
// defaults, distinct from body — a slightly larger, bold header is
// conventional for a report letterhead; a smaller footer is
// conventional for page-bottom metadata. Both still fully
// admin-editable, same as body.
const FALLBACK_HEADER_DEFAULT: LabelConfig = { position: 'above', fontFamily: 'Arial', fontSize: 11, weight: 'bold', units: 'pt' };
const FALLBACK_FOOTER_DEFAULT: LabelConfig = { position: 'above', fontFamily: 'Arial', fontSize: 10, units: 'pt' };

// What each category defaulted to before Batch 612 (pixels). A lab style saved then
// that never set a size still shows (and prints) the size it always had.
const LEGACY_FALLBACKS = {
  body:   { position: 'above', fontFamily: 'Arial', fontSize: 10 },
  header: { position: 'above', fontFamily: 'Arial', fontSize: 12, weight: 'bold' },
  footer: { position: 'above', fontFamily: 'Arial', fontSize: 8 },
} as const satisfies Record<string, LabelConfig>;

// ── Org-level default (sync — safe to call from render) ────────────────────

// Batch 431: kept in the lab settings store (services/labSettings/), the one
// place that changes when the API server holds them (PS-345).
// Batch 612: a stored style with no `units` was saved before points existed, so
// it is legacy pixels: it keeps printing exactly as it did, over the old defaults.
function readStored(key: string, fallback: LabelConfig, legacyFallback: LabelConfig): LabelConfig {
  const stored = readLabSetting<Partial<LabelConfig>>(key, {});
  if (!stored || Object.keys(stored).length === 0) return { ...fallback };
  if (stored.units === 'pt' || stored.units === 'legacy_px') return { ...fallback, ...stored };
  return { ...legacyFallback, ...stored, units: 'legacy_px' };
}

export function getOrgDocumentStyleDefault(): LabelConfig {
  return readStored(ORG_DOCUMENT_STYLE_KEY, FALLBACK_DEFAULT, LEGACY_FALLBACKS.body);
}

export function setOrgDocumentStyleDefault(style: LabelConfig): void {
  saveLabSetting(ORG_DOCUMENT_STYLE_KEY, style);
}

export function getOrgHeaderStyleDefault(): LabelConfig {
  return readStored(ORG_DOCUMENT_STYLE_HEADER_KEY, FALLBACK_HEADER_DEFAULT, LEGACY_FALLBACKS.header);
}

export function setOrgHeaderStyleDefault(style: LabelConfig): void {
  saveLabSetting(ORG_DOCUMENT_STYLE_HEADER_KEY, style);
}

export function getOrgFooterStyleDefault(): LabelConfig {
  return readStored(ORG_DOCUMENT_STYLE_FOOTER_KEY, FALLBACK_FOOTER_DEFAULT, LEGACY_FALLBACKS.footer);
}

export function setOrgFooterStyleDefault(style: LabelConfig): void {
  saveLabSetting(ORG_DOCUMENT_STYLE_FOOTER_KEY, style);
}
