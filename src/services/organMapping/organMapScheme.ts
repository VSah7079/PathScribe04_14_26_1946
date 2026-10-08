// src/services/organMapping/organMapScheme.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 461 (Pete: "sites configure the colours and patterns as they could be
// different across jurisdictions"). Each category (benign, Grade Group 1, 2,
// 3 and above, not sampled) and each overlay (extraprostatic extension,
// positive margin) has a colour, a pattern and optionally the site's own
// legend wording. A pattern always goes with the colour (WCAG 2.1 AA, black-
// and-white print): 'none' is allowed only for benign and not sampled.
//
// Resolution: facility override → its jurisdiction's → the enterprise's →
// PathScribe's built-in scheme, per style key (a facility can change one
// colour and inherit the rest). Pure; the service below stores the layers.
//
// Batch 462: breast categories (invasive, DCIS, calcifications; margin clear,
// close, positive) and thresholds layered the same way (the breast close
// margin, 2 mm unless a site sets another).
//
// Batch 464: colorectal (adenoma; adenoma at a polyp's lateral margin) and two
// more thresholds, each a distance with an operator: the malignant-polyp
// involved margin and the rectal CRM (1.0 mm, ≤, unless a site sets another).
// ─────────────────────────────────────────────────────────────────────────────

import { MAP_PATTERNS, MAP_STYLE_KEYS, type MapStyle, type MapStyleKey, type OrganMapScheme } from './organMapTypes';

export const BUILT_IN_ORGAN_MAP_SCHEME: OrganMapScheme = {
  benign:         { colour: '#e5e7eb', pattern: 'none' },
  notSampled:     { colour: '#f8fafc', pattern: 'none' },
  tumour:         { colour: '#fca5a5', pattern: 'solid' },
  gg1:            { colour: '#fde68a', pattern: 'dots' },
  gg2:            { colour: '#f59e0b', pattern: 'hatch' },
  ggHigh:         { colour: '#b91c1c', pattern: 'crosshatch' },
  epe:            { colour: '#7c3aed', pattern: 'hatch' },
  positiveMargin: { colour: '#1d4ed8', pattern: 'crosshatch' },
  // Batch 462: breast (spec: DCIS "orange tint + stipple", invasive "dark red").
  invasive:       { colour: '#b91c1c', pattern: 'solid' },
  dcis:           { colour: '#fdba74', pattern: 'dots' },
  calcifications: { colour: '#94a3b8', pattern: 'dots' },
  marginClear:    { colour: '#bbf7d0', pattern: 'solid' },
  marginClose:    { colour: '#fbbf24', pattern: 'hatch' },
  marginPositive: { colour: '#1d4ed8', pattern: 'crosshatch' },
  // Batch 463: Mohs (spec: residual tumour "red fill + hatch").
  residualTumour: { colour: '#dc2626', pattern: 'hatch' },
  perineural:     { colour: '#7c3aed', pattern: 'dots' },
  // Batch 464: colorectal polyp (the adenomatous lesion; adenoma reaching the lateral margin).
  adenoma:         { colour: '#93c5fd', pattern: 'dots' },
  adenomaAtMargin: { colour: '#0369a1', pattern: 'hatch' },
  // Batch 465: head and neck (dysplasia at a mucosal margin; ENE minor and major).
  dysplasiaAtMargin: { colour: '#a16207', pattern: 'dots' },
  // Overlays are drawn over a white halo, so each outline keeps its contrast on any fill (the review found ENE on
  // metastasis red, and dysplasia on an involved-margin blue, below 3:1 without it).
  eneMinor:          { colour: '#ea580c', pattern: 'hatch' },
  eneMajor:          { colour: '#111827', pattern: 'crosshatch' },
};

/** How a distance is compared with an "involved" threshold (Batch 464, Pete:
 *  LESS_THAN_OR_EQUAL, LESS_THAN, EQUAL_TO). */
export type MarginOperator = 'lte' | 'lt' | 'eq';
export const MARGIN_OPERATORS: readonly MarginOperator[] = ['lte', 'lt', 'eq'];

/** Batch 462 (Pete: the close-margin threshold is set per site, 2 mm by default).
 *  Layered like the colours. Batch 464 (Pete): the malignant-polyp involved
 *  margin, 1.0 mm with ≤ by default, a site-level setting (never per user);
 *  the rectal circumferential margin (CRM) the same way. */
export interface OrganMapThresholds {
  /** A breast margin nearer than this (mm), but not on ink, is "close". */
  breastCloseMarginMm: number;
  /** MalignantPolyp_InvolvedMargin_Threshold_mm and its operator. */
  polypInvolvedMarginMm: number;
  polypInvolvedMarginOperator: MarginOperator;
  /** The rectal CRM is involved at this distance (mm), by its operator. */
  rectalCrmInvolvedMm: number;
  rectalCrmInvolvedOperator: MarginOperator;
  /** Batch 465 (Pete: RCPath convention): an oral cavity margin is involved below 1 mm and close from 1 to 5 mm
   *  (clear beyond 5 mm), each a distance and an operator. */
  oralInvolvedMarginMm: number;
  oralInvolvedMarginOperator: MarginOperator;
  oralCloseMarginMm: number;
  oralCloseMarginOperator: MarginOperator;
  /** Batch 466 (Pete: Renal_Parenchymal_Involved_Threshold_mm, Renal_SoftTissue_Involved_Threshold_mm): a renal
   *  parenchymal margin (partial nephrectomy) and soft tissue margin (radical) are involved at this distance by
   *  the operator — 0.0 mm with "=" (on ink) by default; set per site. */
  renalParenchymalInvolvedMm: number;
  renalParenchymalInvolvedOperator: MarginOperator;
  renalSoftTissueInvolvedMm: number;
  renalSoftTissueInvolvedOperator: MarginOperator;
}
export type NumericThresholdKey = 'breastCloseMarginMm' | 'polypInvolvedMarginMm' | 'rectalCrmInvolvedMm' | 'oralInvolvedMarginMm' | 'oralCloseMarginMm' | 'renalParenchymalInvolvedMm' | 'renalSoftTissueInvolvedMm';
export type OperatorThresholdKey = 'polypInvolvedMarginOperator' | 'rectalCrmInvolvedOperator' | 'oralInvolvedMarginOperator' | 'oralCloseMarginOperator' | 'renalParenchymalInvolvedOperator' | 'renalSoftTissueInvolvedOperator';
export const BUILT_IN_ORGAN_MAP_THRESHOLDS: OrganMapThresholds = {
  breastCloseMarginMm: 2,
  polypInvolvedMarginMm: 1, polypInvolvedMarginOperator: 'lte',
  rectalCrmInvolvedMm: 1, rectalCrmInvolvedOperator: 'lte',
  oralInvolvedMarginMm: 1, oralInvolvedMarginOperator: 'lt',
  oralCloseMarginMm: 5, oralCloseMarginOperator: 'lte',
  renalParenchymalInvolvedMm: 0, renalParenchymalInvolvedOperator: 'eq',
  renalSoftTissueInvolvedMm: 0, renalSoftTissueInvolvedOperator: 'eq',
};
export const THRESHOLD_LIMITS: Record<NumericThresholdKey, { min: number; max: number }> = {
  breastCloseMarginMm: { min: 0.1, max: 10 },
  polypInvolvedMarginMm: { min: 0, max: 10 },
  rectalCrmInvolvedMm: { min: 0, max: 10 },
  oralInvolvedMarginMm: { min: 0, max: 10 },
  oralCloseMarginMm: { min: 0, max: 20 },
  renalParenchymalInvolvedMm: { min: 0, max: 10 },
  renalSoftTissueInvolvedMm: { min: 0, max: 10 },
};
/** The thresholds as the configuration screen shows them: a number, and the operator that goes with it. */
export const THRESHOLD_ROWS: readonly { key: NumericThresholdKey; operator?: OperatorThresholdKey }[] = [
  { key: 'breastCloseMarginMm' },
  { key: 'polypInvolvedMarginMm', operator: 'polypInvolvedMarginOperator' },
  { key: 'rectalCrmInvolvedMm', operator: 'rectalCrmInvolvedOperator' },
  { key: 'oralInvolvedMarginMm', operator: 'oralInvolvedMarginOperator' },
  { key: 'oralCloseMarginMm', operator: 'oralCloseMarginOperator' },
  { key: 'renalParenchymalInvolvedMm', operator: 'renalParenchymalInvolvedOperator' },
  { key: 'renalSoftTissueInvolvedMm', operator: 'renalSoftTissueInvolvedOperator' },
];
const isOperatorKey = (k: keyof OrganMapThresholds): k is OperatorThresholdKey => k.endsWith('Operator');

/** Batch 464: whether a margin at this distance (mm) is involved by the site's
 *  rule. A negative or missing distance is not a distance (undefined). */
export function marginInvolved(distanceMm: number | undefined, thresholdMm: number, operator: MarginOperator): boolean | undefined {
  if (distanceMm === undefined || !Number.isFinite(distanceMm) || distanceMm < 0) return undefined;
  // Carcinoma on ink is involved whatever the rule (review: "=" or "<" alone could call 0 mm clear).
  if (distanceMm === 0) return true;
  if (operator === 'lt') return distanceMm < thresholdMm;
  if (operator === 'eq') return distanceMm === thresholdMm;
  return distanceMm <= thresholdMm;
}

export type PartialScheme = Partial<Record<MapStyleKey, Partial<MapStyle>>> & { thresholds?: Partial<OrganMapThresholds> };
export interface OrganMapSchemeLayers {
  enterprise?: PartialScheme;
  jurisdictions?: Record<string, PartialScheme>;
  facilities?: Record<string, PartialScheme>;
}
export type OrganMapSchemeSource = 'builtIn' | 'enterprise' | 'jurisdiction' | 'facility';

export interface ResolvedOrganMapScheme {
  scheme: OrganMapScheme;
  /** Which layer set each key. */
  sources: Record<MapStyleKey, OrganMapSchemeSource>;
  /** Batch 462: the thresholds the maps judge by, and which layer set each. */
  thresholds: OrganMapThresholds;
  thresholdSources: Record<keyof OrganMapThresholds, OrganMapSchemeSource>;
}

export function resolveOrganMapScheme(layers: OrganMapSchemeLayers, where: { facilityId?: string | null; jurisdiction?: string | null }): ResolvedOrganMapScheme {
  const scheme = {} as OrganMapScheme;
  const sources = {} as Record<MapStyleKey, OrganMapSchemeSource>;
  const ordered: [OrganMapSchemeSource, PartialScheme | undefined][] = [
    ['enterprise', layers.enterprise],
    ['jurisdiction', where.jurisdiction ? layers.jurisdictions?.[where.jurisdiction] : undefined],
    ['facility', where.facilityId ? layers.facilities?.[where.facilityId] : undefined],
  ];
  for (const key of MAP_STYLE_KEYS) {
    let style: MapStyle = { ...BUILT_IN_ORGAN_MAP_SCHEME[key] };
    let source: OrganMapSchemeSource = 'builtIn';
    for (const [layer, partial] of ordered) {
      const p = partial?.[key];
      if (p && Object.keys(p).length) { style = { ...style, ...p }; source = layer; }
    }
    scheme[key] = style;
    sources[key] = source;
  }
  const thresholds = { ...BUILT_IN_ORGAN_MAP_THRESHOLDS };
  const thresholdSources = {} as Record<keyof OrganMapThresholds, OrganMapSchemeSource>;
  for (const key of Object.keys(BUILT_IN_ORGAN_MAP_THRESHOLDS) as (keyof OrganMapThresholds)[]) {
    thresholdSources[key] = 'builtIn';
    for (const [layer, partial] of ordered) {
      const v = partial?.thresholds?.[key];
      // A stored value outside what the screen allows is ignored (the layer below stands).
      const limits = isOperatorKey(key) ? undefined : THRESHOLD_LIMITS[key as NumericThresholdKey];
      const ok = isOperatorKey(key) ? MARGIN_OPERATORS.includes(v as MarginOperator) : typeof v === 'number' && Number.isFinite(v) && (!limits || (v >= limits.min && v <= limits.max));
      if (ok) { (thresholds as Record<string, unknown>)[key] = v; thresholdSources[key] = layer; }
    }
  }
  return { scheme, sources, thresholds, thresholdSources };
}

export type OrganMapSchemeProblem = { key: MapStyleKey | keyof OrganMapThresholds; problem: 'colour' | 'pattern' | 'patternRequired' | 'label' | 'threshold' | 'operator' | 'equalsNeedsZero' | 'closeBelowInvolved' };

/** Batch 464: what a threshold problem's message needs (the key's limits, for a number). */
export const thresholdProblemValues = (key: keyof OrganMapThresholds) =>
  (THRESHOLD_LIMITS as Record<string, { min: number; max: number } | undefined>)[key] ?? {};
export const isThresholdProblem = (p: OrganMapSchemeProblem) => p.problem === 'threshold' || p.problem === 'operator' || p.problem === 'equalsNeedsZero' || p.problem === 'closeBelowInvolved';

/** What stops a layer being saved. Batch 465: with `inherited` (what the layer inherits), a threshold the
 *  layer sets is checked together with the values it doesn't set ("=" against an inherited distance; an oral
 *  close distance against an inherited involved one). */
export function validateOrganMapScheme(partial: PartialScheme, inherited?: OrganMapThresholds): OrganMapSchemeProblem[] {
  const problems: OrganMapSchemeProblem[] = [];
  const own = partial.thresholds ?? {};
  const merged: Partial<OrganMapThresholds> = { ...(inherited ?? {}), ...own };
  for (const [key, limits] of Object.entries(THRESHOLD_LIMITS) as [NumericThresholdKey, { min: number; max: number }][]) {
    const v = partial.thresholds?.[key];
    if (v !== undefined && !(typeof v === 'number' && Number.isFinite(v) && v >= limits.min && v <= limits.max)) problems.push({ key, problem: 'threshold' });
  }
  for (const row of THRESHOLD_ROWS) {
    const v = row.operator ? partial.thresholds?.[row.operator] : undefined;
    if (row.operator && v !== undefined && !MARGIN_OPERATORS.includes(v)) problems.push({ key: row.operator, problem: 'operator' });
    // "=" means "on ink only": it goes with 0 mm (with any other distance, a nearer carcinoma would be called clear).
    else if (row.operator && (own[row.operator] !== undefined || own[row.key] !== undefined) && merged[row.operator] === 'eq' && (merged[row.key] ?? 0) !== 0) problems.push({ key: row.operator, problem: 'equalsNeedsZero' });
  }
  // Batch 465: an oral margin is close further out than it is involved (checked whenever the layer sets either).
  // Batch 465b (Pete): strictly — the involved distance must be below the close distance.
  const oi = merged.oralInvolvedMarginMm; const oc = merged.oralCloseMarginMm;
  if ((own.oralInvolvedMarginMm !== undefined || own.oralCloseMarginMm !== undefined) && typeof oi === 'number' && typeof oc === 'number' && oc <= oi) problems.push({ key: 'oralCloseMarginMm', problem: 'closeBelowInvolved' });
  for (const [key, style] of Object.entries(partial) as [MapStyleKey, Partial<MapStyle>][]) {
    if (!MAP_STYLE_KEYS.includes(key) || !style) continue;
    if (style.colour !== undefined && !/^#[0-9a-f]{6}$/i.test(style.colour)) problems.push({ key, problem: 'colour' });
    if (style.pattern !== undefined && !MAP_PATTERNS.includes(style.pattern)) problems.push({ key, problem: 'pattern' });
    // Colour is never the only signal for tumour, EPE or margin.
    if (style.pattern === 'none' && key !== 'benign' && key !== 'notSampled') problems.push({ key, problem: 'patternRequired' });
    if (style.label !== undefined && style.label.trim().length > 40) problems.push({ key, problem: 'label' });
  }
  return problems;
}

/** The scheme as CSS custom properties for the map's container (rule 1:
 *  the drawing's classes read these; nothing is coloured in JSX). */
export function organMapSchemeVars(scheme: OrganMapScheme): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const key of MAP_STYLE_KEYS) vars[`--organmap-${key}`] = scheme[key].colour;
  return vars;
}

/** Audit detail for a change to one layer (literal English). Null when nothing changed. */
export function organMapSchemeChangeDetail(scope: string, before: PartialScheme | undefined, after: PartialScheme | undefined): string | null {
  const parts: string[] = [];
  for (const key of MAP_STYLE_KEYS) {
    const b = before?.[key] ?? {}; const a = after?.[key] ?? {};
    for (const f of ['colour', 'pattern', 'label'] as const) {
      if ((b[f] ?? '') !== (a[f] ?? '')) parts.push(`${key}.${f}: ${b[f] ?? '(inherited)'} → ${a[f] ?? '(inherited)'}`);
    }
  }
  for (const key of Object.keys(BUILT_IN_ORGAN_MAP_THRESHOLDS) as (keyof OrganMapThresholds)[]) {
    const b = before?.thresholds?.[key]; const a = after?.thresholds?.[key];
    if (b !== a) parts.push(`${key}: ${b ?? '(inherited)'} → ${a ?? '(inherited)'}`);
  }
  return parts.length ? `Organ map colours (${scope}): ${parts.join('; ')}` : null;
}
