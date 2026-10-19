// src/utils/labelStyleVars.ts
// ─────────────────────────────────────────────────────────────────────────────
// A report template's label formatting (LabelConfig: case, weight,
// underline, size, font) as CSS custom properties, for screens that show
// a label outside the report preview (OrchestratorSectionEditor's specimen
// section titles). The consuming CSS rule reads --label-* with the
// element's normal look as each fallback, so only configured values
// change anything. Batch 338 (replaces an inline style={labelStyle(…)}).
//
// Batch 367 (PS-74): `prefix` names the properties (--<prefix>-size, …), so
// nested elements each read their own: the report preview's page, header,
// footer, section headings and field labels, and the label-style previews
// in Document Style and Template Assembly. Custom properties inherit, so
// one shared name would leak a page's settings into its headings.
// ─────────────────────────────────────────────────────────────────────────────

import type React from 'react';
import type { FontUnits, LabelConfig } from '@/types/template';
import { previewFontSize, unitsOf } from '@/services/reportAppearance/fontUnits';

// Batch 612: the size is drawn in CSS points when the style (or its template, `templateUnits`) is
// in points, so the screen is the size the paper will be; a legacy style stays in pixels.
export function labelStyleVars(cfg?: Partial<LabelConfig>, prefix = 'label', templateUnits?: FontUnits, extraVars?: Record<string, string>): React.CSSProperties {
  const vars: Record<string, string> = { ...(extraVars ?? {}) };
  if (cfg?.transform && cfg.transform !== 'none') vars[`--${prefix}-transform`] = cfg.transform;
  if (cfg?.weight) vars[`--${prefix}-weight`] = cfg.weight === 'bold' ? '700' : '400';
  if (cfg?.decoration && cfg.decoration !== 'none') vars[`--${prefix}-decoration`] = cfg.decoration;
  const size = previewFontSize(cfg?.fontSize, unitsOf(cfg, templateUnits));
  if (size) vars[`--${prefix}-size`] = size;
  if (cfg?.fontFamily) vars[`--${prefix}-family`] = cfg.fontFamily;
  return vars as React.CSSProperties;
}
