// @vitest-environment happy-dom
// src/services/organMapping/mohsMap.test.ts
// Batch 463: the Mohs stage maps — the template and its binding, the resolver
// and fingerprint, the words and drawing, the automatic report figures (never
// inserted, never stale), the result payload and the demo case S26-4463.
import { describe, expect, it } from 'vitest';
import mohsTpl from '@/data/templates/generic/mohs_micrographic_surgery.json';
import { mockCaseService } from '../cases/mockCaseService';
import { PROTOCOL_REGISTRY } from '@/components/Config/Protocols/protocolShared';
import { pathScribeDefaultBinding, validateOrganMapBinding, type MohsStagesBinding } from './organMapBindings';
import { BUILT_IN_ORGAN_MAP_SCHEME } from './organMapScheme';
import { resolveOrganMap } from './resolveProstateMap';
import { mohsStagePayload } from './resolveMohsMap';
import { mohsShapes, mohsSingleStage } from './mohsGeometry';
import { renderOrganMapSvg } from './organMapDrawing';
import { organMapInlineText, organMapLabelsFor, organMapSectorName, organMapSectorSummary } from './organMapLabels';
import { insertOrganMapFigure, organMapReportState } from './organMapFigures';
import { findMohsBlockGaps, findStaleOrganMapFigures } from './organMapLive';
import { synopticFieldComplete, synopticFieldMissing } from '../templates/partGrid';
import { autoOrganMapFigures, reportFiguresWithAuto } from './organMapAutoFigures';
import { bindableFields, bindingProblemInputKey, emptyOrganMapBinding } from './organMapConfigDraft';
import { isAutoReportMap } from './organMapTypes';
import { mohsDefaultHistology, readMohsStages } from '../templates/mohsStages';
import { buildSynopticResultPayload } from '../reports/synopticResultPayload';

const scheme = BUILT_IN_ORGAN_MAP_SCHEME;
const F = 'psmap_mohs_stages';
const binding = pathScribeDefaultBinding(mohsTpl as never) as MohsStagesBinding;
const t = (k: string, o: Record<string, unknown> = {}) => `${k}${Object.keys(o).length ? JSON.stringify(o) : ''}`;
const map = (answers: Record<string, string | string[]>) => resolveOrganMap({ binding, answers, scheme, templateId: mohsTpl.id, instanceId: 'i1' });
const stage1 = { [`${F}__stages`]: '1', [`${F}__s1__positive`]: ['c3', 'deep'], [`${F}__s1__c3__block`]: 'A', [`${F}__s1__c3__histology`]: 'BCC', [`${F}__s1__deep__block`]: 'B', [`${F}__s1__deep__pni`]: 'yes' };

describe('template and binding', () => {
  it('a PathScribe synoptic labs copy like any other, with the stage question bound by default', () => {
    expect(mohsTpl.id).toBe('mohs_micrographic_surgery');
    const fields = mohsTpl.sections.flatMap(s => s.fields as { id: string; type: string; defaultHistologyFieldId?: string }[]);
    expect(fields.filter(f => f.type === 'spatialStageCanvas').map(f => [f.id, f.defaultHistologyFieldId])).toEqual([[F, 'mohs_tumour_type']]);
    // The lab-editable questions of the spec: pre-op size, stain, closure, billing reference, final defect.
    for (const id of ['mohs_preop_length', 'mohs_stain', 'mohs_closure', 'mohs_billing_ref', 'mohs_defect_length']) expect(fields.some(f => f.id === id), id).toBe(true);
    expect(binding).toEqual({ mapType: 'mohsStages', stagesFieldId: F });
    expect(validateOrganMapBinding(binding, mohsTpl as never)).toEqual([]);
    expect(validateOrganMapBinding({ ...binding, stagesFieldId: 'mohs_site' }, mohsTpl as never)).toEqual([{ input: 'stages', problem: 'fieldMissing' }]);
    expect(PROTOCOL_REGISTRY.some(p => p.id === 'mohs_micrographic_surgery')).toBe(true);
  });
  it('Configuration: an empty Mohs binding, the canvas questions to pick from, the problem’s wording key', () => {
    expect(emptyOrganMapBinding('mohsStages')).toEqual({ mapType: 'mohsStages', stagesFieldId: '' });
    expect(bindableFields(mohsTpl as never, 'mohsStages').map(f => f.id)).toEqual([F]);
    expect(bindingProblemInputKey('stages')).toBe('mohs.stagesQuestion');
  });
});

describe('the stage maps', () => {
  it('nothing until a stage is added; a positive sector is residual tumour (perineural as an overlay), the rest clear', () => {
    expect(map({}).hasData).toBe(false);
    const p = map(stage1);
    expect(p.hasData).toBe(true);
    expect(p.sectors).toHaveLength(13);
    const by = Object.fromEntries(p.sectors.map(s => [s.id, s]));
    expect(by.s1_c3).toMatchObject({ category: 'residualTumour', overlays: [], details: { stage: 1, block: 'A', histology: 'BCC' } });
    expect(by.s1_deep).toMatchObject({ category: 'residualTumour', overlays: [{ key: 'perineural' }], details: { stage: 1, block: 'B' } });
    expect(by.s1_c12.category).toBe('marginClear');
    expect(p.mohsStages).toEqual([{ number: 1, clear: false }]);
    expect(p.legend.map(l => l.key).sort()).toEqual(['marginClear', 'perineural', 'residualTumour']);
  });
  it('the fingerprint follows what is drawn, including stage time and blocks', () => {
    const a = map(stage1).fingerprint;
    expect(map({ ...stage1 }).fingerprint).toBe(a);
    expect(map({ ...stage1, [`${F}__s1__blocks`]: '3' }).fingerprint).not.toBe(a);
    expect(map({ ...stage1, [`${F}__s1__c3__block`]: 'C' }).fingerprint).not.toBe(a);
  });
  it('the layout grows with the stages, four to a row; the canvas draws one stage', () => {
    expect(mohsShapes(5).map(s => s.id)).toContain('s5_deep');
    expect(mohsShapes(5)).toHaveLength(65);
    expect(mohsSingleStage(2).shapes.every(s => s.id.startsWith('s2_'))).toBe(true);
    const one = mohsStagePayload(readMohsStages(F, stage1)[0], scheme, F);
    expect(one.sectors.map(s => s.id)).toEqual(map(stage1).sectors.map(s => s.id));
  });
  it('names, inline text and summary', () => {
    expect(organMapSectorName(t, 'mohsStages', 's2_c3')).toBe('organMap.mohs.sectorName{"stage":2,"hour":"organMap.breast.hourName{\\"n\\":3}"}');
    expect(organMapSectorName(t, 'mohsStages', 's1_deep')).toBe('organMap.mohs.deepName{"stage":1}');
    const p = map(stage1);
    const deep = p.sectors.find(s => s.id === 's1_deep')!;
    expect(organMapInlineText(t, 'mohsStages', deep, 's1_deep')).toEqual(['organMap.mohs.deepShort', 'B']);
    expect(organMapInlineText(t, 'mohsStages', p.sectors.find(s => s.id === 's1_c12'), 's1_c12')).toEqual([]);
    const summary = organMapSectorSummary((k, o) => (k === 'organMap.details.separator' ? `${o!.a} | ${o!.b}` : k), 'mohsStages', p.sectors.find(s => s.id === 's1_c3')!, scheme);
    expect(summary.split(' | ')).toEqual(['organMap.mohs.sectorName', 'organMap.legend.residualTumour', 'organMap.mohs.details.block', 'BCC']);
  });
  it('the drawing captions each stage with its time and result', () => {
    const p = map({ ...stage1, [`${F}__s1__time`]: '09:15', [`${F}__s1__blocks`]: '2', [`${F}__stages`]: '2' });
    const labels = organMapLabelsFor(t, p, scheme);
    expect(labels.captions['stage.1.title']).toBe('organMap.mohs.stageTitleTime{"n":1,"time":"09:15"}');
    expect(labels.captions['stage.1.status']).toBe('organMap.mohs.stageResidualBlocks{"count":2}');
    expect(labels.captions['stage.2.status']).toBe('organMap.mohs.stageClear');
    const svg = renderOrganMapSvg(p, scheme, labels);
    expect(svg).toContain('organMap.mohs.stageTitleTime');
    expect(svg).toContain('organMap.mohs.stageClear');
    expect(svg).not.toContain('Brennan');
  });
});

describe('always in the report (Pete: "Always, for Mohs")', () => {
  it('the panel says automatic; insert is refused; never a stale figure', async () => {
    expect(isAutoReportMap('mohsStages')).toBe(true);
    expect(isAutoReportMap('breastClock')).toBe(false);
    expect(organMapReportState('mohsStages', undefined, 'fp', 'in-progress')).toBe('auto');
    expect(organMapReportState('mohsStages', undefined, 'fp', 'in-progress', false)).toBe('autoEmpty');
    expect(organMapReportState('prostateSectors', undefined, 'fp', 'in-progress')).toBe('none');
    const r = await insertOrganMapFigure({ caseData: { id: 'x' } as never, instanceId: 'i', mapType: 'mohsStages', svg: '<svg/>', fingerprint: 'fp', user: { id: 'u', name: 'U' } }, {} as never);
    expect(r).toEqual({ ok: false, reason: 'notSaved' });
    const c = (await mockCaseService.getCase('S26-4463'))!;
    const withOld = { ...c, organMapFigures: [{ id: 'old', instanceId: 'S26-4463-SP-1_mohs_001', mapType: 'mohsStages' as const, svg: '<svg/>', fingerprint: 'outdated', insertedAt: '', insertedBy: '', insertedByName: '' }] };
    expect(await findStaleOrganMapFigures(withOld)).toEqual([]);
  });
  it('S26-4463: the report draws both stages now, in the words given, replacing anything stored for that synoptic', async () => {
    const c = (await mockCaseService.getCase('S26-4463'))!;
    const auto = await autoOrganMapFigures(c, t);
    expect(auto).toHaveLength(1);
    expect(auto[0]).toMatchObject({ instanceId: 'S26-4463-SP-1_mohs_001', mapType: 'mohsStages' });
    expect(auto[0].svg).toContain('organMap.mohs.stageTitleTime{&quot;n&quot;:2,&quot;time&quot;:&quot;10:30&quot;}');
    expect(auto[0].svg).toContain('organMap.mohs.stageClear');
    const figures = await reportFiguresWithAuto({ ...c, organMapFigures: [{ id: 'old', instanceId: 'S26-4463-SP-1_mohs_001', mapType: 'mohsStages', svg: '<svg old/>', fingerprint: 'outdated', insertedAt: '', insertedBy: '', insertedByName: '' }] }, t);
    expect(figures).toHaveLength(1);
    expect(figures[0].svg).toBe(auto[0].svg);
    // No image here (no canvas in tests), as when a browser can't draw one: the PDF prints a notice with the stage lines.
    expect(figures[0].pngBase64).toBeUndefined();
    expect(figures[0].notice).toBe(true);
    expect(figures[0].fallbackLines).toHaveLength(2);
    expect(figures[0].fallbackLines![0]).toContain('organMap.mohs.report.residual');
    expect(figures[0].fallbackLines![1]).toContain('organMap.mohs.report.clear');
  });
});

describe('block traceability at sign-out (Batch 463b)', () => {
  const field = { id: F, type: 'spatialStageCanvas', required: true };
  it('the question is complete only when every positive sector has a block the stage cut; sign-out stops otherwise, required or not', () => {
    const unassigned = { [`${F}__stages`]: '1', [`${F}__s1__positive`]: ['c3'] };
    expect(synopticFieldComplete(field, unassigned)).toBe(false);
    expect(synopticFieldMissing(field, unassigned)).toBe(true);
    expect(synopticFieldMissing({ ...field, required: false }, unassigned)).toBe(true);
    const assigned = { ...unassigned, [`${F}__s1__c3__block`]: 'A' };
    expect([synopticFieldComplete(field, assigned), synopticFieldMissing(field, assigned)]).toEqual([true, false]);
    expect(synopticFieldMissing(field, {})).toBe(true);
    expect(synopticFieldMissing({ ...field, required: false }, {})).toBe(false);
    // PathScribe's template makes the stages question required.
    expect(mohsTpl.sections.flatMap(sec => sec.fields as { id: string; required?: boolean }[]).find(f => f.id === F)!.required).toBe(true);
  });
  it('S26-4463 passes; with a sector missing its block, the case is held at sign-out', async () => {
    const c = (await mockCaseService.getCase('S26-4463'))!;
    expect(await findMohsBlockGaps(c)).toEqual([]);
    const inst = c.synopticReports![0];
    const without = { ...c, synopticReports: [{ ...inst, answers: { ...inst.answers, [`${F}__s1__deep__block`]: undefined } as never }] };
    expect(await findMohsBlockGaps(without)).toEqual(['S26-4463-SP-1_mohs_001']);
    const beyond = { ...c, synopticReports: [{ ...inst, answers: { ...inst.answers, [`${F}__s1__deep__block`]: 'D' } as never }] };
    expect(await findMohsBlockGaps(beyond)).toEqual(['S26-4463-SP-1_mohs_001']);
    // A template that can't be loaded: a gap when its answers hold Mohs stages, ignored otherwise.
    const unknownTpl = { ...without, synopticReports: [{ ...without.synopticReports[0], templateId: 'no_such_template' }] };
    expect(await findMohsBlockGaps(unknownTpl)).toEqual(['S26-4463-SP-1_mohs_001']);
    expect(await findMohsBlockGaps({ synopticReports: [{ ...inst, templateId: 'no_such_template', answers: { x: 'y' } }] } as never)).toEqual([]);
  });
});

describe('demo case and result payload', () => {
  it('S26-4463: stage 1 residual at 12 and 1 o’clock (block A) and deep (block C, infiltrative, perineural); stage 2 clear', async () => {
    const c = (await mockCaseService.getCase('S26-4463'))!;
    const inst = c.synopticReports![0];
    expect(inst.templateId).toBe('mohs_micrographic_surgery');
    const stages = readMohsStages(F, inst.answers as never);
    expect(stages.map(s => [s.number, s.time, s.blocks, s.clear])).toEqual([[1, '09:15', 3, false], [2, '10:30', 1, true]]);
    expect(stages[0].positive.map(p => [p.sectorId, p.block, p.perineural])).toEqual([['c12', 'A', false], ['c1', 'A', false], ['deep', 'C', true]]);
    const field = mohsTpl.sections.flatMap(s => s.fields as { id: string; defaultHistologyFieldId?: string }[]).find(f => f.id === F)!;
    expect(mohsDefaultHistology(mohsTpl as never, field, inst.answers as never)).toBe('Basal cell carcinoma, nodular');
  });
  it('the result payload: a result per stage and an observation per positive sector carrying its block', async () => {
    const c = (await mockCaseService.getCase('S26-4463'))!;
    const p = buildSynopticResultPayload({
      caseData: c as never, instance: c.synopticReports![0] as never, template: mohsTpl as never, mode: 'assist',
      workup: { status: 'FINAL', version: 1 }, signer: { id: 'u1', npi: '1', signedAt: '2026-10-05T10:00:00Z' },
    } as never);
    const obs = p.synoptic_observations.filter(o => o.field_id.startsWith(F));
    expect(obs.map(o => [o.field_id, o.value, o.block_id])).toEqual([
      [`${F}__s1`, 'residual tumour', null],
      [`${F}__s1__c12`, 'Basal cell carcinoma, nodular', 'A'],
      [`${F}__s1__c1`, 'Basal cell carcinoma, nodular', 'A'],
      [`${F}__s1__deep`, 'Basal cell carcinoma, infiltrative; perineural invasion', 'C'],
      [`${F}__s2`, 'clear', null],
    ]);
  });
});
