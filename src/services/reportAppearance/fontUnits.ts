// src/services/reportAppearance/fontUnits.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 612 (Pete, Oct 18, 2026: "7.5 is really too small"): report font sizes
// are in points, the size they print at. A "10" prints at 10 pt, as it does in
// Word.
//
// Before this, the size in Document Style and in a template's own style was in
// CSS pixels, so a "10" printed at 7.5 pt (1 px = 0.75 pt). Existing styles and
// templates are not rewritten behind anyone's back. Each style (and each
// template) carries `units`:
//   • "pt"         the number is points; nothing prints below 8 pt
//   • "legacy_px"  the number is pixels, as saved before Batch 612; prints as it
//                  always did (1 px = 0.75 pt, floor 7 pt)
//   • missing      the same as "legacy_px"
// A style with no units of its own takes its template's (ReportTemplate.fontUnits).
// An author converts a legacy template or the lab's styles with "Convert to
// points": the numbers are kept and now mean points, so a 10 prints at 10 pt
// (not 7.5), and the screen shows what will print.
//
// The Python renderers (functions/report_layout.py) apply the same rules; this
// file is the browser side: the preview size, the "prints at" note and the
// conversion. Pure, no storage and no React.
// ─────────────────────────────────────────────────────────────────────────────

import type { FontUnits, LabelConfig } from '../../types/template';

export const FONT_UNITS: readonly FontUnits[] = ['pt', 'legacy_px'];
export const DEFAULT_FONT_UNITS: FontUnits = 'legacy_px';
/** The smallest size that prints, in points, for a style in points. */
export const MIN_FONT_PT = 8;
/** The smallest size that prints for a legacy (pixel) style. */
export const MIN_LEGACY_FONT_PT = 7;
/** CSS pixels per CSS point: 96 per inch / 72 per inch. */
export const PX_PER_PT = 96 / 72;
/** Points per CSS pixel, the factor a legacy size printed with. */
export const PT_PER_PX = 0.75;

export type StyleCategory = 'header' | 'body' | 'footer';
export const STYLE_CATEGORIES: readonly StyleCategory[] = ['header', 'body', 'footer'];

const isUnits = (value: unknown): value is FontUnits => value === 'pt' || value === 'legacy_px';

/** The units a size is in: the style's own, else the template's, else legacy pixels. */
export function unitsOf(config?: Pick<LabelConfig, 'units'> | null, templateUnits?: FontUnits | null): FontUnits {
  if (config && isUnits(config.units)) return config.units;
  return isUnits(templateUnits) ? templateUnits : DEFAULT_FONT_UNITS;
}

/** The points a size prints at (same rules as the report renderer). Null when there is no usable size. */
export function printedPoints(size: number | undefined, units: FontUnits): number | null {
  if (typeof size !== 'number' || !Number.isFinite(size) || size < 4 || size > 72) return null;
  if (units === 'pt') return Math.max(MIN_FONT_PT, Math.round(size * 100) / 100);
  return Math.max(MIN_LEGACY_FONT_PT, Math.round(size * PT_PER_PX * 100) / 100);
}

/** The CSS size the preview draws a size at, so the screen matches the paper (CSS points are 1/72 inch). */
export function previewFontSize(size: number | undefined, units: FontUnits): string | undefined {
  if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) return undefined;
  return units === 'pt' ? `${Math.max(MIN_FONT_PT, size)}pt` : `${size}px`;
}

/** The text of the "prints at" note: the number of points, e.g. "7.5". Null when unknown. */
export function printedPointsText(size: number | undefined, units: FontUnits): string | null {
  const points = printedPoints(size, units);
  return points === null ? null : String(points);
}

// ── Convert to points ────────────────────────────────────────────────────────

export interface StyleSizeChange {
  category: StyleCategory;
  /** The size as saved, in pixels. */
  fromSize: number;
  /** What it printed at, in points. */
  fromPoints: number;
  /** The size after converting, in points (the number is kept; at least 8). */
  toSize: number;
  /** True when the number had to be raised to the 8 pt floor. */
  raisedToFloor: boolean;
}

export interface PointsConversionPlan {
  /** The sizes that change. Empty when nothing needs converting. */
  changes: StyleSizeChange[];
  /** True when the subject is already in points (nothing to do). */
  alreadyPoints: boolean;
}

interface StylesOf { documentStyle?: Partial<Record<StyleCategory, LabelConfig>>; fontUnits?: FontUnits }

/** The styles that carry a size of their own, and what converting would do to each. */
export function planPointsConversion(subject: StylesOf, fallbackSizes: Partial<Record<StyleCategory, number>> = {}): PointsConversionPlan {
  const changes: StyleSizeChange[] = [];
  for (const category of STYLE_CATEGORIES) {
    const config = subject.documentStyle?.[category];
    if (!config) continue;
    if (unitsOf(config, subject.fontUnits) === 'pt') continue;
    const size = typeof config.fontSize === 'number' ? config.fontSize : fallbackSizes[category];
    if (typeof size !== 'number') continue;
    const fromPoints = printedPoints(size, 'legacy_px');
    if (fromPoints === null) continue;
    const toSize = Math.max(MIN_FONT_PT, size);
    changes.push({ category, fromSize: size, fromPoints, toSize, raisedToFloor: toSize !== size });
  }
  const alreadyPoints = subject.fontUnits === 'pt' && changes.length === 0;
  return { changes, alreadyPoints };
}

/** The styles after converting: every legacy style keeps its number, now in points (at least 8), and the
 *  template is marked "pt". A style that already is in points is left alone. Pure: returns new objects. */
export function applyPointsConversion<T extends StylesOf>(subject: T): T & { fontUnits: FontUnits } {
  const documentStyle: Partial<Record<StyleCategory, LabelConfig>> = { ...(subject.documentStyle ?? {}) };
  for (const category of STYLE_CATEGORIES) {
    const config = documentStyle[category];
    if (!config) continue;
    if (unitsOf(config, subject.fontUnits) === 'pt') { documentStyle[category] = { ...config, units: 'pt' }; continue; }
    const size = typeof config.fontSize === 'number' ? Math.max(MIN_FONT_PT, config.fontSize) : config.fontSize;
    documentStyle[category] = { ...config, fontSize: size, units: 'pt' };
  }
  return { ...subject, documentStyle, fontUnits: 'pt' as const };
}

/** A plain-English line for the audit trail: which sizes changed. Never any case or patient data. */
export function conversionAuditSummary(plan: PointsConversionPlan): string {
  if (plan.changes.length === 0) return 'no sizes needed changing';
  return plan.changes.map(c => `${c.category} ${c.fromSize} px (printed ${c.fromPoints} pt) -> ${c.toSize} pt`).join('; ');
}
