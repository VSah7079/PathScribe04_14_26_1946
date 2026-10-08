// src/services/organMapping/organMapping.test.ts
// Batch 461: the organ-mapping engine — scheme layers, bindings, the prostate
// resolver (the map comes only from the synoptic answers), drawing and labels.
import { describe, expect, it } from 'vitest';
import radical from '@/data/templates/generic/prostate_radical_prostatectomy.json';
import needle from '@/data/templates/generic/prostate_needle_biopsy.json';
import { PROSTATE_BIOPSY_SITES, PROSTATE_PIRADS_SECTORS, PROSTATE_SECTOR_IDS } from './prostateSectors';
import { prostateBiopsyShapes, prostateSectorShapes } from './prostateGeometry';
import { BUILT_IN_ORGAN_MAP_SCHEME, organMapSchemeChangeDetail, organMapSchemeVars, resolveOrganMapScheme, validateOrganMapScheme } from './organMapScheme';
import { organMapBindingChangeDetail, pathScribeDefaultBinding, resolveOrganMapBinding, validateOrganMapBinding, type ProstateBiopsyBinding, type ProstateSectorsBinding } from './organMapBindings';
import { categoryForGradeGroup, resolveProstateMap } from './resolveProstateMap';
import { renderOrganMapSvg } from './organMapDrawing';
import { organMapDrawingLabels, organMapInlineText, organMapLegendLabel, organMapSectorName, organMapSectorSummary } from './organMapLabels';
import { partGridKey } from '../templates/partGrid';

const scheme = BUILT_IN_ORGAN_MAP_SCHEME;
const sec = (...ids: string[]) => ids.map(i => `psmap_sector_${i}`);
const t = (key: string, o: Record<string, unknown> = {}) => `${key}${Object.keys(o).length ? JSON.stringify(o) : ''}`;

describe('PI-RADS v2.1 sectors and geometry', () => {
  it('has the 41 sectors (38 gland, 2 seminal vesicles, urethral sphincter), each drawn once', () => {
    expect(PROSTATE_PIRADS_SECTORS).toHaveLength(41);
    expect(PROSTATE_PIRADS_SECTORS.filter(s => s.kind === 'gland')).toHaveLength(38);
    expect(new Set(prostateSectorShapes().map(s => s.id))).toEqual(PROSTATE_SECTOR_IDS);
    expect(PROSTATE_SECTOR_IDS.has('r_base_cz') && !PROSTATE_SECTOR_IDS.has('r_mid_cz')).toBe(true);
  });
  it('has 12 systematic biopsy sites and 3 targeted, each drawn', () => {
    expect(PROSTATE_BIOPSY_SITES.filter(s => s.kind === 'systematic')).toHaveLength(12);
    expect(prostateBiopsyShapes()).toHaveLength(15);
  });
});

describe('colour scheme layers', () => {
  it('facility over jurisdiction over enterprise over built-in, key by key, with the source', () => {
    const r = resolveOrganMapScheme({
      enterprise: { gg1: { colour: '#111111' }, gg2: { colour: '#222222' } },
      jurisdictions: { GB: { gg2: { colour: '#333333', pattern: 'dots' } } },
      facilities: { F1: { ggHigh: { colour: '#444444', label: 'GG ≥3' } } },
    }, { facilityId: 'F1', jurisdiction: 'GB' });
    expect(r.scheme.gg1).toEqual({ ...scheme.gg1, colour: '#111111' });
    expect(r.scheme.gg2).toEqual({ colour: '#333333', pattern: 'dots' });
    expect(r.scheme.ggHigh.label).toBe('GG ≥3');
    expect(r.sources).toMatchObject({ gg1: 'enterprise', gg2: 'jurisdiction', ggHigh: 'facility', benign: 'builtIn' });
    expect(resolveOrganMapScheme({ facilities: { F1: { gg1: { colour: '#000000' } } } }, { facilityId: 'F2' }).scheme.gg1).toEqual(scheme.gg1);
  });
  it('every colour keeps a pattern (only "no tumour" and "not sampled" may have none)', () => {
    expect(validateOrganMapScheme({ gg1: { colour: 'red' } })).toEqual([{ key: 'gg1', problem: 'colour' }]);
    expect(validateOrganMapScheme({ gg1: { pattern: 'none' } })).toEqual([{ key: 'gg1', problem: 'patternRequired' }]);
    expect(validateOrganMapScheme({ benign: { pattern: 'none' } })).toEqual([]);
    expect(validateOrganMapScheme({ gg1: { pattern: 'zigzag' as never } })).toEqual([{ key: 'gg1', problem: 'pattern' }]);
    expect(validateOrganMapScheme({ gg1: { label: 'x'.repeat(41) } })).toEqual([{ key: 'gg1', problem: 'label' }]);
    for (const [key, style] of Object.entries(scheme)) if (key !== 'benign' && key !== 'notSampled') expect(style.pattern).not.toBe('none');
  });
  it('gives the colours as custom properties, and an English audit line only when something changed', () => {
    expect(organMapSchemeVars(scheme)['--organmap-ggHigh']).toBe(scheme.ggHigh.colour);
    expect(organMapSchemeChangeDetail('enterprise', { gg1: { colour: '#111111' } }, { gg1: { colour: '#111111' } })).toBeNull();
    expect(organMapSchemeChangeDetail('enterprise', undefined, { gg1: { colour: '#111111' } })).toMatch(/gg1/);
  });
});

describe('bindings', () => {
  it("PathScribe's own map questions bind themselves (sectors map)", () => {
    const b = pathScribeDefaultBinding(radical as never) as ProstateSectorsBinding;
    expect(b.mapType).toBe('prostateSectors');
    expect(Object.keys(b.tumourSectors!.values)).toHaveLength(41);
    expect(b.tumourSectors!.values.psmap_sector_r_mid_pzpl).toBe('r_mid_pzpl');
    expect(b.gradeGroup!.values).toMatchObject({ psmap_gg_1: '1', psmap_gg_5: '5' });
    expect(b.svInvasion!.values.psmap_sv_bilateral).toBe('bilateral');
    expect(validateOrganMapBinding(b, radical as never)).toEqual([]);
  });
  it('the needle biopsy template binds its Core results grid', () => {
    const b = pathScribeDefaultBinding(needle as never) as ProstateBiopsyBinding;
    expect(b.mapType).toBe('prostateBiopsy');
    expect(b.coreGrid.fieldId).toBe('psmap_core_results');
    expect(Object.values(b.coreGrid.values.site).sort()).toEqual(PROSTATE_BIOPSY_SITES.map(s => s.id).sort());
    expect(validateOrganMapBinding(b, needle as never)).toEqual([]);
  });
  it("a lab's stored binding wins; a template without map questions has none", () => {
    const stored = { mapType: 'prostateSectors' as const, tumourSectors: { fieldId: 'lab_q', values: { a: 'r_mid_pzpl' } } };
    expect(resolveOrganMapBinding(radical as never, { [radical.id]: stored })).toBe(stored);
    expect(resolveOrganMapBinding({ id: 'x', sections: [{ fields: [{ id: 'q', type: 'text' }] }] }, {})).toBeNull();
    expect(resolveOrganMapBinding(null, {})).toBeNull();
  });
  it('validation names missing questions, unknown meanings and empty bindings', () => {
    const tpl = { id: 'lab', sections: [{ fields: [{ id: 'q', type: 'checkboxes', options: [{ id: 'a' }, { id: 'b' }] }, { id: 'grid', type: 'partGrid', columns: [{ id: 'where', options: [{ id: 'w1' }] }] }] }] };
    expect(validateOrganMapBinding({ mapType: 'prostateSectors', tumourSectors: { fieldId: 'nope', values: {} } }, tpl)).toEqual([{ input: 'tumourSectors', problem: 'fieldMissing' }]);
    expect(validateOrganMapBinding({ mapType: 'prostateSectors', tumourSectors: { fieldId: 'q', values: { a: 'kidney' } } }, tpl)).toEqual([{ input: 'tumourSectors', problem: 'unknownValue' }]);
    expect(validateOrganMapBinding({ mapType: 'prostateSectors', tumourSectors: { fieldId: 'q', values: {} } }, tpl)).toEqual([{ input: 'tumourSectors', problem: 'noValues' }]);
    expect(validateOrganMapBinding({ mapType: 'prostateSectors' }, tpl)).toEqual([{ input: 'tumourSectors', problem: 'fieldMissing' }]);
    const grid = (columns: ProstateBiopsyBinding['coreGrid']['columns'], site: Record<string, string>): ProstateBiopsyBinding =>
      ({ mapType: 'prostateBiopsy', coreGrid: { fieldId: 'grid', columns, values: { site, cancer: {}, gradeGroup: {}, gleason: {} } } });
    expect(validateOrganMapBinding(grid({ site: 'where', cancer: '', gradeGroup: '' }, { w1: 'r_mid_lat' }), tpl)).toEqual([]);
    expect(validateOrganMapBinding(grid({ site: '', cancer: '', gradeGroup: '' }, {}), tpl).map(p => p.input)).toEqual(['coreGrid.site', 'coreGrid.site']);
    expect(validateOrganMapBinding(grid({ site: 'where', cancer: 'missing', gradeGroup: '' }, { w1: 'liver' }), tpl)).toEqual([
      { input: 'coreGrid.cancer', problem: 'fieldMissing' }, { input: 'coreGrid', problem: 'unknownValue' },
    ]);
  });
  it('audits a binding change in English', () => {
    expect(organMapBindingChangeDetail('t1', undefined, pathScribeDefaultBinding(needle as never)!)).toBe('Organ map binding for template t1: PathScribe default → core results grid psmap_core_results');
  });
});

describe('the prostatectomy map, from the synoptic answers', () => {
  const binding = pathScribeDefaultBinding(radical as never)!;
  const map = (answers: Record<string, string | string[]>) => resolveProstateMap({ binding, answers, scheme, templateId: radical.id, instanceId: 'i1' });

  it('Grade Group decides the tumour category', () => {
    expect([undefined, 1, 2, 3, 5].map(categoryForGradeGroup)).toEqual(['tumour', 'gg1', 'gg2', 'ggHigh', 'ggHigh']);
  });
  it('shows nothing until a map question is answered', () => {
    const p = map({});
    expect(p.hasData).toBe(false);
    expect(p.sectors.every(s => s.category === 'benign')).toBe(true);
    expect(p.legend.map(l => l.key)).toEqual(['benign']);
  });
  it('tumour sectors take the Grade Group; extension and margin are overlays; a click goes to the right question', () => {
    const p = map({ psmap_tumour_sectors: sec('r_mid_pzpl', 'r_base_pzpm'), psmap_grade_group: 'psmap_gg_3', psmap_epe_sectors: sec('r_mid_pzpl'), psmap_margin_sectors: sec('r_apex_pzpl'), psmap_sv_invasion: 'psmap_sv_left' });
    const by = (id: string) => p.sectors.find(s => s.id === id)!;
    expect(by('r_mid_pzpl')).toMatchObject({ category: 'ggHigh', pattern: 'crosshatch', overlays: [{ key: 'epe', pattern: 'hatch' }], jumpFieldId: 'psmap_epe_sectors', details: { gradeGroup: 3 } });
    expect(by('r_apex_pzpl')).toMatchObject({ category: 'benign', overlays: [{ key: 'positiveMargin' }], jumpFieldId: 'psmap_margin_sectors' });
    expect(by('l_sv').category).toBe('ggHigh');
    expect(by('r_sv').category).toBe('benign');
    expect(by('l_mid_as').jumpFieldId).toBe('psmap_tumour_sectors');
    expect(p.legend.map(l => l.key)).toEqual(['benign', 'ggHigh', 'epe', 'positiveMargin']);
    expect(p.hasData).toBe(true);
  });
  it('the fingerprint follows what the map shows, not the colours', () => {
    const a = map({ psmap_tumour_sectors: sec('r_mid_pzpl') });
    const b = resolveProstateMap({ binding, answers: { psmap_tumour_sectors: sec('r_mid_pzpl') }, scheme: { ...scheme, tumour: { colour: '#000000', pattern: 'dots' } }, templateId: radical.id, instanceId: 'i1' });
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(map({ psmap_tumour_sectors: sec('r_mid_pzpm') }).fingerprint).not.toBe(a.fingerprint);
  });
});

describe('the needle biopsy map, from the Core results grid', () => {
  const binding = pathScribeDefaultBinding(needle as never)!;
  const rows = [{ id: 'spA', label: 'A' }, { id: 'spB', label: 'B' }, { id: 'spC', label: 'C' }];
  const cell = (row: string, col: string, v: string) => ({ [partGridKey('psmap_core_results', row, col)]: v });
  const answers = {
    ...cell('spA', 'site', 'psmap_site_r_mid_lat'), ...cell('spA', 'cancer', 'psmap_ca_yes'), ...cell('spA', 'grade_group', 'psmap_gg_2'),
    ...cell('spA', 'gleason_primary', 'psmap_gp_3'), ...cell('spA', 'gleason_secondary', 'psmap_gs_4'), ...cell('spA', 'percent', '40'), ...cell('spA', 'length', '14'),
    ...cell('spB', 'site', 'psmap_site_r_mid_lat'), ...cell('spB', 'cancer', 'psmap_ca_yes'), ...cell('spB', 'grade_group', 'psmap_gg_4'), ...cell('spB', 'percent', '70'),
    ...cell('spC', 'site', 'psmap_site_target_2'), ...cell('spC', 'cancer', 'psmap_ca_no'),
  };
  const p = resolveProstateMap({ binding, answers, scheme, templateId: needle.id, instanceId: 'i2', rows });
  const by = (id: string) => p.sectors.find(s => s.id === id);

  it('two cores at one site: the higher Grade Group and the greater %', () => {
    expect(by('r_mid_lat')).toMatchObject({ category: 'ggHigh', details: { parts: ['A', 'B'], gradeGroup: 4, percent: 70 }, jumpFieldId: 'psmap_core_results' });
  });
  it('within "Grade Group 3 or higher" the higher Grade Group still wins, and its Gleason with it', () => {
    const two = {
      ...cell('spA', 'site', 'psmap_site_r_mid_lat'), ...cell('spA', 'cancer', 'psmap_ca_yes'), ...cell('spA', 'grade_group', 'psmap_gg_3'),
      ...cell('spA', 'gleason_primary', 'psmap_gp_4'), ...cell('spA', 'gleason_secondary', 'psmap_gs_3'),
      ...cell('spB', 'site', 'psmap_site_r_mid_lat'), ...cell('spB', 'cancer', 'psmap_ca_yes'), ...cell('spB', 'grade_group', 'psmap_gg_5'),
      ...cell('spB', 'gleason_primary', 'psmap_gp_4'), ...cell('spB', 'gleason_secondary', 'psmap_gs_5'),
    };
    const m = resolveProstateMap({ binding, answers: two, scheme, templateId: needle.id, instanceId: 'i2', rows });
    expect(m.sectors.find(s => s.id === 'r_mid_lat')!.details).toMatchObject({ gradeGroup: 5, gleason: '4+5=9' });
  });
  it('the result does not depend on the order of the parts (greatest % and length of the positive cores)', () => {
    const a = { ...cell('spA', 'site', 'psmap_site_l_mid_lat'), ...cell('spA', 'cancer', 'psmap_ca_yes'), ...cell('spA', 'grade_group', 'psmap_gg_1'), ...cell('spA', 'percent', '80'), ...cell('spA', 'length', '9') };
    const b = { ...cell('spB', 'site', 'psmap_site_l_mid_lat'), ...cell('spB', 'cancer', 'psmap_ca_yes'), ...cell('spB', 'grade_group', 'psmap_gg_2'), ...cell('spB', 'percent', '5'), ...cell('spB', 'length', '15') };
    const c = { ...cell('spC', 'site', 'psmap_site_l_mid_lat'), ...cell('spC', 'cancer', 'psmap_ca_no'), ...cell('spC', 'length', '20') };
    const forward = resolveProstateMap({ binding, answers: { ...a, ...b, ...c }, scheme, templateId: needle.id, instanceId: 'i2', rows });
    const backward = resolveProstateMap({ binding, answers: { ...a, ...b, ...c }, scheme, templateId: needle.id, instanceId: 'i2', rows: [...rows].reverse() });
    const detail = (m: typeof forward) => m.sectors.find(s => s.id === 'l_mid_lat')!.details;
    expect(detail(forward)).toEqual({ parts: ['A', 'B', 'C'], gradeGroup: 2, percent: 80, lengthMm: 15 });
    expect(detail(backward)).toMatchObject({ gradeGroup: 2, percent: 80, lengthMm: 15 });
    expect(forward.sectors.find(s => s.id === 'l_mid_lat')!.category).toBe('gg2');
  });
  it('sites without a core are not sampled; a targeted site shows only when sampled', () => {
    expect(by('l_base_lat')!.category).toBe('notSampled');
    expect(by('target_2')!.category).toBe('benign');
    expect(by('target_1')).toBeUndefined();
    expect(p.sectors).toHaveLength(13);
  });
  it('a single positive core keeps its Gleason score and length', () => {
    const one = resolveProstateMap({ binding, answers: Object.fromEntries(Object.entries(answers).filter(([k]) => k.includes('__spA__'))), scheme, templateId: needle.id, instanceId: 'i2', rows });
    expect(one.sectors.find(s => s.id === 'r_mid_lat')!.details).toEqual({ parts: ['A'], gradeGroup: 2, gleason: '3+4=7', percent: 40, lengthMm: 14 });
  });
});

describe('drawing and words', () => {
  const sectors = resolveProstateMap({ binding: pathScribeDefaultBinding(radical as never)!, answers: { psmap_tumour_sectors: sec('r_mid_pzpl'), psmap_grade_group: 'psmap_gg_2', psmap_epe_sectors: sec('r_mid_pzpl'), psmap_margin_sectors: sec('r_mid_pzpl') }, scheme, templateId: radical.id, instanceId: 'i1' });
  const labels = organMapDrawingLabels(t, 'prostateSectors', scheme);

  it('the report image stands alone: white background, its own colours and patterns, title and legend', () => {
    const svg = renderOrganMapSvg(sectors, scheme, labels);
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg).toContain('fill="#ffffff"');
    expect(svg).toContain('id="om-pat-gg2"');
    expect(svg).toContain(scheme.gg2.colour);
    expect(svg).toContain('organMap.title.prostateSectors');
    expect(svg).toContain('organMap.legend.positiveMargin');
    expect(svg).toContain('stroke-width="6"'); // two overlays on one sector: the first drawn wider
    expect(svg).not.toContain('var(--');
  });
  it('inline text, in the user language: the zone on the sector map; parts and result on the biopsy map', () => {
    const tt = (k: string, o: Record<string, unknown> = {}) => (k === 'organMap.details.separator' ? `${o.a} · ${o.b}` : k === 'organMap.details.partsJoin' ? `${o.a}, ${o.b}` : k === 'organMap.inline.gradeGroup' ? `GG${o.n}` : k === 'organMap.inline.percent' ? `${o.n}%` : k);
    expect(organMapInlineText(tt, 'prostateSectors', undefined, 'r_mid_pzpl')).toEqual(['organMap.prostate.short.zone.PZpl']);
    expect(organMapInlineText(tt, 'prostateSectors', undefined, 'l_sv')).toEqual(['organMap.prostate.short.sv']);
    expect(organMapInlineText(tt, 'prostateBiopsy', undefined, 'r_mid_lat')).toEqual(['organMap.inline.notSampled']);
    expect(organMapInlineText(tt, 'prostateBiopsy', { id: 'x', category: 'gg2', pattern: 'hatch', overlays: [], details: { parts: ['B', 'C'], gradeGroup: 2, percent: 70 } }, 'x')).toEqual(['B, C', 'GG2 · 70%']);
    expect(organMapInlineText(tt, 'prostateBiopsy', { id: 'x', category: 'benign', pattern: 'none', overlays: [], details: { parts: ['D'] } }, 'x')).toEqual(['D']);
  });
  it('names sectors and sites in the user language, and a site wording wins in the legend', () => {
    expect(organMapSectorName(t, 'prostateSectors', 'r_mid_pzpl')).toBe('organMap.prostate.sectorName{"side":"organMap.prostate.side.right","level":"organMap.prostate.level.mid","zone":"organMap.prostate.zone.PZpl"}');
    expect(organMapSectorName(t, 'prostateBiopsy', 'target_3')).toBe('organMap.prostate.targetName{"n":3}');
    expect(organMapLegendLabel(t, { ...scheme, gg1: { ...scheme.gg1, label: 'Low grade' } }, 'gg1')).toBe('Low grade');
    const summary = organMapSectorSummary((k, o) => (k === 'organMap.details.separator' ? `${o!.a} | ${o!.b}` : k), 'prostateSectors', sectors.sectors.find(s => s.id === 'r_mid_pzpl')!, scheme);
    expect(summary.split(' | ')).toEqual(['organMap.prostate.sectorName', 'organMap.legend.gg2', 'organMap.legend.epe', 'organMap.legend.positiveMargin']);
  });
});
