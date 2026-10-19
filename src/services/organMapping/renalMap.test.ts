// @vitest-environment happy-dom
// src/services/organMapping/renalMap.test.ts
// Batch 466: the renal resection map from the CAP/ICCR kidney synoptic — poles, halves and aspect; the pT
// compartments and the pT they point to; the three margins (vein and ureter by status; soft tissue or
// parenchymal by distance and the site's rule, Pete: 0.0 mm with "="); bindings, drawing, words, demo case.
import { describe, expect, it } from 'vitest';
import kidneyTpl from '@/data/templates/generic/kidney_resection.json';
import { PROTOCOL_REGISTRY } from '@/components/Config/Protocols/protocolShared';
import { mockCaseService } from '../cases/mockCaseService';
import { FIELD_INPUT_SPECS, pathScribeDefaultBinding, validateOrganMapBinding, type FieldInputsBinding } from './organMapBindings';
import { BUILT_IN_ORGAN_MAP_SCHEME, BUILT_IN_ORGAN_MAP_THRESHOLDS, THRESHOLD_ROWS, validateOrganMapScheme, type OrganMapThresholds } from './organMapScheme';
import { resolveOrganMap } from './resolveProstateMap';
import { renalPtFromExtent } from './resolveRenalMap';
import { partialRenalAnatomy } from './renalAnatomy';
import { organMapLayout, renderOrganMapSvg } from './organMapDrawing';
import { organMapInlineText, organMapLabelsFor, organMapSectorName, organMapSectorSummary } from './organMapLabels';
import { bindingProblemInputKey, emptyOrganMapBinding, fieldInputValueKey, organMapRenalPreviews } from './organMapConfigDraft';
import { isVisible } from '../templates/fieldVisibility';
import { resolveAnswers } from '@/orchestrator/contextBuilder';
import { RENAL_COMPARTMENTS, RENAL_ZONES, renalCaptions, renalCompartmentsDrawn } from './renalGeometry';

const scheme = BUILT_IN_ORGAN_MAP_SCHEME;
const T = BUILT_IN_ORGAN_MAP_THRESHOLDS;
const binding = pathScribeDefaultBinding(kidneyTpl as never) as FieldInputsBinding;
const P = 'psmap_ren_';
const renal = (answers: Record<string, string | string[]>, thresholds: OrganMapThresholds = T) =>
  resolveOrganMap({ binding, answers, scheme, thresholds, templateId: kidneyTpl.id, instanceId: 'i1' });
const cat = (p: { sectors: { id: string; category: string }[] }) => Object.fromEntries(p.sectors.map(s => [s.id, s.category]));
const t = (k: string, o: Record<string, unknown> = {}) => `${k}${Object.keys(o).length ? JSON.stringify(o) : ''}`;

describe('the site rules (Pete: Renal_Parenchymal / Renal_SoftTissue _Involved_Threshold_mm, 0.0 mm with "=")', () => {
  it('defaults, threshold rows and validation', () => {
    expect([T.renalParenchymalInvolvedMm, T.renalParenchymalInvolvedOperator, T.renalSoftTissueInvolvedMm, T.renalSoftTissueInvolvedOperator]).toEqual([0, 'eq', 0, 'eq']);
    expect(THRESHOLD_ROWS.map(r => r.key)).toEqual(expect.arrayContaining(['renalParenchymalInvolvedMm', 'renalSoftTissueInvolvedMm']));
    expect(validateOrganMapScheme({ thresholds: { renalSoftTissueInvolvedMm: 1 } }, T)).toEqual([{ key: 'renalSoftTissueInvolvedOperator', problem: 'equalsNeedsZero' }]);
    expect(validateOrganMapScheme({ thresholds: { renalSoftTissueInvolvedMm: 1, renalSoftTissueInvolvedOperator: 'lte' } }, T)).toEqual([]);
  });
  it('the status follows the measurement: on ink involved, any distance clear; a site at ≤ 1 mm calls 0.8 mm involved', () => {
    expect(cat(renal({ [`${P}procedure`]: `${P}procedure_radical`, [`${P}softTissueMarginMm`]: '0' })).m_softTissue).toBe('marginPositive');
    expect(cat(renal({ [`${P}softTissueMarginMm`]: '0.8' })).m_softTissue).toBe('marginClear');
    expect(cat(renal({ [`${P}softTissueMarginMm`]: '0.8' }, { ...T, renalSoftTissueInvolvedMm: 1, renalSoftTissueInvolvedOperator: 'lte' })).m_softTissue).toBe('marginPositive');
    // A partial nephrectomy: the parenchymal margin in its place, by its own rule.
    const p = renal({ [`${P}procedure`]: `${P}procedure_partial`, [`${P}parenchymalMarginMm`]: '0', [`${P}softTissueMarginMm`]: '5' });
    // Batch 466b (Pete): a partial nephrectomy has the parenchymal and perinephric / capsular soft tissue margins, each by its rule.
    expect([cat(p).m_parenchymal, cat(p).m_softTissue, cat(p).m_vein, cat(p).m_ureter, p.variant, p.meta!.ruleParenchymal]).toEqual(['marginPositive', 'marginClear', undefined, undefined, 'partial|R|ps', 'eq:0']);
    expect(cat(renal({ [`${P}procedure`]: `${P}procedure_partial`, [`${P}parenchymalMarginMm`]: '0.5' }, { ...T, renalParenchymalInvolvedMm: 1, renalParenchymalInvolvedOperator: 'lt' })).m_parenchymal).toBe('marginPositive');
    // The procedure not answered and only a parenchymal distance given: read as a partial nephrectomy (never ignored).
    const unstated = renal({ [`${P}parenchymalMarginMm`]: '0' });
    expect([unstated.variant, cat(unstated).m_parenchymal, unstated.hasData]).toEqual(['partial|R|ps', 'marginPositive', true]);
    // No distance: not given; a negative distance isn't one.
    expect([cat(renal({})).m_softTissue, cat(renal({ [`${P}softTissueMarginMm`]: '-1' })).m_softTissue]).toEqual(['notSampled', 'notSampled']);
  });
});

describe('the map', () => {
  it('Kidney Resection’s map questions bind themselves (the size from the template’s own question)', () => {
    expect(binding.mapType).toBe('renalResection');
    expect(Object.keys(binding.inputs).sort()).toEqual(FIELD_INPUT_SPECS.renalResection.map(s => s.key).sort());
    expect(binding.inputs.sizeCm).toEqual({ fieldId: 'tumor_size_cm' });
    expect(validateOrganMapBinding(binding, kidneyTpl as never)).toEqual([]);
    expect(PROTOCOL_REGISTRY.find(p => p.id === 'kidney_resection')!.fields).toBe(kidneyTpl.sections.reduce((n, s) => n + s.fields.length, 0));
  });
  it('the tumour’s poles and halves (both halves when not given), its aspect marked; the left kidney is mirrored', () => {
    const m = renal({ [`${P}poles`]: [`${P}poles_upper`, `${P}poles_middle`], [`${P}halves`]: [`${P}halves_lateral`], [`${P}aspect`]: [`${P}aspect_anterior`] });
    const k = cat(m);
    expect([k.upper_lateral, k.middle_lateral, k.upper_medial, k.lower_lateral]).toEqual(['invasive', 'invasive', 'benign', 'benign']);
    expect(m.sectors.find(s => s.id === 'upper_lateral')!.details).toEqual({ aspect: 'anterior' });
    expect(m.meta!.aspect).toBe('anterior');
    const both = renal({ [`${P}poles`]: [`${P}poles_lower`], [`${P}aspect`]: [`${P}aspect_posterior`, `${P}aspect_anterior`], [`${P}kidney`]: `${P}kidney_left` });
    expect([cat(both).lower_lateral, cat(both).lower_medial, both.meta!.aspect, both.variant]).toEqual(['invasive', 'invasive', 'both', 'radical|L|vus']);
  });
  it('each compartment answered shows carcinoma; the vein and ureter margins by their status', () => {
    const m = renal({
      [`${P}extent`]: [`${P}extent_perinephricFat`, `${P}extent_renalVein`, `${P}extent_ivcBelow`],
      [`${P}veinMargin`]: `${P}veinMargin_involved`, [`${P}ureterMargin`]: `${P}ureterMargin_notInvolved`,
    });
    const k = cat(m);
    expect([k.perinephricFat, k.renalVein, k.ivcBelow, k.ivcAbove, k.sinusFat, k.gerota]).toEqual(['invasive', 'invasive', 'invasive', 'benign', 'benign', 'benign']);
    expect([k.m_vein, k.m_ureter]).toEqual(['marginPositive', 'marginClear']);
    expect(m.meta!.pT).toBe('pT3b');
    expect(renal({}).hasData).toBe(false);
    // The template's own size (nearly always answered) doesn't make a map, nor a pT, on its own.
    const sizeOnly = renal({ tumor_size_cm: '8.5' });
    expect([sizeOnly.hasData, sizeOnly.meta!.pT]).toEqual([false, undefined]);
  });
});

describe('the pT the extent and size point to (AJCC 8th)', () => {
  const pt = (extent: string[], size?: number) => renalPtFromExtent(new Set(extent), size);
  it('by compartment, the highest wins', () => {
    expect(pt(['perinephricFat', 'adrenal']).pT).toBe('pT4');
    expect(pt(['gerota']).pT).toBe('pT4');
    expect(pt(['ivcAbove', 'renalVein']).pT).toBe('pT3c');
    expect(pt(['ivcBelow']).pT).toBe('pT3b');
    expect([pt(['sinusFat']).pT, pt(['pelvicalyceal']).pT, pt(['renalVein']).pT]).toEqual(['pT3a', 'pT3a', 'pT3a']);
  });
  it('limited to the kidney, by size; without a size, it says so', () => {
    expect([4, 4.1, 7, 7.5, 10, 10.2].map(s => pt(['limited'], s).pT)).toEqual(['pT1a', 'pT1b', 'pT1b', 'pT2a', 'pT2a', 'pT2b']);
    expect(pt(['limited'])).toEqual({ needsSize: true });
    expect(pt([])).toEqual({});
    // A size alone doesn't say the tumour is limited to the kidney: no pT.
    expect(pt([], 3)).toEqual({});
  });
});

describe('configuration, drawing and words', () => {
  it('an empty binding, value and problem wording keys, previews that show every category', () => {
    expect(emptyOrganMapBinding('renalResection')).toEqual({ mapType: 'renalResection', inputs: {} });
    expect(fieldInputValueKey('renalResection', 'extent', 'gerota')).toBe('organMap.renal.value.extent.gerota');
    expect(bindingProblemInputKey('kidney')).toBe('colorectal.inputs.kidney');
    expect(bindingProblemInputKey('side')).toBe('breast.inputs.side');
    const [radical, partial] = organMapRenalPreviews(scheme, T);
    const cats = new Set([...radical.sectors, ...partial.sectors].map(s => s.category));
    expect([...cats].sort()).toEqual(['benign', 'invasive', 'marginClear', 'marginPositive', 'notSampled']);
    expect([radical.variant, partial.variant, radical.meta!.pT, partial.meta!.pT]).toEqual(['radical|R|vus', 'partial|L|ps', 'pT3a', 'pT1a']);
  });
  it('layouts: every sector has a shape, for each procedure and side; the left kidney mirrors the right', () => {
    const boxes: Record<string, string[]> = { 'radical|R|vus': ['m_vein', 'm_ureter', 'm_softTissue'], 'radical|L|vus': ['m_vein', 'm_ureter', 'm_softTissue'], 'partial|R|ps': ['m_parenchymal', 'm_softTissue'], 'partial|L|psvu|vu': ['m_parenchymal', 'm_softTissue', 'm_vein', 'm_ureter'] };
    for (const [v, margins] of Object.entries(boxes)) {
      const ids = organMapLayout('renalResection', undefined, 0, v).shapes.map(sh => sh.id);
      expect(ids.filter(id => id.startsWith('m_'))).toEqual(margins);
      expect(ids).toEqual(expect.arrayContaining([...RENAL_ZONES, ...renalCompartmentsDrawn(v)]));
    }
    // Batch 466c: a partial nephrectomy draws no vein, vena cava (nor diaphragm line) or ureter unless reported.
    const partialIds = organMapLayout('renalResection', undefined, 0, 'partial|R|ps').shapes.map(sh => sh.id);
    expect(['renalVein', 'ivcBelow', 'ivcAbove', 'ureter', 'gerota', 'adrenal'].filter(id => partialIds.includes(id))).toEqual([]);
    expect(partialIds).toContain('perinephricFat');
    expect([organMapLayout('renalResection', undefined, 0, 'partial|R|ps').guides, organMapLayout('renalResection', undefined, 0, 'partial|R|ps|vi').guides]).toEqual(['', 'M 392 110 L 430 110']);
    expect(renalCaptions('partial|R|ps').some(c => c.key === 'diaphragm')).toBe(false);
    expect(renalCompartmentsDrawn('radical|R|vus')).toEqual([...RENAL_COMPARTMENTS]);
    expect(renalCompartmentsDrawn('partial|R|psu|u')).toEqual(RENAL_COMPARTMENTS.filter(c => !['renalVein', 'ivcBelow', 'ivcAbove', 'gerota', 'adrenal'].includes(c)));
    const r = organMapLayout('renalResection', undefined, 0, 'radical|R|vus').shapes.find(s => s.id === 'renalVein')!;
    const l = organMapLayout('renalResection', undefined, 0, 'radical|L|vus').shapes.find(s => s.id === 'renalVein')!;
    expect(l.labelX).toBe(440 - r.labelX);
  });
  it('names, inline text, summaries and captions', () => {
    expect(organMapSectorName(t, 'renalResection', 'upper_lateral')).toBe('organMap.renal.sector.upper_lateral');
    const m = renal({ [`${P}poles`]: [`${P}poles_upper`], [`${P}aspect`]: [`${P}aspect_anterior`], [`${P}softTissueMarginMm`]: '0', [`${P}veinMargin`]: `${P}veinMargin_involved`, [`${P}extent`]: [`${P}extent_limited`], tumor_size_cm: '3' });
    const s = (id: string) => m.sectors.find(x => x.id === id);
    expect(organMapInlineText(t, 'renalResection', s('upper_lateral'), 'upper_lateral')).toEqual(['organMap.renal.aspectShort.anterior']);
    expect(organMapInlineText(t, 'renalResection', s('lower_lateral'), 'lower_lateral')).toEqual([]);
    expect(organMapInlineText(t, 'renalResection', s('m_softTissue'), 'm_softTissue')).toEqual(['organMap.renal.inline.mm{"n":0}']);
    expect(organMapInlineText(t, 'renalResection', s('m_vein'), 'm_vein')).toEqual(['organMap.renal.inline.involved']);
    expect(organMapInlineText(t, 'renalResection', s('sinusFat'), 'sinusFat')).toEqual(['organMap.renal.short.sinusFat']);
    const sep = (k: string, o: Record<string, unknown> = {}) => (k === 'organMap.details.separator' ? `${o.a} · ${o.b}` : t(k, o));
    expect(organMapSectorSummary(sep, 'renalResection', s('upper_lateral')!, scheme)).toContain('organMap.renal.details.aspect.anterior');
    // The vein margin's status needs no "site rule" detail.
    expect(organMapSectorSummary(sep, 'renalResection', s('m_vein')!, scheme)).not.toContain('details.involved');
    const c = organMapLabelsFor(t, m, scheme).captions;
    expect(c['rule.softTissue']).toBe('organMap.renal.rule.softTissue{"op":"organMap.colorectal.operator.eq","n":0}');
    expect([c.aspect, c.pT]).toEqual(['organMap.renal.caption.aspect.anterior', 'organMap.renal.caption.pT{"pT":"pT1a"}']);
    expect(organMapLabelsFor(t, renal({ [`${P}extent`]: [`${P}extent_limited`] }), scheme).captions.pT).toBe('organMap.renal.caption.pTNeedsSize');
    const svg = renderOrganMapSvg(m, scheme, organMapLabelsFor(t, m, scheme));
    expect(svg).toContain('organMap.title.renalResection');
  });
});

describe('demo case S26-4467 (right radical nephrectomy)', () => {
  it('upper pole, lateral, anterior; perinephric fat and renal vein (pT3a); vein margin involved; soft tissue on ink', async () => {
    const c = (await mockCaseService.getCase('S26-4467'))!;
    const m = renal(c.synopticReports![0].answers as never);
    const k = cat(m);
    expect([k.upper_lateral, k.upper_medial, k.perinephricFat, k.renalVein, k.m_vein, k.m_ureter, k.m_softTissue]).toEqual(['invasive', 'benign', 'invasive', 'invasive', 'marginPositive', 'marginClear', 'marginPositive']);
    expect([m.variant, m.meta!.pT, m.meta!.aspect]).toEqual(['radical|R|vus', 'pT3a', 'anterior']);
  });
});

describe('Batch 466b (Pete): a partial nephrectomy has no renal vein or ureter margin', () => {
  const fields = kidneyTpl.sections.flatMap(sec => sec.fields) as { id: string; visibleWhen?: never }[];
  const shown = (answers: Record<string, string | string[]>) => fields.filter(f => isVisible(f.visibleWhen, answers)).map(f => f.id).filter(id => /Margin|extraMargins/.test(id));
  it('the questions shown follow the procedure; a non-standard margin brings its question back', () => {
    expect(shown({ [`${P}procedure`]: `${P}procedure_radical` })).toEqual([`${P}veinMargin`, `${P}ureterMargin`, `${P}softTissueMarginMm`]);
    expect(shown({ [`${P}procedure`]: `${P}procedure_partial` })).toEqual([`${P}extraMargins`, `${P}softTissueMarginMm`, `${P}parenchymalMarginMm`]);
    expect(shown({ [`${P}procedure`]: `${P}procedure_partial`, [`${P}extraMargins`]: [`${P}extraMargins_ureter`] })).toEqual([`${P}extraMargins`, `${P}ureterMargin`, `${P}softTissueMarginMm`, `${P}parenchymalMarginMm`]);
    // The procedure not answered yet: every margin question is shown.
    expect(shown({})).toEqual([`${P}veinMargin`, `${P}ureterMargin`, `${P}softTissueMarginMm`, `${P}parenchymalMarginMm`]);
  });
  it('the map draws the partial’s two margins, and a non-standard one when added', () => {
    const m = renal({ [`${P}procedure`]: `${P}procedure_partial`, [`${P}extraMargins`]: [`${P}extraMargins_renalVein`], [`${P}veinMargin`]: `${P}veinMargin_notInvolved` });
    expect([m.variant, cat(m).m_vein, cat(m).m_ureter]).toEqual(['partial|R|psv|v', 'marginClear', undefined]);
    // A vein answer left from before (its question now hidden) isn't drawn without the non-standard margin.
    expect(renal({ [`${P}procedure`]: `${P}procedure_partial`, [`${P}veinMargin`]: `${P}veinMargin_involved` }).variant).toBe('partial|R|ps');
    // Four boxes: the drawing grows so the captions fit.
    expect(organMapLayout('renalResection', undefined, 0, 'partial|R|psvu').height).toBeGreaterThan(400);
    const c = organMapLabelsFor(t, m, scheme).captions;
    expect([c['margin.capsular'], c['rule.parenchymal']]).toEqual(['organMap.renal.caption.margin.capsular', 'organMap.renal.rule.parenchymal{"op":"organMap.colorectal.operator.eq","n":0}']);
  });
  it('Batch 466c: a partial nephrectomy draws the vein, vena cava and ureter only when reported', () => {
    const ids = (m: ReturnType<typeof renal>) => m.sectors.map(x => x.id);
    const plain = renal({ [`${P}procedure`]: `${P}procedure_partial`, [`${P}parenchymalMarginMm`]: '2' });
    expect(['renalVein', 'ivcBelow', 'ivcAbove', 'ureter'].filter(id => ids(plain).includes(id))).toEqual([]);
    expect(ids(plain)).toEqual(expect.arrayContaining(['perinephricFat', 'sinusFat', 'pelvicalyceal', 'm_parenchymal', 'm_softTissue']));
    // Carcinoma in a segmental vein: the vein is drawn (and shows it); in the vena cava: both.
    const inVein = renal({ [`${P}procedure`]: `${P}procedure_partial`, [`${P}extent`]: [`${P}extent_renalVein`] });
    expect([inVein.variant, cat(inVein).renalVein, cat(inVein).ivcBelow]).toEqual(['partial|R|ps|v', 'invasive', undefined]);
    expect(renal({ [`${P}procedure`]: `${P}procedure_partial`, [`${P}extent`]: [`${P}extent_ivcBelow`] }).variant).toBe('partial|R|ps|vi');
    // A ureter margin added: the ureter is drawn.
    const u = renal({ [`${P}procedure`]: `${P}procedure_partial`, [`${P}extraMargins`]: [`${P}extraMargins_ureter`] });
    expect([u.variant, ids(u).includes('ureter'), ids(u).includes('renalVein')]).toEqual(['partial|R|psu|u', true, false]);
    // Every sector the resolver gives has a shape.
    for (const m of [plain, inVein, u]) {
      const shapes = organMapLayout('renalResection', undefined, 0, m.variant).shapes.map(sh => sh.id);
      expect(ids(m).filter(id => !shapes.includes(id))).toEqual([]);
    }
    // A radical nephrectomy draws it all.
    expect(ids(renal({ [`${P}procedure`]: `${P}procedure_radical` }))).toEqual(expect.arrayContaining(['renalVein', 'ivcBelow', 'ivcAbove', 'ureter']));
  });
  it('Batch 618 (PS-492, Pete): a partial nephrectomy draws Gerota’s fascia and the adrenal only when the extent reports them; the perinephric fat always', () => {
    const partial = (extent: string[], extra: Record<string, string | string[]> = {}) =>
      renal({ [`${P}procedure`]: `${P}procedure_partial`, [`${P}extent`]: extent.map(e => `${P}extent_${e}`), ...extra });
    const ids = (m: ReturnType<typeof renal>) => m.sectors.map(x => x.id);
    const shown = (m: ReturnType<typeof renal>) => ['perinephricFat', 'gerota', 'adrenal'].filter(id => ids(m).includes(id));
    // None reported (and nothing answered): the fat only.
    expect([shown(partial(['limited'])), partial(['limited']).variant, shown(renal({ [`${P}procedure`]: `${P}procedure_partial` }))]).toEqual([['perinephricFat'], 'partial|R|ps', ['perinephricFat']]);
    // Perinephric fat reported (pT3a): still not Gerota's or the adrenal.
    expect(shown(partial(['perinephricFat']))).toEqual(['perinephricFat']);
    // Contiguous adrenal only.
    const a = partial(['adrenal']);
    expect([shown(a), a.variant, cat(a).adrenal, a.meta!.pT]).toEqual([['perinephricFat', 'adrenal'], 'partial|R|ps|a', 'invasive', 'pT4']);
    // Beyond Gerota's fascia only.
    const g = partial(['gerota']);
    expect([shown(g), g.variant, cat(g).gerota, g.meta!.pT]).toEqual([['perinephricFat', 'gerota'], 'partial|R|ps|g', 'invasive', 'pT4']);
    // Both, and with the vein and ureter rules unchanged.
    const both = partial(['gerota', 'adrenal', 'renalVein'], { [`${P}extraMargins`]: [`${P}extraMargins_ureter`] });
    expect([shown(both), both.variant]).toEqual([['perinephricFat', 'gerota', 'adrenal'], 'partial|R|psu|vuga']);
    // Every sector the resolver gives has a shape, on both sides.
    for (const m of [a, g, both]) for (const side of ['R', 'L']) {
      const v = (m.variant ?? '').replace('|R|', `|${side}|`);
      const shapes = organMapLayout('renalResection', undefined, 0, v).shapes.map(sh => sh.id);
      expect(ids(m).filter(id => !shapes.includes(id))).toEqual([]);
    }
    // A radical nephrectomy is unchanged: all of it, whatever the extent.
    expect(shown(renal({ [`${P}procedure`]: `${P}procedure_radical` }))).toEqual(['perinephricFat', 'gerota', 'adrenal']);
    // The decision itself is a pure function.
    expect([partialRenalAnatomy({ boxes: 'ps', involved: new Set() }), partialRenalAnatomy({ boxes: 'ps', involved: new Set(['adrenal'] as const) }), partialRenalAnatomy({ boxes: 'psvu', involved: new Set(['gerota', 'ivcAbove'] as const) })]).toEqual(['', 'a', 'viug'.split('').sort((x, y) => 'viuga'.indexOf(x) - 'viuga'.indexOf(y)).join('')]);
  });
  it('the report leaves out a question hidden by its visibility condition, even with an answer stored', () => {
    const answers = { [`${P}procedure`]: `${P}procedure_partial`, [`${P}veinMargin`]: `${P}veinMargin_notInvolved`, [`${P}parenchymalMarginMm`]: '2' };
    const ids = resolveAnswers(answers, kidneyTpl as never).map(r => r.fieldId);
    expect(ids).toEqual(expect.arrayContaining([`${P}procedure`, `${P}parenchymalMarginMm`]));
    expect(ids).not.toContain(`${P}veinMargin`);
  });
});
