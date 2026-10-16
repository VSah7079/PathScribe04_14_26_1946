// src/services/organMapping/organMapBindings.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 461 (Pete: "PathScribe questions + bindings"). Which synoptic
// questions, and which of their answers, feed a map.
//
// PathScribe's own map questions (the "Anatomical map (PathScribe)" section of
// the prostate templates, ids psmap_*) carry their meaning in their option ids,
// so they bind themselves — in a lab's copy of a template too, since copying
// keeps field and option ids. A lab using its own (licensed CAP) template
// binds its own questions instead, in Configuration → Organ maps: for each map
// input, the question and what each of its answers means. A stored binding
// always wins over the PathScribe default.
//
// The biopsy map reads PathScribe's "Core results" grid (a row per core); a
// lab template binds the same grid question by id.
// ─────────────────────────────────────────────────────────────────────────────

import { DERIVED_KEYS, PRECURSOR_OF, validateDerivedBindings, type DerivedMarginBindings } from './organMapDerived';
import { PROSTATE_BIOPSY_SITES, PROSTATE_SECTOR_IDS } from './prostateSectors';
import type { OrganMapType } from './organMapTypes';
import { NECK_LEVELS, NECK_SIDES, ORAL_SUBSITES } from './headNeckGeometry';

/** A choice question, and what each answer (option id) means on the map. */
export interface ChoiceBinding { fieldId: string; values: Record<string, string> }

export interface ProstateSectorsBinding {
  mapType: 'prostateSectors';
  /** Sector ids with tumour. */
  tumourSectors?: ChoiceBinding;
  /** '1'…'5'. */
  gradeGroup?: ChoiceBinding;
  /** Sector ids with extraprostatic extension. */
  epeSectors?: ChoiceBinding;
  /** Sector ids at a positive margin. */
  marginSectors?: ChoiceBinding;
  /** 'none' | 'right' | 'left' | 'bilateral'. */
  svInvasion?: ChoiceBinding;
}

export interface ProstateBiopsyBinding {
  mapType: 'prostateBiopsy';
  coreGrid: {
    fieldId: string;
    columns: { site: string; cancer: string; gradeGroup: string; gleasonPrimary?: string; gleasonSecondary?: string; percent?: string; length?: string };
    /** Option id → site id, 'yes'/'no', '1'…'5', '3'…'5'. */
    values: { site: Record<string, string>; cancer: Record<string, string>; gradeGroup: Record<string, string>; gleason: Record<string, string> };
  };
}

/** Batch 462: the breast clock map. A foci grid (a row per focus) and a
 *  margins grid (a row per oriented margin), plus the specimen's side. */
export interface BreastClockBinding {
  mapType: 'breastClock';
  /** 'right' | 'left'. */
  side?: ChoiceBinding;
  foci?: {
    fieldId: string;
    columns: { type: string; clock: string; distance?: string; size?: string };
    /** Option id → 'invasive' | 'dcis' | 'calcifications'; option id → '1'…'12' | 'central'. */
    values: { type: Record<string, string>; clock: Record<string, string> };
  };
  margins?: {
    fieldId: string;
    /** Grid row id → face ('superior' | 'inferior' | 'medial' | 'lateral' | 'anterior' | 'posterior'). */
    rows: Record<string, string>;
    /** Distance (mm) columns; 0 = on ink (positive). */
    columns: { invasive?: string; dcis?: string };
  };
}

/** Batch 463: the Mohs stage maps read one Mohs stage question (type 'spatialStageCanvas'). */
export interface MohsStagesBinding { mapType: 'mohsStages'; stagesFieldId: string }

/** Batch 464: a numeric question (a distance in mm). */
export interface NumberBinding { fieldId: string }

/** Batch 464: the colorectal maps read a set of named inputs, each a choice
 *  question (with what each answer means) or a numeric question. The inputs
 *  and their meanings are listed in FIELD_INPUT_SPECS. */
export type FieldInputsMapType = 'colorectalPolyp' | 'rectalResection' | 'oralCavity' | 'renalResection';
export interface FieldInputsBinding {
  mapType: FieldInputsMapType;
  inputs: Partial<Record<string, ChoiceBinding | NumberBinding>>;
}
export type FieldInputSpec =
  | { key: string; kind: 'choice'; values: readonly string[]; multi?: boolean }
  | { key: string; kind: 'number' };
/** Batch 466: what the renal extent question's answers mean (AJCC 8th pT compartments). */
export const RENAL_EXTENT_VALUES: readonly string[] = ['limited', 'perinephricFat', 'sinusFat', 'pelvicalyceal', 'renalVein', 'ivcBelow', 'ivcAbove', 'gerota', 'adrenal'];
export const FIELD_INPUT_SPECS: Record<FieldInputsMapType, readonly FieldInputSpec[]> = {
  colorectalPolyp: [
    { key: 'paris', kind: 'choice', values: ['0-Ip', '0-Isp', '0-Is', '0-IIa', '0-IIb', '0-IIc', '0-III'] },
    { key: 'invasive', kind: 'choice', values: ['yes', 'no'] },
    { key: 'depth', kind: 'choice', values: ['haggitt1', 'haggitt2', 'haggitt3', 'haggitt4', 'sm1', 'sm2', 'sm3'] },
    { key: 'deepMarginMm', kind: 'number' },
    { key: 'lateralMarginMm', kind: 'number' },
    { key: 'lateralAdenoma', kind: 'choice', values: ['present', 'absent'] },
  ],
  rectalResection: [
    { key: 'quadrants', kind: 'choice', values: ['anterior', 'left', 'posterior', 'right', 'circumferential'], multi: true },
    { key: 'crmMm', kind: 'number' },
    { key: 'crmQuadrant', kind: 'choice', values: ['anterior', 'left', 'posterior', 'right'] },
    { key: 'tmePlane', kind: 'choice', values: ['mesorectal', 'intramesorectal', 'muscularisPropria'] },
    { key: 'reflection', kind: 'choice', values: ['above', 'at', 'below'] },
    { key: 'distalMarginMm', kind: 'number' },
  ],
  // Batch 465: the oral cavity (subsites with tumour, margins judged by the site's involved and close rules).
  oralCavity: [
    { key: 'subsites', kind: 'choice', values: ORAL_SUBSITES, multi: true },
    { key: 'peripheralMarginMm', kind: 'number' },
    { key: 'deepMarginMm', kind: 'number' },
    { key: 'mucosalDysplasia', kind: 'choice', values: ['absent', 'lowGrade', 'highGrade'] },
    { key: 'doiMm', kind: 'number' },
  ],
  // Batch 466: the renal resection (CAP/ICCR kidney resection; Pete: compartments, poles and aspect, pT extent, the
  // three margins — vein, ureter, soft tissue, or parenchymal for a partial nephrectomy).
  renalResection: [
    { key: 'procedure', kind: 'choice', values: ['partial', 'radical'] },
    { key: 'kidney', kind: 'choice', values: ['right', 'left'] },
    { key: 'poles', kind: 'choice', values: ['upper', 'middle', 'lower'], multi: true },
    { key: 'halves', kind: 'choice', values: ['lateral', 'medial'], multi: true },
    { key: 'aspect', kind: 'choice', values: ['anterior', 'posterior'], multi: true },
    { key: 'extent', kind: 'choice', values: RENAL_EXTENT_VALUES, multi: true },
    { key: 'sizeCm', kind: 'number' },
    { key: 'veinMargin', kind: 'choice', values: ['involved', 'notInvolved'] },
    { key: 'ureterMargin', kind: 'choice', values: ['involved', 'notInvolved'] },
    { key: 'softTissueMarginMm', kind: 'number' },
    { key: 'parenchymalMarginMm', kind: 'number' },
    // Batch 466b (Pete): a partial nephrectomy's non-standard margins (a submitted segment of renal vein or ureter).
    { key: 'extraMargins', kind: 'choice', values: ['renalVein', 'ureter'], multi: true },
  ],
};
/** Batch 466: a template's own question an input binds when PathScribe's isn't there (the kidney template's
 *  tumour size). */
export const FIELD_INPUT_ALIASES: Partial<Record<FieldInputsMapType, Record<string, string>>> = { renalResection: { sizeCm: 'tumor_size_cm' } };
/** PathScribe's own question ids for these maps: `psmap_crp_<input>` (polyp), `psmap_rec_<input>` (rectal);
 *  a choice question's option ids are `<question id>_<meaning>`. */
export const FIELD_INPUT_PREFIX: Record<FieldInputsMapType, string> = { colorectalPolyp: 'psmap_crp_', rectalResection: 'psmap_rec_', oralCavity: 'psmap_oc_', renalResection: 'psmap_ren_' };
export const isFieldInputsMap = (t: OrganMapType): t is FieldInputsMapType => t === 'colorectalPolyp' || t === 'rectalResection' || t === 'oralCavity' || t === 'renalResection';
export const isFieldInputsBinding = (b: OrganMapBinding): b is FieldInputsBinding => isFieldInputsMap(b.mapType);

/** Batch 465: the neck dissection map reads a results grid with a row per level and side. */
export interface NeckDissectionBinding {
  mapType: 'neckDissection';
  grid?: {
    fieldId: string;
    /** Grid row id → the level it reports ('R_IIa', 'L_IV', …). */
    rows: Record<string, string>;
    columns: { positive: string; examined: string; largest?: string; ene?: string };
    /** ENE column option id → 'absent' | 'minor' | 'major'. */
    eneValues: Record<string, string>;
  };
}
export const NECK_LEVEL_IDS: readonly string[] = NECK_SIDES.flatMap(s => NECK_LEVELS.map(l => `${s}_${l}`));
export const ENE_VALUES: readonly string[] = ['absent', 'minor', 'major'];

/** Batch 466b: any binding may also calculate the template's generic margin questions from the map (organMapDerived.ts). */
export type OrganMapBinding = (ProstateSectorsBinding | ProstateBiopsyBinding | BreastClockBinding | MohsStagesBinding | FieldInputsBinding | NeckDissectionBinding) & {
  derived?: DerivedMarginBindings;
  /** Batch 466d: the margin questions were assigned per component (invasive carcinoma / precursor) — set when a
   *  binding for a map with a precursor is saved. A binding without it saved its one "margin status" before 466d. */
  marginComponents?: true;
};
export type SectorsInput = Exclude<keyof ProstateSectorsBinding, 'mapType'>;
export const SECTORS_INPUTS: readonly SectorsInput[] = ['tumourSectors', 'gradeGroup', 'epeSectors', 'marginSectors', 'svInvasion'];

type TemplateLike = { id: string; sections: { fields: { id: string; type: string; options?: { id: string }[]; columns?: { id: string; type?: string; options?: { id: string }[] }[]; rows?: { kind: string; rows?: { id: string }[] } }[] }[] };

const fieldsOf = (t: TemplateLike) => t.sections.flatMap(s => s.fields);
const valuesFromPrefix = (options: { id: string }[] | undefined, prefix: string) =>
  Object.fromEntries((options ?? []).filter(o => o.id.startsWith(prefix)).map(o => [o.id, o.id.slice(prefix.length)]));

/** PathScribe's own map questions bind themselves (null when the template has none). */
export function pathScribeDefaultBinding(template: TemplateLike): OrganMapBinding | null {
  const fields = fieldsOf(template);
  const byId = (id: string) => fields.find(f => f.id === id);
  const grid = byId('psmap_core_results');
  if (grid?.type === 'partGrid') {
    const col = (id: string) => grid.columns?.find(c => c.id === id)?.options;
    return {
      mapType: 'prostateBiopsy',
      coreGrid: {
        fieldId: grid.id,
        columns: { site: 'site', cancer: 'cancer', gradeGroup: 'grade_group', gleasonPrimary: 'gleason_primary', gleasonSecondary: 'gleason_secondary', percent: 'percent', length: 'length' },
        values: {
          site: valuesFromPrefix(col('site'), 'psmap_site_'),
          cancer: valuesFromPrefix(col('cancer'), 'psmap_ca_'),
          gradeGroup: valuesFromPrefix(col('grade_group'), 'psmap_gg_'),
          gleason: { ...valuesFromPrefix(col('gleason_primary'), 'psmap_gp_'), ...valuesFromPrefix(col('gleason_secondary'), 'psmap_gs_') },
        },
      },
    };
  }
  // Batch 465: PathScribe's neck dissection grid (a row per level and side) binds itself.
  const neck = byId('psmap_nd_levels');
  if (neck?.type === 'partGrid') {
    const eneOptions = neck.columns?.find(c => c.id === 'ene')?.options;
    return {
      mapType: 'neckDissection',
      grid: {
        fieldId: neck.id,
        rows: Object.fromEntries((neck.rows?.rows ?? []).filter(r => NECK_LEVEL_IDS.includes(r.id)).map(r => [r.id, r.id])),
        // The grid's own columns (an optional one only when the grid has it).
        columns: {
          positive: 'positive', examined: 'examined',
          ...(neck.columns?.some(c => c.id === 'largest') ? { largest: 'largest' } : {}),
          ...(eneOptions ? { ene: 'ene' } : {}),
        },
        eneValues: valuesFromPrefix(eneOptions, 'psmap_nd_ene_'),
      },
    };
  }
  // Batch 464: the colorectal maps' PathScribe questions bind themselves (Batch 465: and the oral cavity's).
  for (const mapType of ['colorectalPolyp', 'rectalResection', 'oralCavity', 'renalResection'] as const) {
    const prefix = FIELD_INPUT_PREFIX[mapType];
    if (!fields.some(f => f.id.startsWith(prefix))) continue;
    const inputs: FieldInputsBinding['inputs'] = {};
    for (const spec of FIELD_INPUT_SPECS[mapType]) {
      const alias = FIELD_INPUT_ALIASES[mapType]?.[spec.key];
      const f = byId(`${prefix}${spec.key}`) ?? (alias ? byId(alias) : undefined);
      if (!f) continue;
      inputs[spec.key] = spec.kind === 'choice' ? { fieldId: f.id, values: valuesFromPrefix(f.options, `${f.id}_`) } : { fieldId: f.id };
    }
    // Batch 466d: PathScribe's own component margin questions (`<prefix>derived_<key>`, each answer id ending in
    // its meaning) bind themselves too.
    const derived: DerivedMarginBindings = {};
    for (const key of DERIVED_KEYS) {
      const f = byId(`${prefix}derived_${key}`);
      if (f) derived[key] = { fieldId: f.id, values: valuesFromPrefix(f.options, `${f.id}_`) };
    }
    return { mapType, inputs, ...(Object.keys(derived).length ? { derived } : {}) };
  }
  // Batch 463: a Mohs stage question binds itself (in PathScribe's Mohs template and every copy of it).
  const mohs = fields.find(f => f.type === 'spatialStageCanvas');
  if (mohs) return { mapType: 'mohsStages', stagesFieldId: mohs.id };
  const foci = byId('psmap_breast_foci');
  const marginGrid = byId('psmap_breast_margins');
  if (foci?.type === 'partGrid' || marginGrid?.type === 'partGrid') {
    const side = byId('psmap_breast_side');
    const col = (id: string) => foci?.columns?.find(c => c.id === id)?.options;
    return {
      mapType: 'breastClock',
      ...(side ? { side: { fieldId: side.id, values: valuesFromPrefix(side.options, 'psmap_side_') } } : {}),
      ...(foci?.type === 'partGrid' ? { foci: {
        fieldId: foci.id,
        columns: { type: 'type', clock: 'clock', distance: 'distance', size: 'size' },
        values: { type: valuesFromPrefix(col('type'), 'psmap_ftype_'), clock: valuesFromPrefix(col('clock'), 'psmap_clock_') },
      } } : {}),
      ...(marginGrid?.type === 'partGrid' ? { margins: {
        fieldId: marginGrid.id,
        rows: Object.fromEntries((marginGrid.rows?.rows ?? []).map(r => [r.id, r.id])),
        columns: { invasive: 'invasive', dcis: 'dcis' },
      } } : {}),
    };
  }
  const tumour = byId('psmap_tumour_sectors');
  if (!tumour) return null;
  const choice = (id: string, prefix: string): ChoiceBinding | undefined => {
    const f = byId(id);
    return f ? { fieldId: f.id, values: valuesFromPrefix(f.options, prefix) } : undefined;
  };
  return {
    mapType: 'prostateSectors',
    tumourSectors: choice('psmap_tumour_sectors', 'psmap_sector_'),
    gradeGroup: choice('psmap_grade_group', 'psmap_gg_'),
    epeSectors: choice('psmap_epe_sectors', 'psmap_sector_'),
    marginSectors: choice('psmap_margin_sectors', 'psmap_sector_'),
    svInvasion: choice('psmap_sv_invasion', 'psmap_sv_'),
  };
}

/** Batch 466d: a lab binding saved before margins were per component, on a map that has a precursor (polyp,
 *  breast, oral cavity), still binding a margin question: which component that question meant can't be known, so
 *  it waits for the lab to assign it. Renal and rectal maps have one component, so their meaning didn't change. */
export function bindingNeedsMarginReview(binding: OrganMapBinding | null | undefined): boolean {
  return !!binding && !!PRECURSOR_OF[binding.mapType] && !binding.marginComponents
    && DERIVED_KEYS.some(k => !!binding.derived?.[k]?.fieldId);
}

/** Batch 466d: a stored binding brought up to date with its template — margin roles whose question the template no
 *  longer has are dropped (e.g. Colorectal Local Excision's three removed placeholders), and roles it leaves empty
 *  are filled from PathScribe's default where the template has PathScribe's own question for them (a question
 *  already bound to another role isn't reused). Map inputs are untouched. */
export function upgradeStoredBinding(template: TemplateLike, stored: OrganMapBinding): OrganMapBinding {
  const ids = new Set(fieldsOf(template).map(f => f.id));
  const derived: DerivedMarginBindings = {};
  for (const k of DERIVED_KEYS) { const b = stored.derived?.[k]; if (b?.fieldId && ids.has(b.fieldId)) derived[k] = b; }
  const fallback = pathScribeDefaultBinding(template);
  if (fallback?.mapType === stored.mapType && fallback.derived) {
    const used = new Set(Object.values(derived).map(b => b!.fieldId));
    for (const k of DERIVED_KEYS) {
      const d = fallback.derived[k];
      if (!derived[k] && d && !used.has(d.fieldId)) { derived[k] = d; used.add(d.fieldId); }
    }
  }
  const { derived: _old, ...rest } = stored;
  // PathScribe's own questions name their component, so a binding left with only those needs no review.
  const onlyPathScribe = Object.values(derived).every(b => fallback?.derived && Object.values(fallback.derived).some(d => d?.fieldId === b!.fieldId));
  const next = { ...rest, ...(Object.keys(derived).length ? { derived } : {}) } as OrganMapBinding;
  if (onlyPathScribe && Object.keys(derived).length && PRECURSOR_OF[next.mapType]) next.marginComponents = true;
  // Nothing to bring up to date: the stored binding itself.
  return JSON.stringify(next) === JSON.stringify(stored) ? stored : next;
}

/** The binding for a template: the lab's stored one (brought up to date, Batch 466d), else PathScribe's default.
 *  A binding waiting for margin review calculates none of its margin questions (they unlock) until the lab
 *  assigns them in Configuration. */
export function resolveOrganMapBinding(template: TemplateLike | null | undefined, stored: Record<string, OrganMapBinding>): OrganMapBinding | null {
  if (!template) return null;
  const saved = stored[template.id];
  if (!saved) return pathScribeDefaultBinding(template);
  const upgraded = upgradeStoredBinding(template, saved);
  if (!bindingNeedsMarginReview(upgraded)) return upgraded;
  const { derived: _d, ...rest } = upgraded;
  return rest as OrganMapBinding;
}

export const BREAST_FOCUS_TYPES = ['invasive', 'dcis', 'calcifications'] as const;
export const BREAST_CLOCK_VALUES: readonly string[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'central'];
export const BREAST_FACE_VALUES: readonly string[] = ['superior', 'inferior', 'medial', 'lateral', 'anterior', 'posterior'];

export const mapTypeOfBinding = (b: OrganMapBinding): OrganMapType => b.mapType;
/** Batch 464: the question types a choice input and a number input may use. */
export const CHOICE_FIELD_TYPES: readonly string[] = ['dropdown', 'radio', 'checkboxes'];
export const NUMBER_FIELD_TYPES: readonly string[] = ['numeric', 'text'];

/** The values each sectors-map input may take. */
export function allowedBindingValues(input: SectorsInput): readonly string[] {
  if (input === 'gradeGroup') return ['1', '2', '3', '4', '5'];
  if (input === 'svInvasion') return ['none', 'right', 'left', 'bilateral'];
  return [...PROSTATE_SECTOR_IDS];
}

export type OrganMapBindingProblem = { input: string; problem: 'fieldMissing' | 'unknownValue' | 'noValues' | 'sharedQuestion' };

/** What stops a lab's binding being saved: questions the template doesn't
 *  have, or answers mapped to something the map doesn't know. */
/** Batch 466b: the questions a binding reads as map inputs (every `fieldId` but its derived ones). */
export function bindingInputFieldIds(binding: OrganMapBinding): Set<string> {
  const ids = new Set<string>();
  const walk = (v: unknown, key?: string) => {
    if (!v || typeof v !== 'object' || key === 'derived') return;
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) { if (k === 'fieldId' && typeof x === 'string' && x) ids.add(x); else if (k === 'stagesFieldId' && typeof x === 'string' && x) ids.add(x); else walk(x, k); }
  };
  walk(binding);
  return ids;
}

/** What stops a binding being saved: its map inputs' problems, then (Batch 466b) its derived margin questions'. */
export function validateOrganMapBinding(binding: OrganMapBinding, template: TemplateLike): OrganMapBindingProblem[] {
  return [...validateMapInputs(binding, template), ...validateDerivedBindings(binding, fieldsOf(template), bindingInputFieldIds(binding))];
}

function validateMapInputs(binding: OrganMapBinding, template: TemplateLike): OrganMapBindingProblem[] {
  const problems: OrganMapBindingProblem[] = [];
  const fields = fieldsOf(template);
  if (binding.mapType === 'prostateBiopsy') {
    const grid = fields.find(f => f.id === binding.coreGrid.fieldId && f.type === 'partGrid');
    if (!grid) { problems.push({ input: 'coreGrid', problem: 'fieldMissing' }); return problems; }
    // The site column is needed to place a core; every mapped column must be one of the grid's.
    const columnIds = new Set((grid.columns ?? []).map(c => c.id));
    const cols = binding.coreGrid.columns;
    if (!cols.site || !columnIds.has(cols.site)) problems.push({ input: 'coreGrid.site', problem: 'fieldMissing' });
    for (const [key, id] of Object.entries(cols)) if (key !== 'site' && id && !columnIds.has(id)) problems.push({ input: `coreGrid.${key}`, problem: 'fieldMissing' });
    const siteIds = new Set(PROSTATE_BIOPSY_SITES.map(s => s.id));
    const v = binding.coreGrid.values;
    if (Object.keys(v.site).length === 0) problems.push({ input: 'coreGrid.site', problem: 'noValues' });
    if (Object.values(v.site).some(x => !siteIds.has(x))
      || Object.values(v.cancer).some(x => x !== 'yes' && x !== 'no')
      || Object.values(v.gradeGroup).some(x => !['1', '2', '3', '4', '5'].includes(x))
      || Object.values(v.gleason).some(x => !['3', '4', '5'].includes(x))) problems.push({ input: 'coreGrid', problem: 'unknownValue' });
    return problems;
  }
  if (binding.mapType === 'mohsStages') {
    if (!fields.some(f => f.id === binding.stagesFieldId && f.type === 'spatialStageCanvas')) problems.push({ input: 'stages', problem: 'fieldMissing' });
    return problems;
  }
  if (binding.mapType === 'neckDissection') {
    // Batch 465: the grid exists with its own rows; the rows bound are its rows and real levels; the
    // nodes positive and examined columns are its columns; the ENE meanings are known.
    const g = (binding as NeckDissectionBinding).grid;
    if (!g?.fieldId) { problems.push({ input: 'neckGrid', problem: 'fieldMissing' }); return problems; }
    const grid = fields.find(f => f.id === g.fieldId && f.type === 'partGrid');
    if (!grid) { problems.push({ input: 'neckGrid', problem: 'fieldMissing' }); return problems; }
    const ownRows = grid.rows?.kind === 'fixed' ? new Set((grid.rows.rows ?? []).map(r => r.id)) : new Set<string>();
    if (ownRows.size === 0) problems.push({ input: 'neckGrid', problem: 'fieldMissing' });
    const entries = Object.entries(g.rows).filter(([r]) => ownRows.has(r));
    if (entries.length === 0) problems.push({ input: 'neckGrid', problem: 'noValues' });
    if (Object.keys(g.rows).some(r => !ownRows.has(r)) || entries.some(([, v]) => !NECK_LEVEL_IDS.includes(v))) problems.push({ input: 'neckGrid', problem: 'unknownValue' });
    // The counts and the size are number columns; the ENE column is a choice column with meanings for its own answers.
    const colOf = (id: string | undefined) => (grid.columns ?? []).find(c => c.id === id);
    const isNumber = (id: string | undefined) => colOf(id)?.type === 'numeric';
    for (const key of ['positive', 'examined'] as const) if (!g.columns[key] || !isNumber(g.columns[key])) problems.push({ input: `neckGrid.${key}`, problem: 'fieldMissing' });
    if (g.columns.largest && !isNumber(g.columns.largest)) problems.push({ input: 'neckGrid.largest', problem: 'fieldMissing' });
    if (g.columns.ene) {
      const options = new Set((colOf(g.columns.ene)?.options ?? []).map(o => o.id));
      if (options.size === 0) problems.push({ input: 'neckGrid.ene', problem: 'fieldMissing' });
      else if (!Object.keys(g.eneValues).some(o => options.has(o))) problems.push({ input: 'neckGrid.ene', problem: 'noValues' });
      if (Object.keys(g.eneValues).some(o => !options.has(o)) || Object.values(g.eneValues).some(v => !ENE_VALUES.includes(v))) problems.push({ input: 'neckGrid.ene', problem: 'unknownValue' });
    } else if (Object.keys(g.eneValues).length) problems.push({ input: 'neckGrid.ene', problem: 'unknownValue' });
    return problems;
  }
  if (isFieldInputsBinding(binding)) {
    // Batch 464: each bound input is a question the template has, of the right kind; a choice input's
    // meanings are the map's and cover at least one of the question's own answers. At least one input.
    const specs = FIELD_INPUT_SPECS[binding.mapType];
    let bound = 0;
    for (const spec of specs) {
      const b = binding.inputs[spec.key];
      if (!b?.fieldId) continue;
      bound++;
      const field = fields.find(f => f.id === b.fieldId);
      if (!field || (spec.kind === 'number' ? !NUMBER_FIELD_TYPES.includes(field.type) : !CHOICE_FIELD_TYPES.includes(field.type))) { problems.push({ input: spec.key, problem: 'fieldMissing' }); continue; }
      if (spec.kind === 'choice') {
        const optionIds = new Set((field.options ?? []).map(o => o.id));
        const entries = Object.entries((b as ChoiceBinding).values ?? {}).filter(([opt]) => optionIds.has(opt));
        if (entries.length === 0) problems.push({ input: spec.key, problem: 'noValues' });
        if (entries.some(([, v]) => !spec.values.includes(v))) problems.push({ input: spec.key, problem: 'unknownValue' });
      }
    }
    if (bound === 0) problems.push({ input: specs[0].key, problem: 'fieldMissing' });
    return problems;
  }
  if (binding.mapType === 'breastClock') {
    if (!binding.foci && !binding.margins) problems.push({ input: 'foci', problem: 'fieldMissing' });
    if (binding.side) {
      const f = fields.find(x => x.id === binding.side!.fieldId);
      if (!f) problems.push({ input: 'side', problem: 'fieldMissing' });
      else if (Object.values(binding.side.values).some(v => v !== 'right' && v !== 'left')) problems.push({ input: 'side', problem: 'unknownValue' });
    }
    if (binding.foci) {
      const grid = fields.find(f => f.id === binding.foci!.fieldId && f.type === 'partGrid');
      if (!grid) problems.push({ input: 'foci', problem: 'fieldMissing' });
      else {
        const ids = new Set((grid.columns ?? []).map(c => c.id));
        for (const [key, id] of Object.entries(binding.foci.columns)) if ((key === 'type' || key === 'clock' || id) && !ids.has(id as string)) problems.push({ input: `foci.${key}`, problem: 'fieldMissing' });
        // Only meanings for the chosen columns' own answers count (a column changed since leaves none).
        const optionsOf = (colId: string) => new Set((grid.columns ?? []).find(c => c.id === colId)?.options?.map(o => o.id) ?? []);
        const typeOpts = optionsOf(binding.foci.columns.type); const clockOpts = optionsOf(binding.foci.columns.clock);
        if (!Object.keys(binding.foci.values.type).some(o => typeOpts.has(o)) || !Object.keys(binding.foci.values.clock).some(o => clockOpts.has(o))) problems.push({ input: 'foci', problem: 'noValues' });
        if (Object.values(binding.foci.values.type).some(v => !BREAST_FOCUS_TYPES.includes(v as never))
          || Object.values(binding.foci.values.clock).some(v => !BREAST_CLOCK_VALUES.includes(v))) problems.push({ input: 'foci', problem: 'unknownValue' });
      }
    }
    if (binding.margins) {
      const grid = fields.find(f => f.id === binding.margins!.fieldId && f.type === 'partGrid');
      if (!grid) problems.push({ input: 'margins', problem: 'fieldMissing' });
      else {
        const ids = new Set((grid.columns ?? []).map(c => c.id));
        for (const [key, id] of Object.entries(binding.margins.columns)) if (id && !ids.has(id)) problems.push({ input: `margins.${key}`, problem: 'fieldMissing' });
        if (!binding.margins.columns.invasive && !binding.margins.columns.dcis) problems.push({ input: 'margins', problem: 'noValues' });
        // The margins grid needs its own rows (one per margin), and only those can be bound.
        const ownRows = grid.rows?.kind === 'fixed' ? new Set((grid.rows.rows ?? []).map(r => r.id)) : new Set<string>();
        if (ownRows.size === 0) problems.push({ input: 'margins', problem: 'fieldMissing' });
        else if (Object.keys(binding.margins.rows).some(r => !ownRows.has(r))) problems.push({ input: 'margins', problem: 'unknownValue' });
        if (Object.keys(binding.margins.rows).length === 0) problems.push({ input: 'margins', problem: 'noValues' });
        if (Object.values(binding.margins.rows).some(v => !BREAST_FACE_VALUES.includes(v))) problems.push({ input: 'margins', problem: 'unknownValue' });
      }
    }
    return problems;
  }
  for (const input of SECTORS_INPUTS) {
    const b = binding[input];
    if (!b) continue;
    const field = fields.find(f => f.id === b.fieldId);
    if (!field) { problems.push({ input, problem: 'fieldMissing' }); continue; }
    const optionIds = new Set((field.options ?? []).map(o => o.id));
    const allowed = new Set(allowedBindingValues(input));
    const entries = Object.entries(b.values).filter(([opt]) => optionIds.has(opt));
    if (entries.length === 0) problems.push({ input, problem: 'noValues' });
    if (entries.some(([, v]) => !allowed.has(v))) problems.push({ input, problem: 'unknownValue' });
  }
  if (!binding.tumourSectors) problems.push({ input: 'tumourSectors', problem: 'fieldMissing' });
  return problems;
}

/** Audit detail for a binding change (literal English). */
export function organMapBindingChangeDetail(templateId: string, before: OrganMapBinding | undefined, after: OrganMapBinding | undefined): string {
  const describe = (b: OrganMapBinding | undefined) => {
    if (!b) return 'PathScribe default';
    if (b.mapType === 'prostateBiopsy') return `core results grid ${b.coreGrid.fieldId}`;
    if (b.mapType === 'mohsStages') return `Mohs stage question ${b.stagesFieldId}`;
    if (b.mapType === 'neckDissection') return (b as NeckDissectionBinding).grid ? `neck levels grid ${(b as NeckDissectionBinding).grid!.fieldId} (${Object.keys((b as NeckDissectionBinding).grid!.rows).length} rows)` : 'neck levels grid (none)';
    if (isFieldInputsBinding(b)) return [Object.entries(b.inputs).filter(([, v]) => v?.fieldId).map(([k, v]) => `${k}=${v!.fieldId}`).join(', '), margins(b)].filter(Boolean).join('; ');
    if (b.mapType === 'breastClock') return [b.side ? `side=${b.side.fieldId}` : '', b.foci ? `foci grid ${b.foci.fieldId}` : '', b.margins ? `margins grid ${b.margins.fieldId}` : '', margins(b)].filter(Boolean).join(', ');
    return SECTORS_INPUTS.filter(i => b[i]).map(i => `${i}=${b[i]!.fieldId} (${Object.keys(b[i]!.values).length} answers)`).join(', ');
  };
  // Batch 466d: the margin questions calculated from the map, by role.
  const margins = (b: OrganMapBinding) => {
    const roles = DERIVED_KEYS.filter(k => b.derived?.[k]?.fieldId).map(k => `${k}=${b.derived![k]!.fieldId}`);
    return roles.length ? `margin questions ${roles.join(', ')}${b.marginComponents ? ' (per component)' : ''}` : '';
  };
  return `Organ map binding for template ${templateId}: ${describe(before)} → ${describe(after)}`;
}
