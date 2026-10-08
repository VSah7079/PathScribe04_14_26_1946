// @vitest-environment happy-dom
// src/services/organMapping/breastMap.test.ts
// Batch 462: the breast map — clock face with quadrants, foci markers, the six
// oriented margins with the site's close-margin threshold — worked out from
// the synoptic answers; the bindings, the drawing, the words and the demo cases.
import { describe, expect, it } from 'vitest';
import invasive from '@/data/templates/generic/breast_invasive.json';
import dcisTpl from '@/data/templates/generic/breast_dcis_resection.json';
import excision from '@/data/templates/generic/breast_surgical_excision.json';
import { mockCaseService } from '../cases/mockCaseService';
import { BREAST_FACES, breastQuadrantOfHour, breastShapes } from './breastGeometry';
import { pathScribeDefaultBinding, validateOrganMapBinding, type BreastClockBinding } from './organMapBindings';
import { BUILT_IN_ORGAN_MAP_SCHEME, resolveOrganMapScheme, validateOrganMapScheme, organMapSchemeChangeDetail , BUILT_IN_ORGAN_MAP_THRESHOLDS } from './organMapScheme';
import { resolveOrganMap } from './resolveProstateMap';
import { breastMarginCategory } from './resolveBreastMap';
import { renderOrganMapSvg } from './organMapDrawing';
import { organMapDrawingLabels, organMapInlineText, organMapLegendLabel, organMapSectorName, organMapSectorSummary } from './organMapLabels';
import {
  bindingProblemInputKey, breastBindableFields, emptyOrganMapBinding, inheritedOrganMapThresholds, marginGridRows, withBreastFoci,
  withBreastFociColumn, withBreastFociValue, withBreastMarginColumn, withBreastMarginRow, withBreastMargins, withBreastSide, withBreastSideValue, withThreshold,
} from './organMapConfigDraft';
import { partGridDisplay, partGridKey, partGridRowsForField } from '../templates/partGrid';

const scheme = BUILT_IN_ORGAN_MAP_SCHEME;
const binding = pathScribeDefaultBinding(invasive as never) as BreastClockBinding;
const foci = (row: number, col: string, v: string) => ({ [partGridKey('psmap_breast_foci', `r${row}`, col)]: v });
const margin = (face: string, col: 'invasive' | 'dcis', v: string) => ({ [partGridKey('psmap_breast_margins', face, col)]: v });
const map = (answers: Record<string, string>, close = 2) =>
  resolveOrganMap({ binding, answers, scheme, thresholds: { ...BUILT_IN_ORGAN_MAP_THRESHOLDS, breastCloseMarginMm: close }, templateId: invasive.id, instanceId: 'i1' });
const t = (k: string, o: Record<string, unknown> = {}) => `${k}${Object.keys(o).length ? JSON.stringify(o) : ''}`;

describe('templates and bindings', () => {
  it('the three breast templates carry the Anatomical map questions and bind themselves', () => {
    for (const tpl of [invasive, dcisTpl, excision]) {
      const b = pathScribeDefaultBinding(tpl as never) as BreastClockBinding;
      expect(b.mapType, tpl.id).toBe('breastClock');
      expect(b.side!.values).toEqual({ psmap_side_right: 'right', psmap_side_left: 'left' });
      expect(b.foci!.values.type).toEqual({ psmap_ftype_invasive: 'invasive', psmap_ftype_dcis: 'dcis', psmap_ftype_calcifications: 'calcifications' });
      expect(Object.keys(b.foci!.values.clock)).toHaveLength(13);
      expect(b.margins!.rows).toEqual(Object.fromEntries(BREAST_FACES.map(f => [f, f])));
      expect(validateOrganMapBinding(b, tpl as never)).toEqual([]);
    }
  });
  it('the foci grid has numbered rows; the margins grid a row per margin', () => {
    const fields = invasive.sections.flatMap(s => s.fields) as never[];
    const fociField = fields.find((f: { id: string }) => f.id === 'psmap_breast_foci')!;
    const marginField = fields.find((f: { id: string }) => f.id === 'psmap_breast_margins')!;
    expect(partGridRowsForField(fociField, [{ id: 'A', label: 'A' }]).map(r => r.id)).toEqual(['r1', 'r2', 'r3', 'r4', 'r5', 'r6']);
    expect(partGridRowsForField(marginField, []).map(r => r.id)).toEqual([...BREAST_FACES]);
    expect(partGridDisplay(marginField, [], { ...margin('posterior', 'invasive', '0') })).toBe('Posterior (deep): Invasive carcinoma: 0 mm');
  });
  it('validation: unknown meanings, missing grids and columns', () => {
    const tpl = invasive as never;
    expect(validateOrganMapBinding({ mapType: 'breastClock' }, tpl)).toEqual([{ input: 'foci', problem: 'fieldMissing' }]);
    expect(validateOrganMapBinding({ ...binding, side: { fieldId: 'psmap_breast_side', values: { psmap_side_right: 'up' } } }, tpl)).toEqual([{ input: 'side', problem: 'unknownValue' }]);
    expect(validateOrganMapBinding({ ...binding, foci: { ...binding.foci!, columns: { type: 'nope', clock: 'clock' } } }, tpl)).toEqual([{ input: 'foci.type', problem: 'fieldMissing' }, { input: 'foci', problem: 'noValues' }]);
    // meanings left over from another column don't count
    expect(validateOrganMapBinding({ ...binding, foci: { ...binding.foci!, values: { type: { stale: 'invasive' }, clock: binding.foci!.values.clock } } }, tpl)).toEqual([{ input: 'foci', problem: 'noValues' }]);
    // a margins grid needs its own rows, and only those can be bound
    expect(validateOrganMapBinding({ ...binding, margins: { ...binding.margins!, rows: { ...binding.margins!.rows, nowhere: 'superior' } } }, tpl)).toEqual([{ input: 'margins', problem: 'unknownValue' }]);
    expect(validateOrganMapBinding({ ...binding, margins: { ...binding.margins!, rows: { superior: 'top' } } }, tpl)).toEqual([{ input: 'margins', problem: 'unknownValue' }]);
  });
});

describe('the breast map, from the synoptic answers', () => {
  it('nothing until a map question is answered', () => {
    const p = map({});
    expect(p.hasData).toBe(false);
    expect(p.markers).toEqual([]);
    expect(p.sectors.filter(s => s.id.startsWith('h')).every(s => s.category === 'benign')).toBe(true);
  });
  it('a clock hour takes its most severe tumour (invasive over DCIS); calcifications alone leave it benign but are marked', () => {
    const p = map({
      psmap_breast_side: 'psmap_side_right',
      ...foci(1, 'type', 'psmap_ftype_dcis'), ...foci(1, 'clock', 'psmap_clock_10'),
      ...foci(2, 'type', 'psmap_ftype_invasive'), ...foci(2, 'clock', 'psmap_clock_10'), ...foci(2, 'distance', '4'), ...foci(2, 'size', '18'),
      ...foci(3, 'type', 'psmap_ftype_calcifications'), ...foci(3, 'clock', 'psmap_clock_2'),
      ...foci(4, 'type', 'psmap_ftype_dcis'), ...foci(4, 'clock', 'psmap_clock_central'),
      ...foci(5, 'clock', 'psmap_clock_5'), // no type: not a focus
    });
    const by = (id: string) => p.sectors.find(s => s.id === id)!;
    expect(p.side).toBe('right');
    expect(by('h10')).toMatchObject({ category: 'invasive', details: { foci: ['1', '2'] }, jumpFieldId: 'psmap_breast_foci' });
    expect(by('h2').category).toBe('benign');
    expect(by('central').category).toBe('dcis');
    expect(p.markers!.map(m => [m.label, m.category])).toEqual([['1', 'dcis'], ['2', 'invasive'], ['3', 'calcifications'], ['4', 'dcis']]);
    expect(p.markers![1].details).toEqual({ foci: ['2'], clock: 10, sizeMm: 18, distanceCm: 4 });
    expect(p.markers![1].id).toBe('focus_2');
    expect(p.legend.map(l => l.key)).toEqual(['benign', 'notSampled', 'invasive', 'dcis', 'calcifications']);
  });
  it('a focus further from the nipple is drawn further out; foci at one spot are fanned out', () => {
    const p = map({
      ...foci(1, 'type', 'psmap_ftype_dcis'), ...foci(1, 'clock', 'psmap_clock_3'), ...foci(1, 'distance', '1'),
      ...foci(2, 'type', 'psmap_ftype_dcis'), ...foci(2, 'clock', 'psmap_clock_3'), ...foci(2, 'distance', '6'),
      ...foci(3, 'type', 'psmap_ftype_dcis'), ...foci(3, 'clock', 'psmap_clock_3'), ...foci(3, 'distance', '6'),
    });
    const [a, b, c] = p.markers!;
    expect(b.x).toBeGreaterThan(a.x);
    expect([b.x, b.y]).not.toEqual([c.x, c.y]);
  });
  it('no two foci hide each other, even at nearby distances (S26-4401: 3 cm and 3.5 cm at 2 o’clock)', () => {
    const p = map({
      ...foci(1, 'type', 'psmap_ftype_invasive'), ...foci(1, 'clock', 'psmap_clock_2'), ...foci(1, 'distance', '3'),
      ...foci(2, 'type', 'psmap_ftype_dcis'), ...foci(2, 'clock', 'psmap_clock_2'), ...foci(2, 'distance', '3.5'),
      ...foci(3, 'type', 'psmap_ftype_dcis'), ...foci(3, 'clock', 'psmap_clock_2'),
      ...foci(4, 'type', 'psmap_ftype_dcis'), ...foci(4, 'clock', 'psmap_clock_central'),
      ...foci(5, 'type', 'psmap_ftype_dcis'), ...foci(5, 'clock', 'psmap_clock_central'),
    });
    const ms = p.markers!;
    for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) expect(Math.hypot(ms[i].x - ms[j].x, ms[i].y - ms[j].y), `${i}-${j}`).toBeGreaterThanOrEqual(20);
  });
  it('a lab grid whose rows are the case’s parts labels foci by part (A), never by specimen id', () => {
    const lab: BreastClockBinding = { mapType: 'breastClock', foci: { fieldId: 'g', columns: { type: 't', clock: 'c' }, values: { type: { i: 'invasive' }, clock: { ten: '10' } } } };
    const p = resolveOrganMap({ binding: lab, answers: { 'g__S26-1-SP-1__t': 'i', 'g__S26-1-SP-1__c': 'ten' }, scheme, templateId: 'x', instanceId: 'x', rows: [{ id: 'S26-1-SP-1', label: 'A' }] });
    expect(p.markers!.map(m => [m.id, m.label])).toEqual([['focus_A', 'A']]);
    expect(JSON.stringify(p)).not.toContain('S26-1-SP-1');
  });
  it('several rows bound to one face show the closest; a negative distance is not given', () => {
    const lab: BreastClockBinding = { mapType: 'breastClock', margins: { fieldId: 'm', rows: { supA: 'superior', supP: 'superior', inf: 'inferior' }, columns: { invasive: 'i' } } };
    const p = resolveOrganMap({ binding: lab, answers: { m__supA__i: '0', m__supP__i: '5', m__inf__i: '-1' }, scheme, templateId: 'x', instanceId: 'x' });
    expect(p.sectors.find(s => s.id === 'm_superior_inv')).toMatchObject({ category: 'marginPositive', details: { marginMm: 0 } });
    expect(p.sectors.find(s => s.id === 'm_inferior_inv')!.category).toBe('notSampled');
  });
  it('margins: 0 mm is positive, under the site threshold close, otherwise clear; blank not given', () => {
    expect([0, 1.9, 2, 5].map(mm => breastMarginCategory(mm, 2))).toEqual(['marginPositive', 'marginClose', 'marginClear', 'marginClear']);
    expect(breastMarginCategory(undefined, 2)).toBe('notSampled');
    const answers = { ...margin('posterior', 'invasive', '0'), ...margin('superior', 'dcis', '1.5'), ...margin('lateral', 'invasive', '2.5') };
    const at = (p: ReturnType<typeof map>, id: string) => p.sectors.find(s => s.id === id)!;
    const two = map(answers);
    expect(at(two, 'm_posterior_inv')).toMatchObject({ category: 'marginPositive', details: { marginMm: 0 }, jumpFieldId: 'psmap_breast_margins' });
    expect(at(two, 'm_superior_dcis').category).toBe('marginClose');
    expect(at(two, 'm_lateral_inv').category).toBe('marginClear');
    expect(at(two, 'm_medial_inv').category).toBe('notSampled');
    // a site that uses 1 mm (some UK labs): 1.5 mm is clear; one that uses 3 mm: 2.5 mm is close
    expect(at(map(answers, 1), 'm_superior_dcis').category).toBe('marginClear');
    expect(at(map(answers, 3), 'm_lateral_inv').category).toBe('marginClose');
    // and the report image's fingerprint follows the threshold's verdict
    expect(map(answers, 1).fingerprint).not.toBe(two.fingerprint);
  });
});

describe('quadrants, words and the drawing', () => {
  it('quadrants depend on the side (facing the patient: right breast outer on the viewer’s left)', () => {
    expect([10, 2, 7, 4].map(h => breastQuadrantOfHour(h, 'right'))).toEqual(['UOQ', 'UIQ', 'LOQ', 'LIQ']);
    expect([10, 2, 7, 4].map(h => breastQuadrantOfHour(h, 'left'))).toEqual(['UIQ', 'UOQ', 'LIQ', 'LOQ']);
    expect([12, 3, 6, 9].map(h => breastQuadrantOfHour(h, 'right'))).toEqual([undefined, undefined, undefined, undefined]);
    expect(breastQuadrantOfHour(10, undefined)).toBeUndefined();
  });
  it('medial and lateral swap sides in the margin diagram with the breast', () => {
    const x = (side: 'right' | 'left', id: string) => breastShapes(side).find(s => s.id === id)!.labelX;
    expect(x('right', 'm_lateral_inv')).toBeLessThan(x('right', 'm_medial_inv'));
    expect(x('left', 'm_lateral_inv')).toBeGreaterThan(x('left', 'm_medial_inv'));
  });
  it('names, legend and summaries', () => {
    expect(organMapSectorName(t, 'breastClock', 'h10', 'right')).toBe('organMap.breast.inQuadrant{"name":"organMap.breast.hourName{\\"n\\":10}","quadrant":"organMap.breast.quadrantName.UOQ"}');
    expect(organMapSectorName(t, 'breastClock', 'm_posterior_dcis')).toBe('organMap.breast.marginName{"face":"organMap.breast.face.posterior","kind":"organMap.breast.kind.dcis"}');
    expect(organMapSectorName(t, 'breastClock', 'focus_3')).toBe('organMap.breast.focusName{"n":"3"}');
    expect(organMapLegendLabel(t, scheme, 'notSampled', 'breastClock')).toBe('organMap.legendByMap.breastClock.notSampled');
    expect(organMapLegendLabel(t, scheme, 'notSampled', 'prostateBiopsy')).toBe('organMap.legend.notSampled');
    const p = map({ ...margin('anterior', 'dcis', '1.5') });
    expect(organMapInlineText(t, 'breastClock', p.sectors.find(s => s.id === 'm_anterior_dcis'), 'm_anterior_dcis')).toEqual(['organMap.inline.mm{"n":1.5}']);
    expect(organMapInlineText(t, 'breastClock', p.sectors.find(s => s.id === 'm_anterior_inv'), 'm_anterior_inv')).toEqual(['organMap.inline.notSampled']);
    expect(organMapInlineText(t, 'breastClock', p.sectors.find(s => s.id === 'h1'), 'h1')).toEqual([]);
    const summary = organMapSectorSummary((k, o) => (k === 'organMap.details.separator' ? `${o!.a} | ${o!.b}` : k), 'breastClock', p.sectors.find(s => s.id === 'm_anterior_dcis')!, scheme);
    expect(summary.split(' | ')).toEqual(['organMap.breast.marginName', 'organMap.legend.marginClose', 'organMap.breast.details.margin']);
    // a focus says where it is, for screen readers too
    const f = map({ psmap_breast_side: 'psmap_side_right', ...foci(1, 'type', 'psmap_ftype_dcis'), ...foci(1, 'clock', 'psmap_clock_10') }).markers![0];
    const fs = organMapSectorSummary((k, o) => (k === 'organMap.details.separator' ? `${o!.a} | ${o!.b}` : k), 'breastClock', f, scheme, 'right');
    expect(fs.split(' | ')).toEqual(['organMap.breast.focusName', 'organMap.legend.dcis', 'organMap.breast.inQuadrant']);
  });
  it('the report image draws the foci markers, the quadrant guides and the margin values', () => {
    const p = map({ psmap_breast_side: 'psmap_side_left', ...foci(1, 'type', 'psmap_ftype_invasive'), ...foci(1, 'clock', 'psmap_clock_2'), ...margin('posterior', 'invasive', '2') });
    const svg = renderOrganMapSvg(p, scheme, organMapDrawingLabels(t, p.mapType, scheme, p.side));
    expect(svg).toContain('stroke-dasharray="4 3"');
    expect(svg).toMatch(/<circle cx="[\d.]+" cy="[\d.]+" r="9" fill="#b91c1c"/);
    expect(svg).toContain('organMap.breast.side.left');
    expect(svg).toContain('organMap.inline.mm{&quot;n&quot;:2}');
  });
});

describe('the close-margin threshold, per site', () => {
  it('layers like the colours (facility over jurisdiction over enterprise over 2 mm), validated and audited', () => {
    const r = resolveOrganMapScheme({ enterprise: { thresholds: { breastCloseMarginMm: 1 } }, facilities: { F1: { thresholds: { breastCloseMarginMm: 3 } } } }, { facilityId: 'F1' });
    expect(r.thresholds).toEqual({ ...BUILT_IN_ORGAN_MAP_THRESHOLDS, breastCloseMarginMm: 3 });
    expect(r.thresholdSources.breastCloseMarginMm).toBe('facility');
    expect(r.thresholdSources.polypInvolvedMarginMm).toBe('builtIn');
    expect(resolveOrganMapScheme({}, {}).thresholds.breastCloseMarginMm).toBe(2);
    expect(validateOrganMapScheme({ thresholds: { breastCloseMarginMm: 0 } })).toEqual([{ key: 'breastCloseMarginMm', problem: 'threshold' }]);
    expect(validateOrganMapScheme({ thresholds: { breastCloseMarginMm: 1 } })).toEqual([]);
    expect(organMapSchemeChangeDetail('enterprise', undefined, { thresholds: { breastCloseMarginMm: 1 } })).toBe('Organ map colours (enterprise): breastCloseMarginMm: (inherited) → 1');
  });
  it('editing: override from what is inherited, then give it back', () => {
    const layers = { enterprise: { thresholds: { breastCloseMarginMm: 1 } } };
    expect(inheritedOrganMapThresholds(layers, { kind: 'jurisdiction', code: 'GB' })).toEqual({ ...BUILT_IN_ORGAN_MAP_THRESHOLDS, breastCloseMarginMm: 1 });
    const d = withThreshold({}, 'breastCloseMarginMm', 2.5);
    expect(d).toEqual({ thresholds: { breastCloseMarginMm: 2.5 } });
    expect(withThreshold(d, 'breastCloseMarginMm', undefined)).toEqual({});
  });
});

describe('binding a lab’s own breast questions', () => {
  const lab = { id: 'lab_breast', sections: [{ fields: [
    { id: 'lat', type: 'dropdown', options: [{ id: 'R', label: 'Right' }, { id: 'L', label: 'Left' }] },
    { id: 'lesions', type: 'partGrid', columns: [{ id: 'kind', options: [{ id: 'k1' }] }, { id: 'pos', options: [{ id: 'p10' }] }] },
    { id: 'marg', type: 'partGrid', rows: { kind: 'fixed', heading: 'Margin', rows: [{ id: 'sup', label: 'Sup' }] }, columns: [{ id: 'inv' }] },
    { id: 'cores', type: 'partGrid', columns: [] },
  ] }] };
  it('picks questions, columns, rows and meanings, and validates', () => {
    let b = emptyOrganMapBinding('breastClock') as BreastClockBinding;
    b = withBreastSideValue(withBreastSide(b, 'lat'), 'R', 'right');
    b = withBreastFoci(b, 'lesions');
    b = withBreastFociValue(withBreastFociColumn(withBreastFociColumn(b, 'type', 'kind'), 'clock', 'pos'), 'type', 'k1', 'invasive');
    b = withBreastFociValue(b, 'clock', 'p10', '10');
    b = withBreastMarginColumn(withBreastMarginRow(withBreastMargins(b, 'marg'), 'sup', 'superior'), 'invasive', 'inv');
    expect(validateOrganMapBinding(b, lab as never)).toEqual([]);
    expect(breastBindableFields(lab as never, 'margins').map(f => f.id)).toEqual(['lesions', 'marg', 'cores']);
    expect(marginGridRows(lab.sections[0].fields[2] as never)).toHaveLength(1);
    expect(marginGridRows(lab.sections[0].fields[3] as never)).toEqual([]);
    const m = resolveOrganMap({ binding: b, answers: { lat: 'R', lesions__x__kind: 'k1', lesions__x__pos: 'p10', marg__sup__inv: '0' }, scheme, templateId: 'lab_breast', instanceId: 'x' });
    expect(m.sectors.find(s => s.id === 'h10')!.category).toBe('invasive');
    expect(m.sectors.find(s => s.id === 'm_superior_inv')!.category).toBe('marginPositive');
    expect(['foci.clock', 'margins.dcis', 'side'].map(i => bindingProblemInputKey(i))).toEqual(['breast.fociColumns.clock', 'breast.marginColumns.dcis', 'breast.inputs.side']);
    // another type column starts its meanings again; the same column keeps them
    expect(withBreastFociColumn(b, 'type', 'pos').foci!.values.type).toEqual({});
    expect(withBreastFociColumn(b, 'type', 'kind').foci!.values.type).toEqual({ k1: 'invasive' });
    expect(withBreastFociColumn(b, 'type', 'pos').foci!.values.clock).toEqual({ p10: '10' });
  });
});

describe('the demo cases draw their breast maps from their synoptic answers', () => {
  it('S26-4401: left breast, invasive and DCIS at 2 o’clock (upper outer); the deep margin 2.0 mm is clear at 2 mm, close at 2.5', async () => {
    const c = (await mockCaseService.getCase('S26-4401-BX-001'))!;
    const inst = c.synopticReports!.find(r => r.templateId === 'breast_invasive')!;
    const at = (close: number) => resolveOrganMap({ binding, answers: inst.answers as never, scheme, thresholds: { ...BUILT_IN_ORGAN_MAP_THRESHOLDS, breastCloseMarginMm: close }, templateId: invasive.id, instanceId: inst.instanceId });
    const p = at(2);
    expect(p.side).toBe('left');
    expect(breastQuadrantOfHour(2, p.side)).toBe('UOQ');
    expect(p.sectors.find(s => s.id === 'h2')!.category).toBe('invasive');
    expect(p.sectors.find(s => s.id === 'm_posterior_inv')!.category).toBe('marginClear');
    expect(at(2.5).sectors.find(s => s.id === 'm_posterior_inv')!.category).toBe('marginClose');
  });
  it('S26-4405: right breast, DCIS with calcifications at 10 o’clock (upper outer)', async () => {
    const c = (await mockCaseService.getCase('S26-4405'))!;
    const inst = c.synopticReports!.find(r => r.templateId === 'breast_dcis_resection')!;
    const p = resolveOrganMap({ binding: pathScribeDefaultBinding(dcisTpl as never)!, answers: inst.answers as never, scheme, templateId: dcisTpl.id, instanceId: inst.instanceId });
    expect(p.sectors.find(s => s.id === 'h10')!.category).toBe('dcis');
    expect(p.markers!.map(m => m.category)).toEqual(['dcis', 'calcifications']);
    expect(p.sectors.find(s => s.id === 'm_superior_dcis')!.details).toEqual({ marginMm: 3 });
  });
});
