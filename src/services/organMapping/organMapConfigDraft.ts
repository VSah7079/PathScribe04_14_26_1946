// src/services/organMapping/organMapConfigDraft.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 461: the edits behind Configuration → Organ maps, as pure functions,
// so the screen only renders and dispatches.
// • Colours & patterns: one layer (enterprise, a jurisdiction, a facility)
//   holds only what it overrides; everything else is inherited from the layer
//   above (facility ← jurisdiction ← enterprise ← PathScribe's built-in).
// • Map bindings: a lab's own synoptic questions, and what each answer means
//   on the map (Pete: "PathScribe questions + bindings"). The map data still
//   comes only from the synoptic answers.
// ─────────────────────────────────────────────────────────────────────────────

import { DERIVED_KEYS, MARGIN_STATUS_VALUES, componentOfKey, derivedKeysFor, isStatusKey, marginKeysFor, marginKeysOfComponent, PRECURSOR_OF, type DerivedKey } from './organMapDerived';
import { PROSTATE_BIOPSY_SITES, PROSTATE_PIRADS_SECTORS } from './prostateSectors';
import { THRESHOLD_ROWS, type NumericThresholdKey, type OrganMapSchemeLayers, type OrganMapThresholds, type PartialScheme } from './organMapScheme';
import { inheritedOrganMapResolution, organMapThresholdConflicts, schemeLayerOf, type OralThresholdConflict, type OrganMapSchemeScope } from './organMapConfig';
export { organMapThresholdConflicts, type OralThresholdConflict };
import {
  allowedBindingValues, pathScribeDefaultBinding, bindingNeedsMarginReview, upgradeStoredBinding, CHOICE_FIELD_TYPES, FIELD_INPUT_SPECS, isFieldInputsMap, NUMBER_FIELD_TYPES,
  type FieldInputsBinding, type FieldInputSpec, BREAST_CLOCK_VALUES, BREAST_FACE_VALUES, BREAST_FOCUS_TYPES, type BreastClockBinding, type MohsStagesBinding,
  bindingInputFieldIds, type ChoiceBinding, ENE_VALUES, NECK_LEVEL_IDS, type NeckDissectionBinding, type OrganMapBinding, type ProstateBiopsyBinding, type ProstateSectorsBinding, type SectorsInput,
} from './organMapBindings';
import { organMapFingerprint, resolveOrganMap } from './resolveProstateMap';
import type { MapStyle, MapStyleKey, OrganMapPayload, OrganMapScheme, OrganMapSector, OrganMapType } from './organMapTypes';
import { MAP_CATEGORIES, MAP_OVERLAYS, MAP_STYLE_KEYS } from './organMapTypes';

// ── Colours & patterns ──────────────────────────────────────────────────────

/** What a layer inherits: the built-in scheme with the layers above it. */
export function inheritedOrganMapScheme(layers: OrganMapSchemeLayers, scope: OrganMapSchemeScope, facilityJurisdiction?: string | null): OrganMapScheme {
  return inheritedResolution(layers, scope, facilityJurisdiction).scheme;
}

const inheritedResolution = inheritedOrganMapResolution;

/** Batch 462: the thresholds a layer inherits (the close-margin distance). */
export function inheritedOrganMapThresholds(layers: OrganMapSchemeLayers, scope: OrganMapSchemeScope, facilityJurisdiction?: string | null): OrganMapThresholds {
  return inheritedResolution(layers, scope, facilityJurisdiction).thresholds;
}

/** Sets a threshold (a number, or Batch 464 an operator) at this layer, or (undefined) inherits it again. */
export function withThreshold<K extends keyof OrganMapThresholds>(draft: PartialScheme, key: K, value: OrganMapThresholds[K] | undefined): PartialScheme {
  const thresholds: Partial<OrganMapThresholds> = { ...(draft.thresholds ?? {}) };
  if (value === undefined) delete thresholds[key]; else thresholds[key] = value;
  const next = { ...draft };
  if (Object.keys(thresholds).length) next.thresholds = thresholds; else delete next.thresholds;
  return next;
}

/** Batch 464: a threshold row (a distance and its operator, if any) overridden at this layer
 *  from what it inherits, or given back. */
export function withThresholdRow(draft: PartialScheme, row: (typeof THRESHOLD_ROWS)[number], inherited: OrganMapThresholds): PartialScheme {
  const next = withThreshold(draft, row.key, inherited[row.key]);
  return row.operator ? withThreshold(next, row.operator, inherited[row.operator]) : next;
}
export function withoutThresholdRow(draft: PartialScheme, row: (typeof THRESHOLD_ROWS)[number]): PartialScheme {
  const next = withThreshold(draft, row.key, undefined);
  return row.operator ? withThreshold(next, row.operator, undefined) : next;
}
/** The hint's key for a threshold (breastCloseMarginMm → breastCloseMarginHint). */
export const thresholdHintKey = (key: NumericThresholdKey) => key.replace(/Mm$/, 'Hint');

/** The thresholds the layer would give. */
export const draftThresholds = (inherited: OrganMapThresholds, draft: PartialScheme): OrganMapThresholds => ({ ...inherited, ...(draft.thresholds ?? {}) });

/** The layer being edited (a copy). */
export const schemeDraftOf = (layers: OrganMapSchemeLayers, scope: OrganMapSchemeScope): PartialScheme =>
  JSON.parse(JSON.stringify(schemeLayerOf(layers, scope) ?? {}));

/** Starts overriding a key at this layer, from what it inherits. */
export function withSchemeOverride(draft: PartialScheme, key: MapStyleKey, inherited: OrganMapScheme): PartialScheme {
  return { ...draft, [key]: { colour: inherited[key].colour, pattern: inherited[key].pattern } };
}

/** Stops overriding a key (back to inherited). */
export function withoutSchemeOverride(draft: PartialScheme, key: MapStyleKey): PartialScheme {
  const next = { ...draft };
  delete next[key];
  return next;
}

/** Changes one value of an overridden key; an empty legend wording means the default wording. */
export function withSchemeValue(draft: PartialScheme, key: MapStyleKey, change: Partial<MapStyle>): PartialScheme {
  const merged: Partial<MapStyle> = { ...(draft[key] ?? {}), ...change };
  if (merged.label !== undefined && merged.label.trim() === '') delete merged.label;
  return { ...draft, [key]: merged };
}

/** The scheme the layer would give (for the preview). */
export function draftScheme(inherited: OrganMapScheme, draft: PartialScheme): OrganMapScheme {
  const out = {} as OrganMapScheme;
  for (const key of MAP_STYLE_KEYS) out[key] = { ...inherited[key], ...(draft[key] ?? {}) };
  return out;
}

export const schemeDraftDirty = (draft: PartialScheme, saved: PartialScheme | undefined) =>
  JSON.stringify(draft) !== JSON.stringify(saved ?? {});

/** A sample map showing every colour and pattern, for the preview. */
export function organMapSchemePreview(scheme: OrganMapScheme): OrganMapPayload {
  const sample: Record<string, MapStyleKey[]> = {
    r_base_pzpl: ['gg2', 'epe'], r_mid_pzpl: ['gg2', 'positiveMargin'], r_mid_pzpm: ['gg1'],
    l_mid_pza: ['ggHigh'], l_apex_pzpl: ['ggHigh', 'epe'], r_apex_tza: ['tumour'], l_sv: ['ggHigh'],
    us: ['notSampled'],
  };
  const sectors: OrganMapSector[] = PROSTATE_PIRADS_SECTORS.map(s => {
    const keys = sample[s.id] ?? ['benign'];
    const category = (keys.find(k => (MAP_CATEGORIES as readonly string[]).includes(k)) ?? 'benign') as OrganMapSector['category'];
    const overlays = keys.filter(k => (MAP_OVERLAYS as readonly string[]).includes(k)) as ('epe' | 'positiveMargin')[];
    return { id: s.id, category, pattern: scheme[category].pattern, overlays: overlays.map(key => ({ key, pattern: scheme[key].pattern })) };
  });
  return {
    mapType: 'prostateSectors', templateId: '', instanceId: 'preview', sectors, hasData: true,
    legend: MAP_STYLE_KEYS.map(key => ({ key, kind: (MAP_OVERLAYS as readonly string[]).includes(key) ? 'overlay' as const : 'category' as const, pattern: scheme[key].pattern, ...(scheme[key].label ? { label: scheme[key].label } : {}) })),
    fingerprint: organMapFingerprint(sectors),
  };
}

/** Batch 462: a sample breast map with the layer's colours and close-margin
 *  threshold (a 1.5 mm margin turns close or clear as the threshold changes). */
export function organMapBreastPreview(scheme: OrganMapScheme, thresholds: OrganMapThresholds): OrganMapPayload {
  const clock = Object.fromEntries(BREAST_CLOCK_VALUES.map(v => [v, v]));
  const binding: BreastClockBinding = {
    mapType: 'breastClock',
    side: { fieldId: 's', values: { r: 'right' } },
    foci: { fieldId: 'f', columns: { type: 't', clock: 'c', distance: 'd', size: 'z' }, values: { type: { i: 'invasive', d: 'dcis', c: 'calcifications' }, clock } },
    margins: { fieldId: 'm', rows: Object.fromEntries(BREAST_FACE_VALUES.map(f => [f, f])), columns: { invasive: 'i', dcis: 'd' } },
  };
  const answers: Record<string, string> = {
    s: 'r',
    f__r1__t: 'i', f__r1__c: '10', f__r1__d: '4', f__r1__z: '18',
    f__r2__t: 'd', f__r2__c: '11', f__r2__d: '3', f__r2__z: '25',
    f__r3__t: 'c', f__r3__c: '10', f__r3__d: '6',
    m__superior__i: '5', m__superior__d: '1.5', m__lateral__i: '1', m__lateral__d: '3', m__posterior__i: '0',
    m__medial__i: '8', m__medial__d: '9', m__anterior__i: '2.5', m__inferior__d: '4',
  };
  return resolveOrganMap({ binding, answers, scheme, thresholds, templateId: '', instanceId: 'preview' });
}

/** Batch 463: a sample Mohs map (two stages: residual tumour, one with
 *  perineural invasion, then clear) with the layer's colours. */
export function organMapMohsPreview(scheme: OrganMapScheme): OrganMapPayload {
  const binding: MohsStagesBinding = { mapType: 'mohsStages', stagesFieldId: 'm' };
  const answers: Record<string, string | string[]> = {
    m__stages: '2',
    m__s1__positive: ['c12', 'deep'], m__s1__c12__block: 'A', m__s1__deep__block: 'B', m__s1__deep__pni: 'yes',
  };
  return resolveOrganMap({ binding, answers, scheme, templateId: '', instanceId: 'preview' });
}

// ── Map bindings ────────────────────────────────────────────────────────────

type TemplateLike = Parameters<typeof pathScribeDefaultBinding>[0] & {
  sections: { fields: { id: string; label?: string; type: string; options?: { id: string; label?: string }[]; columns?: { id: string; label?: string; type?: string; options?: { id: string; label?: string }[] }[]; rows?: { kind: string; rows?: { id: string; label: string }[] } }[] }[];
};

export type OrganMapBindingStatus = 'lab' | 'pathScribe' | 'none' | 'needsReview';

export function organMapBindingStatus(template: TemplateLike, stored: Record<string, OrganMapBinding>): OrganMapBindingStatus {
  // Batch 466d: a lab binding whose margin questions wait to be assigned per component.
  if (stored[template.id]) return bindingNeedsMarginReview(upgradeStoredBinding(template as never, stored[template.id])) ? 'needsReview' : 'lab';
  return pathScribeDefaultBinding(template) ? 'pathScribe' : 'none';
}

/** Where editing starts: the lab's binding, else PathScribe's default, else an empty one. */
export function bindingDraftOf(template: TemplateLike, stored: Record<string, OrganMapBinding>, mapType?: OrganMapType): OrganMapBinding {
  // Batch 466d: a stored binding is brought up to date first (stale margin roles dropped, PathScribe's own filled
  // in); on a map with a precursor the draft is per component, so saving it confirms the lab's assignment.
  const saved = stored[template.id];
  const current = saved ? upgradeStoredBinding(template as never, saved) : pathScribeDefaultBinding(template);
  if (current && (!mapType || current.mapType === mapType)) {
    const draft = JSON.parse(JSON.stringify(current)) as OrganMapBinding;
    if (saved && PRECURSOR_OF[draft.mapType] && draft.derived) draft.marginComponents = true;
    return draft;
  }
  return emptyOrganMapBinding(mapType ?? 'prostateSectors');
}

export function emptyOrganMapBinding(mapType: OrganMapType): OrganMapBinding {
  if (mapType === 'breastClock') return { mapType: 'breastClock' };
  if (mapType === 'mohsStages') return { mapType: 'mohsStages', stagesFieldId: '' };
  if (mapType === 'neckDissection') return { mapType: 'neckDissection' };
  if (isFieldInputsMap(mapType)) return { mapType, inputs: {} };
  return mapType === 'prostateBiopsy'
    ? { mapType, coreGrid: { fieldId: '', columns: { site: '', cancer: '', gradeGroup: '' }, values: { site: {}, cancer: {}, gradeGroup: {}, gleason: {} } } }
    : { mapType: 'prostateSectors' };
}

const fieldsOf = (t: TemplateLike) => t.sections.flatMap(s => s.fields);

/** The questions a map input can bind: choice questions for the sectors map,
 *  results grids for the biopsy map. */
export function bindableFields(template: TemplateLike, mapType: OrganMapType) {
  if (mapType === 'mohsStages') return fieldsOf(template).filter(f => f.type === 'spatialStageCanvas');
  if (mapType === 'neckDissection') return fieldsOf(template).filter(f => f.type === 'partGrid' && f.rows?.kind === 'fixed');
  if (isFieldInputsMap(mapType)) return fieldsOf(template).filter(f => CHOICE_FIELD_TYPES.includes(f.type) || NUMBER_FIELD_TYPES.includes(f.type));
  return fieldsOf(template).filter(f => (mapType === 'prostateBiopsy' ? f.type === 'partGrid' : (f.options?.length ?? 0) > 0));
}

export function withChoiceField(binding: ProstateSectorsBinding, input: SectorsInput, fieldId: string): ProstateSectorsBinding {
  const next = { ...binding };
  if (fieldId) next[input] = { fieldId, values: {} }; else delete next[input];
  return next;
}

/** Sets (or, with '', clears) what one answer means. */
export function withChoiceValue(binding: ProstateSectorsBinding, input: SectorsInput, optionId: string, value: string): ProstateSectorsBinding {
  const current: ChoiceBinding | undefined = binding[input];
  if (!current) return binding;
  const values = { ...current.values };
  if (value) values[optionId] = value; else delete values[optionId];
  return { ...binding, [input]: { ...current, values } };
}

export type CoreColumnKey = keyof ProstateBiopsyBinding['coreGrid']['columns'];
export const CORE_COLUMN_KEYS: readonly CoreColumnKey[] = ['site', 'cancer', 'gradeGroup', 'gleasonPrimary', 'gleasonSecondary', 'percent', 'length'];
export type CoreValueKind = keyof ProstateBiopsyBinding['coreGrid']['values'];

/** The meanings a mapped column's answers take. */
export function allowedCoreValues(kind: CoreValueKind): readonly string[] {
  if (kind === 'site') return PROSTATE_BIOPSY_SITES.map(s => s.id);
  if (kind === 'cancer') return ['yes', 'no'];
  if (kind === 'gradeGroup') return ['1', '2', '3', '4', '5'];
  return ['3', '4', '5'];
}

/** Which columns' answers need meanings (the others are numbers). */
export const valueKindOfColumn = (key: CoreColumnKey): CoreValueKind | null =>
  key === 'site' ? 'site' : key === 'cancer' ? 'cancer' : key === 'gradeGroup' ? 'gradeGroup' : key === 'gleasonPrimary' || key === 'gleasonSecondary' ? 'gleason' : null;

/** Chooses the grid question; its columns and meanings start again. */
export function withCoreGrid(fieldId: string): ProstateBiopsyBinding {
  const empty = emptyOrganMapBinding('prostateBiopsy') as ProstateBiopsyBinding;
  return { ...empty, coreGrid: { ...empty.coreGrid, fieldId } };
}

/** Batch 462: choosing another column also starts its meanings again (the old column's answers don't apply). */
export function withCoreColumn(binding: ProstateBiopsyBinding, key: CoreColumnKey, columnId: string): ProstateBiopsyBinding {
  const columns = { ...binding.coreGrid.columns };
  if (columnId) columns[key] = columnId;
  else if (key === 'site' || key === 'cancer' || key === 'gradeGroup') columns[key] = '';
  else delete columns[key];
  const kind = valueKindOfColumn(key);
  // Gleason meanings are shared by the primary and secondary columns: keep the other column's.
  const changed = binding.coreGrid.columns[key] !== columns[key];
  const values = kind && changed && kind !== 'gleason' ? { ...binding.coreGrid.values, [kind]: {} } : binding.coreGrid.values;
  return { ...binding, coreGrid: { ...binding.coreGrid, columns, values } };
}

export function withCoreValue(binding: ProstateBiopsyBinding, kind: CoreValueKind, optionId: string, value: string): ProstateBiopsyBinding {
  const map = { ...binding.coreGrid.values[kind] };
  if (value) map[optionId] = value; else delete map[optionId];
  return { ...binding, coreGrid: { ...binding.coreGrid, values: { ...binding.coreGrid.values, [kind]: map } } };
}

/** The values a sectors-map input may take (re-exported for the screen). */
export const allowedSectorsValues = allowedBindingValues;

/** Key order doesn't count (Batch 466c: settings added in another order are the same binding). */
const stableJson = (v: unknown): string =>
  (Array.isArray(v) ? `[${v.map(stableJson).join(',')}]`
    : v && typeof v === 'object' ? `{${Object.keys(v).filter(k => (v as Record<string, unknown>)[k] !== undefined).sort().map(k => `${JSON.stringify(k)}:${stableJson((v as Record<string, unknown>)[k])}`).join(',')}}`
      : JSON.stringify(v ?? null));
export const bindingDraftDirty = (draft: OrganMapBinding, saved: OrganMapBinding | undefined) =>
  stableJson(draft) !== stableJson(saved ?? null);

/** A save's outcome, flattened for the screen's message. */
export function organMapConfigOutcome<P>(result: { ok: boolean; reason?: string; problems?: P[]; warnings?: OralThresholdConflict[] }): { kind: 'saved' | 'notPermitted' | 'invalid'; problems: P[]; warnings?: OralThresholdConflict[] } {
  if (result.ok) return { kind: 'saved', problems: [], ...(result.warnings?.length ? { warnings: result.warnings } : {}) };
  return result.reason === 'notPermitted' ? { kind: 'notPermitted', problems: [] } : { kind: 'invalid', problems: result.problems ?? [] };
}

/** The organMapsSection.bindings.* key naming a binding problem's input (Batch 466d: a margin question by its
 *  role — the invasive carcinoma's or the precursor's — when the map type is given). */
export function bindingProblemInputKey(input: string, mapType?: OrganMapBinding['mapType']): string {
  if (mapType && input.startsWith('derived.') && (DERIVED_KEYS as readonly string[]).includes(input.slice('derived.'.length))) {
    return derivedKeyLabelKey(input.slice('derived.'.length) as DerivedKey, mapType).slice('organMapsSection.bindings.'.length);
  }
  if (input === 'stages') return 'mohs.stagesQuestion';
  if (COLORECTAL_INPUT_KEYS.has(input)) return `colorectal.inputs.${input}`;
  if (input === 'side' || input === 'foci' || input === 'margins') return `breast.inputs.${input}`;
  if (input.startsWith('foci.')) return `breast.fociColumns.${input.slice('foci.'.length)}`;
  if (input.startsWith('margins.')) return `breast.marginColumns.${input.slice('margins.'.length)}`;
  if (input.startsWith('derived.')) return input;
  if (input === 'neckGrid') return 'neck.gridQuestion';
  if (input.startsWith('neckGrid.')) return `neck.columns.${input.slice('neckGrid.'.length)}`;
  if (input === 'coreGrid') return 'gridQuestion';
  if (input.startsWith('coreGrid.')) return `columns.${input.slice('coreGrid.'.length)}`;
  return `inputs.${input}`;
}

// ── Colorectal bindings (Batch 464) ────────────────────────────────────────

const COLORECTAL_INPUT_KEYS = new Set(Object.values(FIELD_INPUT_SPECS).flatMap(specs => specs.map(s => s.key)));

/** The questions one input can bind: choice questions for a choice input, numeric (or text) ones for a number. */
export function fieldInputCandidates(template: TemplateLike, spec: FieldInputSpec) {
  return fieldsOf(template).filter(f => (spec.kind === 'choice' ? CHOICE_FIELD_TYPES : NUMBER_FIELD_TYPES).includes(f.type));
}

/** Batch 465: the locale key naming what one answer of a choice input means (the oral subsites by their names). */
export function fieldInputValueKey(mapType: string, key: string, value: string): string {
  if (mapType === 'oralCavity') return key === 'subsites' ? `organMap.headNeck.oral.sector.${value}` : `organMap.headNeck.value.${value}`;
  if (mapType === 'renalResection') return `organMap.renal.value.${key}.${value}`;
  return `organMap.colorectal.value.${value}`;
}

/** Binds an input to a question (or, with '', unbinds it); a new question starts with no meanings. */
export function withFieldInput(binding: FieldInputsBinding, spec: FieldInputSpec, fieldId: string): FieldInputsBinding {
  const inputs = { ...binding.inputs };
  if (!fieldId) delete inputs[spec.key];
  else inputs[spec.key] = spec.kind === 'choice' ? { fieldId, values: {} } : { fieldId };
  return { ...binding, inputs };
}

/** Sets (or, with '', clears) what one answer of a choice input means. */
export function withFieldInputValue(binding: FieldInputsBinding, key: string, optionId: string, value: string): FieldInputsBinding {
  const current = binding.inputs[key] as ChoiceBinding | undefined;
  if (!current || !('values' in current)) return binding;
  const values = { ...current.values };
  if (value) values[optionId] = value; else delete values[optionId];
  return { ...binding, inputs: { ...binding.inputs, [key]: { ...current, values } } };
}

/** Batch 464: sample colorectal maps with the layer's colours and rules: a pedunculated
 *  malignant polyp (Haggitt 2, stalk margin 0.8 mm — involved at ≤ 1 mm), a sessile one
 *  (sm2, adenoma at the lateral margin) and a rectal resection (CRM 1.5 mm anteriorly). */
export function organMapColorectalPreviews(scheme: OrganMapScheme, thresholds: OrganMapThresholds): OrganMapPayload[] {
  const polyp = (paris: string, depth: string, deep: string, lateral: string, adenoma: string) => resolveOrganMap({
    binding: { mapType: 'colorectalPolyp', inputs: {
      paris: { fieldId: 'p', values: { [paris]: paris } }, invasive: { fieldId: 'i', values: { y: 'yes' } },
      depth: { fieldId: 'd', values: { [depth]: depth } }, deepMarginMm: { fieldId: 'dm' }, lateralMarginMm: { fieldId: 'lm' },
      lateralAdenoma: { fieldId: 'la', values: { a: adenoma } },
    } },
    answers: { p: paris, i: 'y', d: depth, dm: deep, lm: lateral, la: 'a' }, scheme, thresholds, templateId: '', instanceId: 'preview',
  });
  const rectal = resolveOrganMap({
    binding: { mapType: 'rectalResection', inputs: {
      quadrants: { fieldId: 'q', values: { a: 'anterior', l: 'left' } }, crmMm: { fieldId: 'c' }, crmQuadrant: { fieldId: 'cq', values: { a: 'anterior' } },
      tmePlane: { fieldId: 't', values: { m: 'mesorectal' } }, reflection: { fieldId: 'r', values: { b: 'below' } }, distalMarginMm: { fieldId: 'dd' },
    } },
    answers: { q: ['a', 'l'], c: '1.5', cq: 'a', t: 'm', r: 'b', dd: '25' }, scheme, thresholds, templateId: '', instanceId: 'preview',
  });
  return [polyp('0-Ip', 'haggitt2', '0.8', '', 'absent'), polyp('0-IIa', 'sm2', '3', '2', 'present'), rectal];
}

// ── Breast bindings (Batch 462) ─────────────────────────────────────────────

export type BreastInput = 'side' | 'foci' | 'margins';

/** The questions a breast input can bind: a choice question for the side, a results grid for foci and margins. */
export function breastBindableFields(template: TemplateLike, input: BreastInput) {
  return fieldsOf(template).filter(f => (input === 'side' ? (f.options?.length ?? 0) > 0 : f.type === 'partGrid'));
}

/** A margins grid can be bound only when its rows are the template's own (one per margin). */
export const marginGridRows = (field: { rows?: { kind: string; rows?: { id: string; label?: string }[] } } | undefined): { id: string; label?: string }[] =>
  field?.rows?.kind === 'fixed' ? field.rows.rows ?? [] : [];

export const BREAST_SIDE_VALUES = ['right', 'left'] as const;
export const BREAST_TYPE_VALUES = BREAST_FOCUS_TYPES;
export { BREAST_CLOCK_VALUES, BREAST_FACE_VALUES };
export type BreastFociColumn = keyof NonNullable<BreastClockBinding['foci']>['columns'];
export const BREAST_FOCI_COLUMNS: readonly BreastFociColumn[] = ['type', 'clock', 'distance', 'size'];
export type BreastMarginColumn = keyof NonNullable<BreastClockBinding['margins']>['columns'];
export const BREAST_MARGIN_COLUMNS: readonly BreastMarginColumn[] = ['invasive', 'dcis'];

export function withBreastSide(b: BreastClockBinding, fieldId: string): BreastClockBinding {
  const next = { ...b };
  if (fieldId) next.side = { fieldId, values: {} }; else delete next.side;
  return next;
}
export function withBreastSideValue(b: BreastClockBinding, optionId: string, value: string): BreastClockBinding {
  if (!b.side) return b;
  const values = { ...b.side.values };
  if (value) values[optionId] = value; else delete values[optionId];
  return { ...b, side: { ...b.side, values } };
}
export function withBreastFoci(b: BreastClockBinding, fieldId: string): BreastClockBinding {
  const next = { ...b };
  if (fieldId) next.foci = { fieldId, columns: { type: '', clock: '' }, values: { type: {}, clock: {} } }; else delete next.foci;
  return next;
}
/** Choosing another column for type or clock starts its meanings again (the old column's answers don't apply). */
export function withBreastFociColumn(b: BreastClockBinding, key: BreastFociColumn, columnId: string): BreastClockBinding {
  if (!b.foci) return b;
  const columns = { ...b.foci.columns };
  if (columnId) columns[key] = columnId; else if (key === 'type' || key === 'clock') columns[key] = ''; else delete columns[key];
  const changed = b.foci.columns[key] !== columns[key];
  const values = (key === 'type' || key === 'clock') && changed ? { ...b.foci.values, [key]: {} } : b.foci.values;
  return { ...b, foci: { ...b.foci, columns, values } };
}
export function withBreastFociValue(b: BreastClockBinding, kind: 'type' | 'clock', optionId: string, value: string): BreastClockBinding {
  if (!b.foci) return b;
  const map = { ...b.foci.values[kind] };
  if (value) map[optionId] = value; else delete map[optionId];
  return { ...b, foci: { ...b.foci, values: { ...b.foci.values, [kind]: map } } };
}
export function withBreastMargins(b: BreastClockBinding, fieldId: string): BreastClockBinding {
  const next = { ...b };
  if (fieldId) next.margins = { fieldId, rows: {}, columns: {} }; else delete next.margins;
  return next;
}
export function withBreastMarginRow(b: BreastClockBinding, rowId: string, face: string): BreastClockBinding {
  if (!b.margins) return b;
  const rows = { ...b.margins.rows };
  if (face) rows[rowId] = face; else delete rows[rowId];
  return { ...b, margins: { ...b.margins, rows } };
}
export function withBreastMarginColumn(b: BreastClockBinding, key: BreastMarginColumn, columnId: string): BreastClockBinding {
  if (!b.margins) return b;
  const columns = { ...b.margins.columns };
  if (columnId) columns[key] = columnId; else delete columns[key];
  return { ...b, margins: { ...b.margins, columns } };
}

// ── Neck dissection bindings (Batch 465) ────────────────────────────────────

export type NeckColumn = keyof NonNullable<NeckDissectionBinding['grid']>['columns'];
export const NECK_COLUMNS: readonly NeckColumn[] = ['positive', 'examined', 'largest', 'ene'];
export { ENE_VALUES, NECK_LEVEL_IDS };

/** Chooses the levels grid; its rows, columns and ENE meanings start again (rows whose id is a level bind themselves). */
export function withNeckGrid(b: NeckDissectionBinding, fieldId: string, template?: TemplateLike): NeckDissectionBinding {
  if (!fieldId) return { mapType: 'neckDissection' };
  const rows = marginGridRows(template ? fieldsOf(template).find(f => f.id === fieldId) : undefined);
  return { ...b, grid: { fieldId, rows: Object.fromEntries(rows.filter(r => NECK_LEVEL_IDS.includes(r.id)).map(r => [r.id, r.id])), columns: { positive: '', examined: '' }, eneValues: {} } };
}
export function withNeckRow(b: NeckDissectionBinding, rowId: string, level: string): NeckDissectionBinding {
  if (!b.grid) return b;
  const rows = { ...b.grid.rows };
  if (level) rows[rowId] = level; else delete rows[rowId];
  return { ...b, grid: { ...b.grid, rows } };
}
/** Choosing another ENE column starts its meanings again (the old column's answers don't apply). */
export function withNeckColumn(b: NeckDissectionBinding, key: NeckColumn, columnId: string): NeckDissectionBinding {
  if (!b.grid) return b;
  const columns = { ...b.grid.columns };
  if (columnId) columns[key] = columnId; else if (key === 'positive' || key === 'examined') columns[key] = ''; else delete columns[key];
  const eneValues = key === 'ene' && b.grid.columns.ene !== columns.ene ? {} : b.grid.eneValues;
  return { ...b, grid: { ...b.grid, columns, eneValues } };
}
export function withNeckEneValue(b: NeckDissectionBinding, optionId: string, value: string): NeckDissectionBinding {
  if (!b.grid) return b;
  const eneValues = { ...b.grid.eneValues };
  if (value) eneValues[optionId] = value; else delete eneValues[optionId];
  return { ...b, grid: { ...b.grid, eneValues } };
}

/** Batch 465: sample head and neck maps with the layer's colours and rules: an oral tongue
 *  carcinoma (deep margin 0.6 mm — involved below 1 mm; mucosal margin 3 mm — close below
 *  5 mm, with high-grade dysplasia) and a right neck dissection (IIa with ENEma, III with ENEmi). */
export function organMapHeadNeckPreviews(scheme: OrganMapScheme, thresholds: OrganMapThresholds): OrganMapPayload[] {
  const oral = resolveOrganMap({
    binding: { mapType: 'oralCavity', inputs: {
      subsites: { fieldId: 's', values: { t: 'tongueR', f: 'floorR' } }, peripheralMarginMm: { fieldId: 'p' }, deepMarginMm: { fieldId: 'd' },
      mucosalDysplasia: { fieldId: 'y', values: { h: 'highGrade' } }, doiMm: { fieldId: 'o' },
    } },
    answers: { s: ['t', 'f'], p: '3', d: '0.6', y: 'h', o: '7' }, scheme, thresholds, templateId: '', instanceId: 'preview',
  });
  const levels = ['R_Ib', 'R_IIa', 'R_IIb', 'R_III', 'R_IV'];
  const neck = resolveOrganMap({
    binding: { mapType: 'neckDissection', grid: {
      fieldId: 'g', rows: Object.fromEntries(levels.map(l => [l, l])), columns: { positive: 'p', examined: 'e', largest: 'z', ene: 'x' },
      eneValues: { a: 'absent', mi: 'minor', ma: 'major' },
    } },
    answers: {
      g__R_Ib__p: '0', g__R_Ib__e: '4', g__R_IIa__p: '2', g__R_IIa__e: '6', g__R_IIa__z: '18', g__R_IIa__x: 'ma',
      g__R_IIb__p: '0', g__R_IIb__e: '3', g__R_III__p: '1', g__R_III__e: '5', g__R_III__z: '6', g__R_III__x: 'mi', g__R_IV__p: '0', g__R_IV__e: '7',
    },
    scheme, thresholds, templateId: '', instanceId: 'preview',
  });
  return [oral, neck];
}

/** Batch 466: sample renal maps with the layer's colours and rules: a right radical nephrectomy (upper pole,
 *  lateral, anterior; perinephric fat and renal vein; vein margin involved; soft tissue margin on ink) and a left
 *  partial nephrectomy (lower pole, posterior, limited to the kidney, 3.2 cm; parenchymal margin 0.5 mm — clear
 *  at "= 0 mm"). */
export function organMapRenalPreviews(scheme: OrganMapScheme, thresholds: OrganMapThresholds): OrganMapPayload[] {
  const v = (...vals: string[]) => Object.fromEntries(vals.map(x => [x, x]));
  const binding = { mapType: 'renalResection' as const, inputs: {
    procedure: { fieldId: 'p', values: v('partial', 'radical') }, kidney: { fieldId: 's', values: v('right', 'left') },
    poles: { fieldId: 'po', values: v('upper', 'middle', 'lower') }, halves: { fieldId: 'h', values: v('lateral', 'medial') },
    aspect: { fieldId: 'a', values: v('anterior', 'posterior') },
    extent: { fieldId: 'e', values: v('limited', 'perinephricFat', 'sinusFat', 'pelvicalyceal', 'renalVein', 'ivcBelow', 'ivcAbove', 'gerota', 'adrenal') },
    sizeCm: { fieldId: 'z' }, veinMargin: { fieldId: 'vm', values: v('involved', 'notInvolved') }, ureterMargin: { fieldId: 'um', values: v('involved', 'notInvolved') },
    softTissueMarginMm: { fieldId: 'st' }, parenchymalMarginMm: { fieldId: 'pm' },
  } };
  const map = (answers: Record<string, string | string[]>) => resolveOrganMap({ binding, answers, scheme, thresholds, templateId: '', instanceId: 'preview' });
  return [
    map({ p: 'radical', s: 'right', po: ['upper'], h: ['lateral'], a: ['anterior'], e: ['perinephricFat', 'renalVein'], z: '8.5', vm: 'involved', um: 'notInvolved', st: '0' }),
    map({ p: 'partial', s: 'left', po: ['lower'], a: ['posterior'], e: ['limited'], z: '3.2', pm: '0.5' }),
  ];
}

// ── Batch 466b: generic margin questions calculated from the map ──────────

export type { DerivedKey };
export { DERIVED_KEYS, MARGIN_STATUS_VALUES, marginKeysFor, derivedKeysFor, PRECURSOR_OF };

/** The questions a derived margin question can be: the template's choice questions that aren't map inputs and
 *  aren't another derived question (Batch 466d: one question, one role); a margins involved question lists
 *  several (checkboxes). */
export function derivedCandidates(template: TemplateLike, binding: OrganMapBinding, key?: DerivedKey) {
  const inputs = bindingInputFieldIds(binding);
  const others = new Set(DERIVED_KEYS.filter(k => k !== key).map(k => binding.derived?.[k]?.fieldId).filter(Boolean));
  return fieldsOf(template).filter(f => CHOICE_FIELD_TYPES.includes(f.type) && !inputs.has(f.id) && !others.has(f.id) && (!key || isStatusKey(key) || f.type === 'checkboxes'));
}
/** The meanings a derived question's answers can take: a status, or one of its component's margins. */
export const derivedValues = (key: DerivedKey, binding: OrganMapBinding): readonly string[] =>
  (isStatusKey(key) ? MARGIN_STATUS_VALUES : marginKeysOfComponent(binding.mapType, componentOfKey(key)));

/** Chooses (or, with '', clears) a derived question; its meanings start again. */
export function withDerivedField(binding: OrganMapBinding, key: DerivedKey, fieldId: string): OrganMapBinding {
  const derived = { ...(binding.derived ?? {}) };
  if (fieldId) derived[key] = { fieldId, values: {} }; else delete derived[key];
  const next = { ...binding, derived } as OrganMapBinding;
  if (!Object.keys(derived).length) delete next.derived;
  // Batch 466d: chosen in the per-component picker, a precursor map's margin questions are per component.
  if (next.derived && PRECURSOR_OF[next.mapType]) next.marginComponents = true;
  return next;
}
/** Sets (or, with '', clears) what one answer of a derived question means. */
export function withDerivedValue(binding: OrganMapBinding, key: DerivedKey, optionId: string, value: string): OrganMapBinding {
  const current = binding.derived?.[key];
  if (!current) return binding;
  const values = { ...current.values };
  if (value) values[optionId] = value; else delete values[optionId];
  return { ...binding, derived: { ...binding.derived, [key]: { ...current, values } } } as OrganMapBinding;
}
/** The locale key naming a derived meaning. */
export const derivedValueKey = (key: DerivedKey, mapType: string, value: string) =>
  (isStatusKey(key) ? `organMapsSection.bindings.derived.status.${value}` : `organMapsSection.bindings.derived.margin.${mapType}.${value}`);
/** Batch 466d: the locale key labelling a derived question's role — a one-component map's plain margin questions,
 *  or the invasive carcinoma's and its precursor's (adenoma, DCIS, dysplasia). */
export const derivedKeyLabelKey = (key: DerivedKey, mapType: OrganMapBinding['mapType']): string => {
  const precursor = PRECURSOR_OF[mapType];
  if (!precursor) return `organMapsSection.bindings.derived.${key}`;
  return componentOfKey(key) === 'invasive'
    ? `organMapsSection.bindings.derived.invasive.${isStatusKey(key) ? 'status' : 'involved'}`
    : `organMapsSection.bindings.derived.precursor.${precursor}.${isStatusKey(key) ? 'status' : 'involved'}`;
};
