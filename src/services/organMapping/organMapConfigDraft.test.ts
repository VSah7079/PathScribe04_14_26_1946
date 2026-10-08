// @vitest-environment happy-dom
// src/services/organMapping/organMapConfigDraft.test.ts
// Batch 461: the Configuration → Organ maps edits, the results grid question,
// its report text, and the demo cases' maps (drawn from their synoptic answers).
import { describe, expect, it } from 'vitest';
import radical from '@/data/templates/generic/prostate_radical_prostatectomy.json';
import needle from '@/data/templates/generic/prostate_needle_biopsy.json';
import { resolveAnswers } from '@/orchestrator/contextBuilder';
import { mockCaseService } from '../cases/mockCaseService';
import { BUILT_IN_ORGAN_MAP_SCHEME , BUILT_IN_ORGAN_MAP_THRESHOLDS } from './organMapScheme';
import { pathScribeDefaultBinding, type ProstateBiopsyBinding, type ProstateSectorsBinding } from './organMapBindings';
import { resolveProstateMap } from './resolveProstateMap';
import {
  allowedCoreValues, bindableFields, bindingDraftDirty, bindingDraftOf, bindingProblemInputKey, draftScheme, emptyOrganMapBinding,
  inheritedOrganMapScheme, organMapBindingStatus, organMapBreastPreview, organMapMohsPreview, organMapColorectalPreviews, organMapHeadNeckPreviews, organMapConfigOutcome, organMapSchemePreview, schemeDraftDirty, schemeDraftOf,
  valueKindOfColumn, withChoiceField, withChoiceValue, withCoreColumn, withCoreGrid, withCoreValue, withoutSchemeOverride,
  withSchemeOverride, withSchemeValue,
} from './organMapConfigDraft';
import {
  clearSynopticFieldAnswers, partGridDisplay, partGridKey, partGridRowsFromAnswers, partGridRowsOf, synopticFieldAnswered,
} from '../templates/partGrid';
import { MAP_STYLE_KEYS } from './organMapTypes';

const layers = {
  enterprise: { gg1: { colour: '#111111' } },
  jurisdictions: { GB: { gg1: { colour: '#222222' }, gg2: { colour: '#333333' } } },
  facilities: { F1: { gg2: { colour: '#444444' } } },
};

describe('colours & patterns editing', () => {
  it('each level inherits from the levels above it', () => {
    expect(inheritedOrganMapScheme(layers, { kind: 'enterprise' }).gg1.colour).toBe(BUILT_IN_ORGAN_MAP_SCHEME.gg1.colour);
    expect(inheritedOrganMapScheme(layers, { kind: 'jurisdiction', code: 'GB' }).gg1.colour).toBe('#111111');
    expect(inheritedOrganMapScheme(layers, { kind: 'facility', facilityId: 'F1' }, 'GB')).toMatchObject({ gg1: { colour: '#222222' }, gg2: { colour: '#333333' } });
  });
  it('overrides a key from what it inherits, edits it, and gives it back', () => {
    const inherited = inheritedOrganMapScheme(layers, { kind: 'facility', facilityId: 'F1' }, 'GB');
    let d = schemeDraftOf(layers, { kind: 'facility', facilityId: 'F1' });
    expect(schemeDraftDirty(d, layers.facilities.F1)).toBe(false);
    d = withSchemeOverride(d, 'gg1', inherited);
    expect(d.gg1).toEqual({ colour: '#222222', pattern: 'dots' });
    d = withSchemeValue(d, 'gg1', { label: 'Low grade' });
    d = withSchemeValue(d, 'gg1', { colour: '#abcdef' });
    expect(draftScheme(inherited, d).gg1).toEqual({ colour: '#abcdef', pattern: 'dots', label: 'Low grade' });
    expect(withSchemeValue(d, 'gg1', { label: '  ' }).gg1).not.toHaveProperty('label');
    expect(schemeDraftDirty(d, layers.facilities.F1)).toBe(true);
    expect(withoutSchemeOverride(d, 'gg1')).toEqual(layers.facilities.F1);
  });
  it('the previews (prostate, breast, Mohs; Batch 464 colorectal; Batch 465 head and neck) between them show every colour and pattern', () => {
    const p = organMapSchemePreview(BUILT_IN_ORGAN_MAP_SCHEME);
    const b = organMapBreastPreview(BUILT_IN_ORGAN_MAP_SCHEME, { ...BUILT_IN_ORGAN_MAP_THRESHOLDS, breastCloseMarginMm: 2 });
    const m = organMapMohsPreview(BUILT_IN_ORGAN_MAP_SCHEME);
    const cr = [...organMapColorectalPreviews(BUILT_IN_ORGAN_MAP_SCHEME, BUILT_IN_ORGAN_MAP_THRESHOLDS), ...organMapHeadNeckPreviews(BUILT_IN_ORGAN_MAP_SCHEME, BUILT_IN_ORGAN_MAP_THRESHOLDS)];
    expect(p.legend.map(l => l.key)).toEqual([...MAP_STYLE_KEYS]);
    const shown = new Set([...p.sectors, ...b.sectors, ...(b.markers ?? []), ...m.sectors, ...cr.flatMap(x => x.sectors)].flatMap(s => [s.category, ...('overlays' in s ? s.overlays.map(o => o.key) : [])]));
    for (const key of MAP_STYLE_KEYS) expect(shown.has(key), key).toBe(true);
  });
  it('the breast preview follows the layer’s close-margin threshold', () => {
    const at = (mm: number) => organMapBreastPreview(BUILT_IN_ORGAN_MAP_SCHEME, { ...BUILT_IN_ORGAN_MAP_THRESHOLDS, breastCloseMarginMm: mm }).sectors.find(s => s.id === 'm_superior_dcis')!.category;
    expect([at(2), at(1)]).toEqual(['marginClose', 'marginClear']);
  });
  it('flattens a save outcome for the message', () => {
    expect(organMapConfigOutcome({ ok: true })).toEqual({ kind: 'saved', problems: [] });
    expect(organMapConfigOutcome({ ok: false, reason: 'notPermitted' })).toEqual({ kind: 'notPermitted', problems: [] });
    expect(organMapConfigOutcome({ ok: false, reason: 'invalid', problems: [1] })).toEqual({ kind: 'invalid', problems: [1] });
  });
});

describe('map binding editing', () => {
  const lab = { id: 'lab_rp', sections: [{ fields: [
    { id: 'where', type: 'checkboxes', label: 'Tumour location', options: [{ id: 'o1', label: 'Right posterior mid' }, { id: 'o2', label: 'Left apex' }] },
    { id: 'gg', type: 'dropdown', options: [{ id: 'g2' }, { id: 'g3' }] },
    { id: 'note', type: 'text' },
    { id: 'cores', type: 'partGrid', columns: [{ id: 'loc', options: [{ id: 'l1' }] }, { id: 'ca', options: [{ id: 'y' }, { id: 'n' }] }] },
  ] }] };

  it('knows whose binding a template has', () => {
    expect(organMapBindingStatus(radical as never, {})).toBe('pathScribe');
    expect(organMapBindingStatus(lab as never, {})).toBe('none');
    expect(organMapBindingStatus(lab as never, { lab_rp: emptyOrganMapBinding('prostateSectors') })).toBe('lab');
  });
  it('starts from the stored binding, else PathScribe’s, else empty for the chosen map', () => {
    expect(bindingDraftOf(radical as never, {})).toEqual(pathScribeDefaultBinding(radical as never));
    expect(bindingDraftOf(lab as never, {})).toEqual({ mapType: 'prostateSectors' });
    expect(bindingDraftOf(radical as never, {}, 'prostateBiopsy').mapType).toBe('prostateBiopsy');
    expect(bindableFields(lab as never, 'prostateSectors').map(f => f.id)).toEqual(['where', 'gg']);
    expect(bindableFields(lab as never, 'prostateBiopsy').map(f => f.id)).toEqual(['cores']);
  });
  it('binds a lab question and says what each answer means', () => {
    let b = bindingDraftOf(lab as never, {}) as ProstateSectorsBinding;
    b = withChoiceField(b, 'tumourSectors', 'where');
    b = withChoiceValue(b, 'tumourSectors', 'o1', 'r_mid_pzpl');
    b = withChoiceValue(b, 'tumourSectors', 'o2', 'l_apex_pzpl');
    b = withChoiceValue(b, 'tumourSectors', 'o2', '');
    expect(b.tumourSectors).toEqual({ fieldId: 'where', values: { o1: 'r_mid_pzpl' } });
    expect(withChoiceField(b, 'tumourSectors', '').tumourSectors).toBeUndefined();
    expect(bindingDraftDirty(b, undefined)).toBe(true);
    // the lab's answers now draw the map
    const map = resolveProstateMap({ binding: b, answers: { where: ['o1'] }, scheme: BUILT_IN_ORGAN_MAP_SCHEME, templateId: 'lab_rp', instanceId: 'x' });
    expect(map.sectors.find(s => s.id === 'r_mid_pzpl')!.category).toBe('tumour');
  });
  it('binds a results grid, its columns and their answers', () => {
    let b = withCoreGrid('cores');
    b = withCoreColumn(b, 'site', 'loc');
    b = withCoreColumn(b, 'cancer', 'ca');
    b = withCoreColumn(b, 'percent', 'pct');
    b = withCoreColumn(b, 'percent', '');
    b = withCoreValue(b, 'site', 'l1', 'r_mid_lat');
    b = withCoreValue(b, 'cancer', 'y', 'yes');
    expect((b as ProstateBiopsyBinding).coreGrid).toEqual({ fieldId: 'cores', columns: { site: 'loc', cancer: 'ca', gradeGroup: '' }, values: { site: { l1: 'r_mid_lat' }, cancer: { y: 'yes' }, gradeGroup: {}, gleason: {} } });
    // Batch 462: another column starts its meanings again (the old column's answers don't apply)
    expect(withCoreColumn(b as ProstateBiopsyBinding, 'site', 'other').coreGrid.values.site).toEqual({});
    expect(withCoreColumn(b as ProstateBiopsyBinding, 'site', 'loc').coreGrid.values.site).toEqual({ l1: 'r_mid_lat' });
    expect(valueKindOfColumn('gleasonSecondary')).toBe('gleason');
    expect(valueKindOfColumn('length')).toBeNull();
    expect(allowedCoreValues('cancer')).toEqual(['yes', 'no']);
    expect(allowedCoreValues('site')).toHaveLength(15);
  });
  it('names a problem’s input for the message', () => {
    expect(['coreGrid', 'coreGrid.site', 'gradeGroup'].map(i => bindingProblemInputKey(i))).toEqual(['gridQuestion', 'columns.site', 'inputs.gradeGroup']);
  });
});

describe('the results grid question', () => {
  const grid = (needle.sections.flatMap(s => s.fields) as never[]).find((f: { id: string }) => f.id === 'psmap_core_results') as never as { id: string; type: string; label: string; columns: never[] };
  const rows = partGridRowsOf([{ id: 'sp2', label: 'B', description: 'right mid' }, { id: 'sp1', label: 'A' }]);
  const answers: Record<string, string | string[]> = {
    [partGridKey(grid.id, 'sp1', 'cancer')]: 'psmap_ca_yes',
    [partGridKey(grid.id, 'sp1', 'percent')]: '40',
    [partGridKey(grid.id, 'sp2', 'cancer')]: 'psmap_ca_no',
    other: 'x',
  };
  it('rows are the case’s parts in label order; each cell is an ordinary answer', () => {
    expect(rows.map(r => r.label)).toEqual(['A', 'B']);
    expect(partGridKey('q', 'sp1', 'c')).toBe('q__sp1__c');
    expect(partGridRowsFromAnswers(grid.id, answers).map(r => r.id)).toEqual(['sp1', 'sp2']);
  });
  it('counts as answered when any cell is, and clears all its cells when hidden', () => {
    expect(synopticFieldAnswered(grid, answers)).toBe(true);
    expect(synopticFieldAnswered(grid, { other: 'x' })).toBe(false);
    expect(synopticFieldAnswered({ id: 'other', type: 'text' }, answers)).toBe(true);
    expect(synopticFieldAnswered({ id: 'e', type: 'checkboxes' }, { e: [] })).toBe(false);
    const copy = { ...answers };
    clearSynopticFieldAnswers(grid, copy);
    expect(copy).toEqual({ other: 'x' });
  });
  it('reads in the report as a line per part, with the option labels', () => {
    const text = partGridDisplay(grid, rows, answers);
    expect(text.split('\n')).toHaveLength(2);
    expect(text).toBe('A: Carcinoma: Present; Core involved: 40 %\nB (right mid): Carcinoma: Not identified');
    const resolved = resolveAnswers(answers, needle as never, rows);
    expect(resolved.find(r => r.fieldId === grid.id)).toMatchObject({ fieldType: 'partGrid', displayValue: text });
    // without the parts to hand, the rows are named by their ids
    expect(resolveAnswers(answers, needle as never).find(r => r.fieldId === grid.id)!.displayValue).toMatch(/^sp1: /);
  });
});

describe('the demo cases draw their maps from their synoptic answers', () => {
  it('S26-4404: cores A–C carcinoma Grade Group 2 on the right; D–F benign on the left', async () => {
    const c = (await mockCaseService.getCase('S26-4404'))!;
    const inst = c.synopticReports!.find(r => r.templateId === 'prostate_needle_biopsy')!;
    const map = resolveProstateMap({ binding: pathScribeDefaultBinding(needle as never)!, answers: inst.answers as never, scheme: BUILT_IN_ORGAN_MAP_SCHEME, templateId: needle.id, instanceId: inst.instanceId, rows: partGridRowsOf(c.specimens) });
    const by = (id: string) => map.sectors.find(s => s.id === id)!;
    expect(['r_apex_lat', 'r_mid_lat', 'r_base_lat'].map(id => by(id).category)).toEqual(['gg2', 'gg2', 'gg2']);
    expect(by('r_mid_lat').details).toMatchObject({ parts: ['B'], percent: 70, gleason: '3+4=7' });
    expect(['l_apex_lat', 'l_mid_lat', 'l_base_lat'].map(id => by(id).category)).toEqual(['benign', 'benign', 'benign']);
  });
  it('MFT26-8804: Grade Group 3 on the right, extension and a positive margin right posterolateral', async () => {
    const c = (await mockCaseService.getCase('MFT26-8804-PR-RP'))!;
    const inst = c.synopticReports!.find(r => r.templateId === 'prostate_radical_prostatectomy')!;
    const map = resolveProstateMap({ binding: pathScribeDefaultBinding(radical as never)!, answers: inst.answers as never, scheme: BUILT_IN_ORGAN_MAP_SCHEME, templateId: radical.id, instanceId: inst.instanceId });
    const mid = map.sectors.find(s => s.id === 'r_mid_pzpl')!;
    expect(mid.category).toBe('ggHigh');
    expect(mid.overlays.map(o => o.key)).toEqual(['epe', 'positiveMargin']);
    expect(map.sectors.filter(s => s.id.startsWith('l_')).every(s => s.category === 'benign')).toBe(true);
  });
});

describe('sign-out and the report map image', () => {
  it('finds a report image that no longer matches the synoptic answers', async () => {
    const { findStaleOrganMapFigures } = await import('./organMapLive');
    const c = (await mockCaseService.getCase('MFT26-8804-PR-RP'))!;
    const inst = c.synopticReports!.find(r => r.templateId === 'prostate_radical_prostatectomy')!;
    const map = resolveProstateMap({ binding: pathScribeDefaultBinding(radical as never)!, answers: inst.answers as never, scheme: BUILT_IN_ORGAN_MAP_SCHEME, templateId: radical.id, instanceId: inst.instanceId });
    const figure = { id: 'f', instanceId: inst.instanceId, mapType: 'prostateSectors' as const, svg: '<svg/>', fingerprint: map.fingerprint, insertedAt: '', insertedBy: 'u', insertedByName: 'U' };
    expect(await findStaleOrganMapFigures({ ...c, organMapFigures: [figure] })).toEqual([]);
    const changed = { ...c, organMapFigures: [figure], synopticReports: c.synopticReports!.map(r => (r.instanceId === inst.instanceId ? { ...r, answers: { ...r.answers, psmap_grade_group: 'psmap_gg_5' } } : r)) };
    expect(await findStaleOrganMapFigures(changed)).toEqual([inst.instanceId]);
    expect(await findStaleOrganMapFigures({ ...c, organMapFigures: [] })).toEqual([]);
  });
});
