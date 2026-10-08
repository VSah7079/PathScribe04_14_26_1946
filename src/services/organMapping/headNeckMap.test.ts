// @vitest-environment happy-dom
// src/services/organMapping/headNeckMap.test.ts
// Batch 465: the head and neck maps — the oral cavity (subsites with tumour;
// the peripheral and deep margins judged by the site's involved and close
// rules, < 1 mm and < 5 mm by default; dysplasia at the mucosal margin; the
// depth of invasion) and the neck dissection (a grid row per level and side;
// metastasis, nodes examined, the largest deposit and ENEmi / ENEma). Two
// synoptics that sit on one case. The rules, bindings, configuration helpers,
// drawing and words, and the demo case.
import { describe, expect, it } from 'vitest';
import oralTpl from '@/data/templates/generic/oral_cavity_resection.json';
import neckTpl from '@/data/templates/generic/neck_dissection.json';
import { PROTOCOL_REGISTRY } from '@/components/Config/Protocols/protocolShared';
import { mockCaseService } from '../cases/mockCaseService';
import { pathScribeDefaultBinding, validateOrganMapBinding, NECK_LEVEL_IDS, type FieldInputsBinding, type NeckDissectionBinding } from './organMapBindings';
import { BUILT_IN_ORGAN_MAP_SCHEME, BUILT_IN_ORGAN_MAP_THRESHOLDS, THRESHOLD_ROWS, validateOrganMapScheme, type OrganMapThresholds } from './organMapScheme';
import { resolveOrganMap } from './resolveProstateMap';
import { effectiveOralThresholds, oralMarginCategory } from './resolveHeadNeckMap';
import { organMapThresholdConflicts, saveOrganMapSchemeLayer, type OrganMapConfigStore } from './organMapConfig';
import { organMapLayout, renderOrganMapSvg } from './organMapDrawing';
import { organMapInlineText, organMapLabelsFor, organMapSectorName, organMapSectorSummary } from './organMapLabels';
import {
  bindableFields, bindingProblemInputKey, emptyOrganMapBinding, fieldInputValueKey, organMapHeadNeckPreviews, withNeckColumn, withNeckEneValue, withNeckGrid, withNeckRow,
} from './organMapConfigDraft';
import { ORAL_SUBSITES } from './headNeckGeometry';

const scheme = BUILT_IN_ORGAN_MAP_SCHEME;
const T = BUILT_IN_ORGAN_MAP_THRESHOLDS;
const oralBinding = pathScribeDefaultBinding(oralTpl as never) as FieldInputsBinding;
const neckBinding = pathScribeDefaultBinding(neckTpl as never) as NeckDissectionBinding;
const O = 'psmap_oc_'; const G = 'psmap_nd_levels';
const oral = (answers: Record<string, string | string[]>, thresholds: OrganMapThresholds = T) =>
  resolveOrganMap({ binding: oralBinding, answers, scheme, thresholds, templateId: oralTpl.id, instanceId: 'i1' });
const neck = (answers: Record<string, string>, binding: NeckDissectionBinding = neckBinding) =>
  resolveOrganMap({ binding, answers, scheme, thresholds: T, templateId: neckTpl.id, instanceId: 'i2' });
const cell = (row: string, col: string) => `${G}__${row}__${col}`;
const cat = (p: { sectors: { id: string; category: string }[] }) => Object.fromEntries(p.sectors.map(s => [s.id, s.category]));
const t = (k: string, o: Record<string, unknown> = {}) => `${k}${Object.keys(o).length ? JSON.stringify(o) : ''}`;

describe('the oral cavity margin rules (Pete: involved < 1 mm, close 1–5 mm; each a distance and an operator, per site)', () => {
  it('defaults: < 1 mm involved, 1–5 mm close (5 mm included, RCPath), beyond 5 mm clear; 0 mm always involved; no distance = not given', () => {
    expect([T.oralInvolvedMarginMm, T.oralInvolvedMarginOperator, T.oralCloseMarginMm, T.oralCloseMarginOperator]).toEqual([1, 'lt', 5, 'lte']);
    expect([0, 0.9, 1, 4.9, 5, 5.1, 12, undefined].map(mm => oralMarginCategory(mm, T)))
      .toEqual(['marginPositive', 'marginPositive', 'marginClose', 'marginClose', 'marginClose', 'marginClear', 'marginClear', 'notSampled']);
  });
  it('a site that sets ≤ 1 mm and ≤ 5 mm moves the boundaries', () => {
    const site = { ...T, oralInvolvedMarginOperator: 'lte' as const, oralCloseMarginOperator: 'lte' as const };
    expect([1, 5, 5.1].map(mm => oralMarginCategory(mm, site))).toEqual(['marginPositive', 'marginClose', 'marginClear']);
  });
  it('the settings are threshold rows; a close distance below the involved one is refused; out-of-range values are refused', () => {
    expect(THRESHOLD_ROWS.map(r => r.key)).toEqual(expect.arrayContaining(['oralInvolvedMarginMm', 'oralCloseMarginMm']));
    expect(validateOrganMapScheme({ thresholds: { oralInvolvedMarginMm: 2, oralCloseMarginMm: 1 } })).toEqual([{ key: 'oralCloseMarginMm', problem: 'closeBelowInvolved' }]);
    expect(validateOrganMapScheme({ thresholds: { oralInvolvedMarginMm: 11 } }).map(p => p.problem)).toEqual(['threshold']);
    expect(validateOrganMapScheme({ thresholds: { oralCloseMarginMm: 3, oralCloseMarginOperator: 'eq' } }).map(p => p.problem)).toEqual(['equalsNeedsZero']);
    // With what the layer inherits: one value set alone is checked against the other.
    expect(validateOrganMapScheme({ thresholds: { oralCloseMarginMm: 0.5 } }, T)).toEqual([{ key: 'oralCloseMarginMm', problem: 'closeBelowInvolved' }]);
    // Batch 465b (Pete): strictly — involved below close, so equal distances are refused too.
    expect(validateOrganMapScheme({ thresholds: { oralCloseMarginMm: 1 } }, T)).toEqual([{ key: 'oralCloseMarginMm', problem: 'closeBelowInvolved' }]);
    expect(validateOrganMapScheme({ thresholds: { oralCloseMarginOperator: 'eq' } }, T)).toEqual([{ key: 'oralCloseMarginOperator', problem: 'equalsNeedsZero' }]);
    expect(validateOrganMapScheme({ eneMajor: { colour: '#000000' } }, { ...T, oralCloseMarginMm: 0.5 })).toEqual([]);
  });
});

describe('the oral cavity map', () => {
  it('PathScribe’s questions bind themselves (every input, each subsite option)', () => {
    expect(Object.keys(oralBinding.inputs).sort()).toEqual(['deepMarginMm', 'doiMm', 'mucosalDysplasia', 'peripheralMarginMm', 'subsites']);
    expect(Object.values((oralBinding.inputs.subsites as { values: Record<string, string> }).values).sort()).toEqual([...ORAL_SUBSITES].sort());
    expect(validateOrganMapBinding(oralBinding, oralTpl as never)).toEqual([]);
  });
  it('subsites with tumour show carcinoma; the margins by the rules; dysplasia outlined on the mucosal margin; depth printed', () => {
    const m = oral({ [`${O}subsites`]: [`${O}subsites_tongueR`, `${O}subsites_floorR`], [`${O}peripheralMarginMm`]: '3', [`${O}deepMarginMm`]: '0.6', [`${O}mucosalDysplasia`]: `${O}mucosalDysplasia_highGrade`, [`${O}doiMm`]: '7' });
    const k = cat(m);
    expect([k.tongueR, k.floorR, k.tongueL, k.hardPalate, k.mPeripheral, k.mDeep]).toEqual(['invasive', 'invasive', 'benign', 'benign', 'marginClose', 'marginPositive']);
    expect(m.sectors.find(s => s.id === 'mPeripheral')!.overlays.map(o => o.key)).toEqual(['dysplasiaAtMargin']);
    expect(m.sectors.find(s => s.id === 'mDeep')!.details).toEqual({ marginMm: 0.6, involved: true });
    expect(m.meta).toEqual({ rule: 'lt:1|lte:5', doi: '7', dysplasia: 'highGrade' });
    expect(m.hasData).toBe(true);
  });
  it('no dysplasia (or none given): no outline; nothing answered: no data, margins not given', () => {
    const m = oral({ [`${O}mucosalDysplasia`]: `${O}mucosalDysplasia_absent`, [`${O}peripheralMarginMm`]: '8' });
    expect(m.sectors.find(s => s.id === 'mPeripheral')!.overlays).toEqual([]);
    expect(cat(m).mPeripheral).toBe('marginClear');
    const none = oral({});
    expect([none.hasData, cat(none).mDeep]).toEqual([false, 'notSampled']);
  });
  it('a negative distance is not a distance', () => {
    expect(cat(oral({ [`${O}deepMarginMm`]: '-2' })).mDeep).toBe('notSampled');
  });
  it('a change to the site’s rule changes the map and its fingerprint', () => {
    const a = { [`${O}deepMarginMm`]: '4' };
    const before = oral(a); const after = oral(a, { ...T, oralCloseMarginMm: 3 });
    expect([cat(before).mDeep, cat(after).mDeep]).toEqual(['marginClose', 'marginClear']);
    expect(before.fingerprint).not.toBe(after.fingerprint);
  });
});

describe('the neck dissection map (Pete: a grid row per level and side; ENEmi / ENEma)', () => {
  it('PathScribe’s levels grid binds itself: 20 rows, the four columns, the ENE meanings', () => {
    expect(Object.keys(neckBinding.grid!.rows)).toHaveLength(20);
    expect(Object.keys(neckBinding.grid!.rows).sort()).toEqual([...NECK_LEVEL_IDS].sort());
    expect(neckBinding.grid!.columns).toEqual({ positive: 'positive', examined: 'examined', largest: 'largest', ene: 'ene' });
    expect(neckBinding.grid!.eneValues).toEqual({ psmap_nd_ene_absent: 'absent', psmap_nd_ene_minor: 'minor', psmap_nd_ene_major: 'major' });
    expect(validateOrganMapBinding(neckBinding, neckTpl as never)).toEqual([]);
  });
  it('metastasis, no tumour, not dissected; ENE outlines (major heavier); totals and worst ENE', () => {
    const m = neck({
      [cell('R_IIa', 'positive')]: '2', [cell('R_IIa', 'examined')]: '6', [cell('R_IIa', 'largest')]: '18', [cell('R_IIa', 'ene')]: 'psmap_nd_ene_major',
      [cell('R_III', 'positive')]: '1', [cell('R_III', 'examined')]: '5', [cell('R_III', 'ene')]: 'psmap_nd_ene_minor',
      [cell('R_IV', 'positive')]: '0', [cell('R_IV', 'examined')]: '7',
    });
    const k = cat(m);
    expect([k.R_IIa, k.R_III, k.R_IV, k.R_Ib, k.L_IIa]).toEqual(['invasive', 'invasive', 'benign', 'notSampled', 'notSampled']);
    expect(m.sectors.find(s => s.id === 'R_IIa')!.overlays.map(o => o.key)).toEqual(['eneMajor']);
    expect(m.sectors.find(s => s.id === 'R_III')!.overlays.map(o => o.key)).toEqual(['eneMinor']);
    expect(m.sectors.find(s => s.id === 'R_IIa')!.details).toEqual({ nodesPositive: 2, nodesExamined: 6, largestMm: 18, ene: 'major' });
    expect(m.meta).toEqual({ positive: '3', examined: '18', ene: 'major' });
  });
  it('an ENE or a deposit size alone also means metastasis; nothing reported: no data', () => {
    expect(cat(neck({ [cell('L_Ib', 'ene')]: 'psmap_nd_ene_minor' })).L_Ib).toBe('invasive');
    expect(cat(neck({ [cell('L_Ib', 'largest')]: '4' })).L_Ib).toBe('invasive');
    expect(cat(neck({ [cell('L_Ib', 'ene')]: 'psmap_nd_ene_absent', [cell('L_Ib', 'examined')]: '3' })).L_Ib).toBe('benign');
    expect(neck({}).hasData).toBe(false);
  });
  it('no tumour needs nodes examined: 0 of 0, only “ENE not identified”, or a negative count is not reported', () => {
    const m = neck({
      [cell('L_Ia', 'positive')]: '0', [cell('L_Ia', 'examined')]: '0',
      [cell('L_Ib', 'ene')]: 'psmap_nd_ene_absent',
      [cell('L_IIa', 'positive')]: '-2',
    });
    expect([cat(m).L_Ia, cat(m).L_Ib, cat(m).L_IIa]).toEqual(['notSampled', 'notSampled', 'notSampled']);
  });
  it('the caption says ENE wasn’t recorded unless a row records it (absent included)', () => {
    expect(neck({ [cell('R_III', 'positive')]: '2', [cell('R_III', 'examined')]: '5' }).meta!.ene).toBe('notGiven');
    expect(neck({ [cell('R_III', 'positive')]: '0', [cell('R_III', 'examined')]: '5', [cell('R_III', 'ene')]: 'psmap_nd_ene_absent' }).meta!.ene).toBe('absent');
  });
  it('a lab grid with two rows bound to one level adds them up (largest and worst ENE win)', () => {
    const lab: NeckDissectionBinding = { mapType: 'neckDissection', grid: { fieldId: 'g', rows: { a: 'L_II' + 'a', b: 'L_IIa' }, columns: { positive: 'p', examined: 'e', largest: 'z', ene: 'x' }, eneValues: { mi: 'minor', ma: 'major' } } };
    const m = resolveOrganMap({ binding: lab, answers: { g__a__p: '1', g__a__e: '3', g__a__z: '9', g__a__x: 'ma', g__b__p: '0', g__b__e: '4', g__b__z: '2', g__b__x: 'mi' }, scheme, thresholds: T, templateId: 't', instanceId: 'i' });
    expect(m.sectors.find(s => s.id === 'L_IIa')!.details).toEqual({ nodesPositive: 1, nodesExamined: 7, largestMm: 9, ene: 'major' });
  });
  it('validation: no grid, an unknown level, a missing required column, an unknown ENE meaning', () => {
    expect(validateOrganMapBinding({ mapType: 'neckDissection' }, neckTpl as never)).toEqual([{ input: 'neckGrid', problem: 'fieldMissing' }]);
    const bad: NeckDissectionBinding = { mapType: 'neckDissection', grid: { ...neckBinding.grid!, rows: { ...neckBinding.grid!.rows, R_Ia: 'R_XI' }, columns: { positive: '', examined: 'examined' }, eneValues: { psmap_nd_ene_major: 'huge' } } };
    expect(validateOrganMapBinding(bad, neckTpl as never)).toEqual(expect.arrayContaining([
      { input: 'neckGrid', problem: 'unknownValue' }, { input: 'neckGrid.positive', problem: 'fieldMissing' }, { input: 'neckGrid.ene', problem: 'unknownValue' },
    ]));
    // A count bound to a choice column; an ENE column with no meanings; meanings for answers the column doesn't have.
    const g = neckBinding.grid!;
    expect(validateOrganMapBinding({ mapType: 'neckDissection', grid: { ...g, columns: { ...g.columns, positive: 'ene' } } }, neckTpl as never)).toEqual([{ input: 'neckGrid.positive', problem: 'fieldMissing' }]);
    expect(validateOrganMapBinding({ mapType: 'neckDissection', grid: { ...g, eneValues: {} } }, neckTpl as never)).toEqual([{ input: 'neckGrid.ene', problem: 'noValues' }]);
    expect(validateOrganMapBinding({ mapType: 'neckDissection', grid: { ...g, eneValues: { ...g.eneValues, other: 'minor' } } }, neckTpl as never)).toEqual([{ input: 'neckGrid.ene', problem: 'unknownValue' }]);
  });
});

describe('Configuration', () => {
  it('an empty neck binding; the grids to pick from; the levels a grid’s own rows bind to', () => {
    expect(emptyOrganMapBinding('neckDissection')).toEqual({ mapType: 'neckDissection' });
    expect(emptyOrganMapBinding('oralCavity')).toEqual({ mapType: 'oralCavity', inputs: {} });
    expect(bindableFields(neckTpl as never, 'neckDissection').map(f => f.id)).toEqual([G]);
    const b = withNeckGrid({ mapType: 'neckDissection' }, G, neckTpl as never);
    expect(Object.keys(b.grid!.rows)).toHaveLength(20);
    expect(withNeckGrid(b, '')).toEqual({ mapType: 'neckDissection' });
  });
  it('rows, columns and ENE meanings; choosing another ENE column starts its meanings again', () => {
    let b = withNeckGrid({ mapType: 'neckDissection' }, G, neckTpl as never);
    b = withNeckRow(b, 'R_Ia', ''); expect(b.grid!.rows.R_Ia).toBeUndefined();
    b = withNeckColumn(b, 'positive', 'positive'); b = withNeckColumn(b, 'ene', 'ene');
    b = withNeckEneValue(b, 'psmap_nd_ene_major', 'major');
    expect(b.grid!.eneValues).toEqual({ psmap_nd_ene_major: 'major' });
    b = withNeckColumn(b, 'ene', ''); expect([b.grid!.columns.ene, b.grid!.eneValues]).toEqual([undefined, {}]);
    expect(withNeckColumn(b, 'examined', '').grid!.columns.examined).toBe('');
  });
  it('problem and value wording keys', () => {
    expect(bindingProblemInputKey('neckGrid')).toBe('neck.gridQuestion');
    expect(bindingProblemInputKey('neckGrid.ene')).toBe('neck.columns.ene');
    expect(bindingProblemInputKey('subsites')).toBe('colorectal.inputs.subsites');
    expect(fieldInputValueKey('oralCavity', 'subsites', 'tongueR')).toBe('organMap.headNeck.oral.sector.tongueR');
    expect(fieldInputValueKey('oralCavity', 'mucosalDysplasia', 'highGrade')).toBe('organMap.headNeck.value.highGrade');
    expect(fieldInputValueKey('colorectalPolyp', 'paris', '0-Ip')).toBe('organMap.colorectal.value.0-Ip');
  });
  it('the previews show every new colour: carcinoma, close and involved margins, dysplasia, ENEmi and ENEma', () => {
    const [o, n] = organMapHeadNeckPreviews(scheme, T);
    const keys = [...o.sectors, ...n.sectors].flatMap(s => [s.category, ...s.overlays.map(x => x.key)]);
    expect(keys).toEqual(expect.arrayContaining(['invasive', 'marginClose', 'marginPositive', 'dysplasiaAtMargin', 'eneMinor', 'eneMajor', 'benign', 'notSampled']));
  });
  it('both synoptics are PathScribe’s, in the registry with their real field counts', () => {
    for (const tpl of [oralTpl, neckTpl]) {
      const entry = PROTOCOL_REGISTRY.find(p => p.id === tpl.id)!;
      expect([entry.source, entry.fields]).toEqual(['PathScribe', tpl.sections.reduce((n, s) => n + s.fields.length, 0)]);
    }
  });
});

describe('drawing and words', () => {
  it('layouts: every sector has a shape', () => {
    const o = organMapLayout('oralCavity'); const n = organMapLayout('neckDissection');
    expect(o.shapes.map(s => s.id).sort()).toEqual([...ORAL_SUBSITES, 'mPeripheral', 'mDeep'].sort());
    expect(n.shapes.map(s => s.id).sort()).toEqual([...NECK_LEVEL_IDS].sort());
    expect(n.guides).toBeTruthy();
  });
  it('names, inline text, summaries and captions', () => {
    expect(organMapSectorName(t, 'neckDissection', 'R_IIa')).toBe('organMap.headNeck.neck.levelName{"side":"organMap.headNeck.neck.side.R","level":"IIa"}');
    expect(organMapSectorName(t, 'oralCavity', 'buccalL')).toBe('organMap.headNeck.oral.sector.buccalL');
    const m = neck({ [cell('R_IIa', 'positive')]: '2', [cell('R_IIa', 'examined')]: '6', [cell('R_IIa', 'largest')]: '18', [cell('R_IIa', 'ene')]: 'psmap_nd_ene_major' });
    const s = m.sectors.find(x => x.id === 'R_IIa')!;
    expect(organMapInlineText(t, 'neckDissection', s, 'R_IIa')).toEqual(['IIa', 'organMap.headNeck.neck.inlineNodes{"p":2,"e":6}']);
    expect(organMapInlineText(t, 'neckDissection', m.sectors.find(x => x.id === 'R_Ia'), 'R_Ia')).toEqual(['Ia']);
    const sep = (k: string, o: Record<string, unknown> = {}) => (k === 'organMap.details.separator' ? `${o.a} · ${o.b}` : t(k, o));
    const summary = organMapSectorSummary(sep, 'neckDissection', s, scheme);
    expect(summary).toContain('organMap.headNeck.details.nodes{"p":2,"e":6}');
    expect(summary).toContain('organMap.headNeck.details.largest{"n":18}');
    expect(summary.match(/eneMajor|ene\.major/g)).toHaveLength(1);
    expect(organMapLabelsFor(sep, m, scheme).captions.totals).toBe('organMap.headNeck.neck.totals{"p":2,"e":6} · organMap.headNeck.neck.ene.major');
    const o = oral({ [`${O}deepMarginMm`]: '0.6', [`${O}doiMm`]: '7', [`${O}mucosalDysplasia`]: `${O}mucosalDysplasia_lowGrade` });
    const oc = organMapLabelsFor(t, o, scheme).captions;
    expect(oc['rule.involved']).toBe('organMap.headNeck.oral.ruleInvolved{"op":"organMap.colorectal.operator.lt","n":1}');
    expect(oc['rule.close']).toBe('organMap.headNeck.oral.ruleClose{"op":"organMap.colorectal.operator.lte","n":5}');
    expect(oc.doi).toBe('organMap.headNeck.oral.caption.doi{"n":7}');
    expect(oc.dysplasia).toBe('organMap.headNeck.oral.caption.dysplasia.lowGrade');
    expect(organMapLabelsFor(t, oral({}), scheme).captions.doi).toBe('organMap.headNeck.oral.caption.doiNotGiven');
    expect(organMapInlineText(t, 'oralCavity', o.sectors.find(x => x.id === 'mDeep'), 'mDeep')).toEqual(['organMap.headNeck.inline.mm{"n":0.6}']);
  });
  it('the report image draws ENEma heavier than ENEmi', () => {
    const [, n] = organMapHeadNeckPreviews(scheme, T);
    const svg = renderOrganMapSvg(n, scheme, organMapLabelsFor(t, n, scheme));
    expect(svg).toContain(`stroke="${scheme.eneMajor.colour}" stroke-width="5"`);
    expect(svg).toContain(`stroke="${scheme.eneMinor.colour}" stroke-width="3"`);
    // A white halo under each outline keeps it visible on the metastasis fill; Batch 465b: with a thin dark edge
    // outside it (0.5 each side), for light and dark backgrounds.
    expect(svg).toContain('stroke="#ffffff" stroke-width="8"');
    expect(svg).toContain('stroke="#111827" stroke-opacity="0.6" stroke-width="9"');
    expect(svg).toContain('organMap.title.neckDissection');
  });
});

describe('demo case S26-4466 (composite: partial glossectomy and right neck dissection on one case)', () => {
  it('two specimens, two synoptics, two maps', async () => {
    const c = (await mockCaseService.getCase('S26-4466'))!;
    const [oi, ni] = c.synopticReports!;
    expect([oi.templateId, ni.templateId]).toEqual(['oral_cavity_resection', 'neck_dissection']);
    const o = oral(oi.answers as never);
    expect([cat(o).tongueR, cat(o).floorR, cat(o).mDeep, cat(o).mPeripheral, o.meta!.doi]).toEqual(['invasive', 'invasive', 'marginPositive', 'marginClose', '7']);
    const n = neck(ni.answers as never);
    expect([cat(n).R_IIa, cat(n).R_III, cat(n).R_IV, cat(n).L_IIa]).toEqual(['invasive', 'invasive', 'benign', 'notSampled']);
    expect(n.meta).toEqual({ positive: '3', examined: '27', ene: 'major' });
  });
});

describe('Batch 465b: inherited threshold conflicts (Pete: sanity check, warning, fallback guardrail)', () => {
  const memStore = (layers = {}) => { let l: never = layers as never; return { getLayers: () => l, setLayers: (n: never) => { l = n; }, getBindings: () => ({}), setBindings: () => {} } as unknown as OrganMapConfigStore; };
  const deps = (store: OrganMapConfigStore, audits: string[] = []) => ({ enforce: async () => ({ allowed: true }), logAudit: (e: { detail: string }) => { audits.push(e.detail); }, userName: 'Admin', store });
  it('a parent change that leaves a lower layer’s close distance at or below the involved one saves, with a warning and an audit note', async () => {
    const store = memStore({ facilities: { F1: { thresholds: { oralCloseMarginMm: 3 } } } });
    const audits: string[] = [];
    const r = await saveOrganMapSchemeLayer({ scope: { kind: 'jurisdiction', code: 'GB' }, layer: { thresholds: { oralInvolvedMarginMm: 4 } }, facilityJurisdictions: { F1: 'GB' } }, deps(store, audits));
    expect(r).toEqual({ ok: true, warnings: [{ scope: { kind: 'facility', facilityId: 'F1' }, involvedMm: 4, closeMm: 3 }] });
    expect(audits[0]).toContain('oral cavity rules now in conflict (involved not below close): facility F1 (4 mm / 3 mm)');
    // An unrelated save while the conflict stands: still warned, but the audit doesn't repeat it.
    const r2 = await saveOrganMapSchemeLayer({ scope: { kind: 'enterprise' }, layer: { gg1: { colour: '#123456' } }, facilityJurisdictions: { F1: 'GB' } }, deps(store, audits));
    expect(r2).toMatchObject({ ok: true, warnings: [{ scope: { kind: 'facility', facilityId: 'F1' } }] });
    expect(audits[1]).not.toContain('conflict');
    // A jurisdiction layer that sets a close distance conflicts with an enterprise involved distance above it.
    expect(organMapThresholdConflicts({ enterprise: { thresholds: { oralInvolvedMarginMm: 6, oralCloseMarginMm: 7 } }, jurisdictions: { GB: { thresholds: { oralCloseMarginMm: 5.5 } } } } as never))
      .toEqual([{ scope: { kind: 'jurisdiction', code: 'GB' }, involvedMm: 6, closeMm: 5.5 }]);
    // A facility in another jurisdiction, or one that doesn't set an oral distance, isn't in conflict.
    expect(organMapThresholdConflicts(store.getLayers(), { F1: 'FR' })).toEqual([]);
  });
  it('the map falls back: the involved rule stands, the close rule is PathScribe’s (≤ 5 mm), or none when that isn’t above involved', () => {
    expect(effectiveOralThresholds({ ...T, oralInvolvedMarginMm: 4, oralCloseMarginMm: 3 })).toEqual({ thresholds: { ...T, oralInvolvedMarginMm: 4 }, conflict: 'fallback' });
    const none = effectiveOralThresholds({ ...T, oralInvolvedMarginMm: 6, oralCloseMarginMm: 3 });
    expect([none.conflict, none.thresholds.oralCloseMarginMm]).toEqual(['none', 6]);
    expect(effectiveOralThresholds(T)).toEqual({ thresholds: T });
    const site = { ...T, oralInvolvedMarginMm: 4, oralCloseMarginMm: 3 };
    expect([3.9, 4, 5, 5.5].map(mm => oralMarginCategory(mm, site))).toEqual(['marginPositive', 'marginClose', 'marginClose', 'marginClear']);
    const m = oral({ [`${O}deepMarginMm`]: '4.5' }, site);
    expect(m.meta!.ruleConflict).toBe('fallback');
    expect(organMapLabelsFor(t, m, scheme).captions['rule.close']).toBe('organMap.headNeck.oral.ruleCloseFallback{"op":"organMap.colorectal.operator.lte","n":5}');
    expect(organMapLabelsFor(t, oral({ [`${O}deepMarginMm`]: '4.5' }, { ...T, oralInvolvedMarginMm: 6, oralCloseMarginMm: 3 }), scheme).captions['rule.close']).toBe('organMap.headNeck.oral.ruleCloseNone');
  });
});
