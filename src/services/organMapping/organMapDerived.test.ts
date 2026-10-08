// @vitest-environment happy-dom
// src/services/organMapping/organMapDerived.test.ts
// Batch 466b (Pete: derive the form from the map, every mapped organ): a template's generic "Margin status" and
// "Margin(s) involved" questions are calculated from the map's margin questions and locked.
import { describe, expect, it } from 'vitest';
import kidneyTpl from '@/data/templates/generic/kidney_resection.json';
import { BUILT_IN_ORGAN_MAP_SCHEME, BUILT_IN_ORGAN_MAP_THRESHOLDS } from './organMapScheme';
import { bindingNeedsMarginReview, pathScribeDefaultBinding, resolveOrganMapBinding, upgradeStoredBinding, validateOrganMapBinding, type OrganMapBinding } from './organMapBindings';
import polypTpl from '@/data/templates/generic/colorectal_local_excision.json';
import { bindingDraftOf, organMapBindingStatus } from './organMapConfigDraft';
import { marginScopeOf, validateDerivedBindings, derivedFieldIds, derivedKeysFor, derivedMarginPatch, derivedMarginState, invasiveMarginGaps, marginKeyOf, marginKeysFor, precursorMarginKeysFor } from './organMapDerived';
import { derivedMarginAnswers } from './organMapDerivedAnswers';
import { bindingDraftDirty, bindingProblemInputKey, derivedKeyLabelKey, derivedCandidates, derivedValueKey, derivedValues, withDerivedField, withDerivedValue } from './organMapConfigDraft';

const fields = kidneyTpl.sections.flatMap(s => s.fields);
const P = 'psmap_ren_';
const base = pathScribeDefaultBinding(kidneyTpl as never) as OrganMapBinding;
// The generic template's answers ("Option 1"…): a lab says what each means.
const status = fields.find(f => f.id === 'margin_status')!;
const involved = fields.find(f => f.id === 'margins_involved')!;
let binding = withDerivedField(base, 'marginStatus', status.id);
binding = withDerivedValue(binding, 'marginStatus', status.options[0].id, 'involved');
binding = withDerivedValue(binding, 'marginStatus', status.options[1].id, 'notInvolved');
binding = withDerivedField(binding, 'marginsInvolved', involved.id);
binding = withDerivedValue(binding, 'marginsInvolved', involved.options[0].id, 'renalVein');
binding = withDerivedValue(binding, 'marginsInvolved', involved.options[1].id, 'ureter');
binding = withDerivedValue(binding, 'marginsInvolved', involved.options[2].id, 'softTissue');
const derive = (answers: Record<string, string | string[]>) =>
  derivedMarginAnswers({ binding, answers, fields: fields as never, scheme: BUILT_IN_ORGAN_MAP_SCHEME, thresholds: BUILT_IN_ORGAN_MAP_THRESHOLDS });

describe('the map’s margins', () => {
  it('each mapped organ names its margins; maps without margins have none', () => {
    expect(marginKeysFor('renalResection')).toEqual(['renalVein', 'ureter', 'softTissue', 'parenchymal']);
    expect(marginKeysFor('rectalResection')).toEqual(['crm', 'distal']);
    expect(marginKeysFor('breastClock')).toHaveLength(6);
    expect([marginKeysFor('neckDissection'), marginKeysFor('mohsStages'), marginKeysFor('prostateBiopsy')]).toEqual([[], [], []]);
    expect([marginKeyOf('breastClock', 'm_superior_dcis'), marginKeyOf('colorectalPolyp', 'lateralR'), marginKeyOf('renalResection', 'upper_lateral')]).toEqual(['superior', 'lateral', undefined]);
  });
  it('status: involved as soon as any is; otherwise only once every margin is reported — close when one is close', () => {
    const s = (cats: Record<string, string>) => derivedMarginState({ mapType: 'oralCavity', sectors: Object.entries(cats).map(([id, category]) => ({ id, category })) as never });
    expect(s({ mPeripheral: 'marginClose', mDeep: 'marginPositive' })).toEqual({ status: 'involved', involved: ['deep'] });
    expect(s({ mPeripheral: 'marginClose', mDeep: 'marginClear' })).toEqual({ status: 'close', involved: [] });
    expect(s({ mPeripheral: 'marginClear', mDeep: 'marginClear' })).toEqual({ status: 'notInvolved', involved: [] });
    // A margin still blank: no "not involved" yet.
    expect(s({ mPeripheral: 'marginClear', mDeep: 'notSampled' })).toEqual({ involved: [] });
    // A margin with several sectors counts once any is reported (the CRM quadrants).
    const r = derivedMarginState({ mapType: 'rectalResection', sectors: [{ id: 'crm_anterior', category: 'marginClear' }, { id: 'crm_left', category: 'notSampled' }, { id: 'long_distal', category: 'marginClear' }] as never });
    expect(r).toEqual({ status: 'notInvolved', involved: [] });
    expect(s({ mPeripheral: 'notSampled', mDeep: 'notSampled', tongueR: 'invasive' })).toEqual({ involved: [] });
  });
});

describe('the generic answers follow the map (Kidney Resection)', () => {
  it('a radical nephrectomy with the vein margin involved and soft tissue on ink', () => {
    const patch = derive({ [`${P}procedure`]: `${P}procedure_radical`, [`${P}veinMargin`]: `${P}veinMargin_involved`, [`${P}ureterMargin`]: `${P}ureterMargin_notInvolved`, [`${P}softTissueMarginMm`]: '0' });
    expect(patch).toEqual({ margin_status: status.options[0].id, margins_involved: [involved.options[0].id, involved.options[2].id] });
  });
  it('clear margins: not involved, nothing listed; already right: no change; a margin blank: the locked answers are cleared', () => {
    const answers = { [`${P}softTissueMarginMm`]: '3', [`${P}ureterMargin`]: `${P}ureterMargin_notInvolved`, [`${P}veinMargin`]: `${P}veinMargin_notInvolved` };
    expect(derive(answers)).toEqual({ margin_status: status.options[1].id });
    expect(derive({ ...answers, margins_involved: [involved.options[0].id] })).toEqual({ margin_status: status.options[1].id, margins_involved: [] });
    expect(derive({ ...answers, margin_status: status.options[1].id, margins_involved: [] })).toEqual({});
    expect(derive({ margin_status: status.options[0].id, margins_involved: [involved.options[0].id] })).toEqual({ margin_status: '', margins_involved: [] });
    expect(derive({})).toEqual({});
    // A derived question that isn't shown is never written.
    const shownOnly = derivedMarginAnswers({ binding, answers, fields: fields.filter(f => f.id !== 'margins_involved') as never, scheme: BUILT_IN_ORGAN_MAP_SCHEME, thresholds: BUILT_IN_ORGAN_MAP_THRESHOLDS });
    expect(Object.keys(shownOnly)).toEqual(['margin_status']);
  });
  it('a "close" status uses the question’s not-involved answer when it has no close answer', () => {
    const payload = { mapType: 'oralCavity' as const, sectors: [{ id: 'mDeep', category: 'marginClose' }] as never };
    const b = { mapType: 'oralCavity', inputs: {}, derived: { marginStatus: { fieldId: 'q', values: { a: 'involved', b: 'notInvolved' } } } } as OrganMapBinding;
    expect(derivedMarginPatch(b, payload, {}, [{ id: 'q', type: 'dropdown' }])).toEqual({ q: 'b' });
  });
  it('the questions it calculates are locked; a binding without them calculates nothing', () => {
    expect(derivedFieldIds(binding)).toEqual(['margin_status', 'margins_involved']);
    expect(derivedFieldIds(base)).toEqual([]);
    expect(derivedMarginAnswers({ binding: base, answers: { [`${P}softTissueMarginMm`]: '0' }, fields: fields as never, scheme: BUILT_IN_ORGAN_MAP_SCHEME })).toEqual({});
  });
});

describe('configuration', () => {
  it('candidates: the template’s choice questions that aren’t map inputs; meanings by kind; wording keys', () => {
    const ids = derivedCandidates(kidneyTpl as never, base).map(f => f.id);
    expect(ids).toEqual(expect.arrayContaining(['margin_status', 'margins_involved']));
    expect(ids.some(id => id.startsWith(P))).toBe(false);
    expect(derivedValues('marginStatus', base)).toEqual(['involved', 'close', 'notInvolved']);
    expect(derivedValues('marginsInvolved', base)).toEqual(marginKeysFor('renalResection'));
    expect(derivedValueKey('marginsInvolved', 'renalResection', 'ureter')).toBe('organMapsSection.bindings.derived.margin.renalResection.ureter');
    expect(bindingProblemInputKey('derived.marginStatus')).toBe('derived.marginStatus');
    expect(withDerivedField(withDerivedField(base, 'marginStatus', 'x'), 'marginStatus', '')).toEqual(base);
  });
  it('validation: a valid derived binding passes; a map input, an unknown meaning, no meanings are refused', () => {
    expect(validateOrganMapBinding(binding, kidneyTpl as never)).toEqual([]);
    const onInput = withDerivedField(base, 'marginStatus', `${P}veinMargin`);
    expect(validateOrganMapBinding(onInput, kidneyTpl as never)).toEqual([{ input: 'derived.marginStatus', problem: 'fieldMissing' }]);
    const noMeanings = withDerivedField(base, 'marginsInvolved', involved.id);
    expect(validateOrganMapBinding(noMeanings, kidneyTpl as never)).toEqual([{ input: 'derived.marginsInvolved', problem: 'noValues' }]);
    // The status needs both its involved and not-involved answers; the margins involved can't be the status question.
    const half = withDerivedValue(withDerivedField(base, 'marginStatus', status.id), 'marginStatus', status.options[0].id, 'involved');
    expect(validateOrganMapBinding(half, kidneyTpl as never)).toEqual([{ input: 'derived.marginStatus', problem: 'noValues' }]);
    const same = withDerivedValue(withDerivedField(binding, 'marginsInvolved', status.id), 'marginsInvolved', status.options[0].id, 'ureter');
    expect(validateOrganMapBinding(same, kidneyTpl as never)).toEqual([{ input: 'derived.marginsInvolved', problem: 'fieldMissing' }]);
    expect(derivedCandidates(kidneyTpl as never, binding, 'marginsInvolved').map(f => f.id)).not.toContain('margin_status');
    expect(derivedCandidates(kidneyTpl as never, binding, 'marginsInvolved').every(f => f.type === 'checkboxes')).toBe(true);
    const bad = withDerivedValue(withDerivedField(base, 'marginsInvolved', involved.id), 'marginsInvolved', involved.options[0].id, 'crm');
    expect(validateOrganMapBinding(bad, kidneyTpl as never)).toEqual([{ input: 'derived.marginsInvolved', problem: 'unknownValue' }]);
  });
});

describe('Batch 466d (Pete): margins per component — the invasive carcinoma apart from its precursor', () => {
  const adenoma = [{ key: 'adenomaAtMargin', pattern: 'hatch' }];
  const polyp = (lateral = 'marginClear', meta: Record<string, string> = {}, deep = 'marginClear', lesion = 'invasive') => ({ mapType: 'colorectalPolyp' as const, meta, sectors: [
    { id: 'lesion', category: lesion, overlays: [] },
    { id: 'deep', category: deep, overlays: [] },
    { id: 'lateralL', category: lateral, overlays: meta.adenomaAtMargin === 'present' ? adenoma : [] },
    { id: 'lateralR', category: lateral, overlays: meta.adenomaAtMargin === 'present' ? adenoma : [] },
  ] as never });
  const b = { mapType: 'colorectalPolyp', inputs: {}, derived: {
    marginStatus: { fieldId: 'ist', values: { iinv: 'involved', iclr: 'notInvolved' } },
    marginsInvolved: { fieldId: 'imi', values: { d: 'deep', l: 'lateral' } },
    precursorMarginStatus: { fieldId: 'pst', values: { pinv: 'involved', pclr: 'notInvolved' } },
  } } as OrganMapBinding;
  const fieldsP = [{ id: 'ist', type: 'radio' }, { id: 'imi', type: 'checkboxes' }, { id: 'pst', type: 'radio' }];
  it('adenoma at the lateral margin makes the adenoma margins involved and never the carcinoma’s', () => {
    expect(derivedMarginPatch(b, polyp('marginClear', { adenomaAtMargin: 'present' }), {}, fieldsP)).toEqual({ ist: 'iclr', pst: 'pinv' });
    expect(derivedMarginPatch(b, polyp('marginClear', { adenomaAtMargin: 'absent' }), {}, fieldsP)).toEqual({ ist: 'iclr', pst: 'pclr' });
    // Carcinoma at the deep margin, adenoma clear: each its own call.
    expect(derivedMarginPatch(b, polyp('marginClear', { adenomaAtMargin: 'absent' }, 'marginPositive'), {}, fieldsP)).toEqual({ ist: 'iinv', imi: ['d'], pst: 'pclr' });
    // The adenoma margin not answered: its status stays empty (cleared if stored), the carcinoma's still goes out.
    expect(derivedMarginPatch(b, polyp(), { pst: 'pinv' }, fieldsP)).toEqual({ ist: 'iclr', pst: '' });
  });
  it('breast: invasive and DCIS margins by their own sectors; oral cavity: dysplasia at the mucosal margin', () => {
    const faces = ['superior', 'inferior', 'medial', 'lateral', 'anterior', 'posterior'];
    const breast = { mapType: 'breastClock' as const, sectors: faces.flatMap(f => [
      { id: `m_${f}_inv`, category: 'marginClear' }, { id: `m_${f}_dcis`, category: f === 'superior' ? 'marginPositive' : 'marginClear' },
    ]) as never };
    expect(derivedMarginState(breast, 'invasive')).toEqual({ status: 'notInvolved', involved: [] });
    expect(derivedMarginState(breast, 'precursor')).toEqual({ status: 'involved', involved: ['superior'] });
    const oral = (dysplasia?: string) => ({ mapType: 'oralCavity' as const, meta: dysplasia ? { dysplasia } : {}, sectors: [{ id: 'mPeripheral', category: 'marginClear' }, { id: 'mDeep', category: 'marginClear' }] as never });
    expect([derivedMarginState(oral('highGrade'), 'invasive').status, derivedMarginState(oral('highGrade'), 'precursor')]).toEqual(['notInvolved', { status: 'involved', involved: ['peripheral'] }]);
    expect(derivedMarginState(oral('absent'), 'precursor')).toEqual({ status: 'notInvolved', involved: [] });
    // Batch 466e (Pete): low-grade dysplasia at the mucosal margin counts as not involved; only high-grade involves it.
    expect(derivedMarginState(oral('lowGrade'), 'precursor')).toEqual({ status: 'notInvolved', involved: [] });
    expect(derivedMarginState(oral(), 'precursor')).toEqual({ involved: [] });
  });
  it('which maps have a precursor pair; labels by component', () => {
    expect(derivedKeysFor('renalResection')).toEqual(['marginStatus', 'marginsInvolved']);
    expect(derivedKeysFor('colorectalPolyp')).toHaveLength(4);
    expect(derivedKeysFor('neckDissection')).toEqual([]);
    expect([precursorMarginKeysFor('colorectalPolyp'), precursorMarginKeysFor('oralCavity'), precursorMarginKeysFor('rectalResection')]).toEqual([['lateral'], ['peripheral'], []]);
    expect(derivedKeyLabelKey('marginStatus', 'renalResection')).toBe('organMapsSection.bindings.derived.marginStatus');
    expect(derivedKeyLabelKey('marginStatus', 'breastClock')).toBe('organMapsSection.bindings.derived.invasive.status');
    expect(derivedKeyLabelKey('precursorMarginsInvolved', 'breastClock')).toBe('organMapsSection.bindings.derived.precursor.dcis.involved');
  });
  it('validation: one question can’t serve two roles; a precursor question on a one-component map is refused', () => {
    const shared = { ...b, derived: { ...b.derived, precursorMarginStatus: { fieldId: 'ist', values: { iinv: 'involved', iclr: 'notInvolved' } } } } as OrganMapBinding;
    const tpl = { id: 'x', sections: [{ fields: [
      { id: 'ist', type: 'radio', options: [{ id: 'iinv' }, { id: 'iclr' }] }, { id: 'imi', type: 'checkboxes', options: [{ id: 'd' }, { id: 'l' }] },
      { id: 'pst', type: 'radio', options: [{ id: 'pinv' }, { id: 'pclr' }] },
    ] }] };
    const fieldsT = tpl.sections[0].fields;
    expect(validateDerivedBindings(b, fieldsT, new Set())).toEqual([]);
    expect(validateDerivedBindings(shared, fieldsT, new Set())).toEqual([{ input: 'derived.precursorMarginStatus', problem: 'sharedQuestion' }]);
    // The candidates leave out a question another role holds.
    expect(derivedCandidates(tpl as never, b, 'precursorMarginStatus').map(f => f.id)).toEqual(['pst']);
    const renalPrecursor = withDerivedField(base, 'precursorMarginStatus', status.id);
    expect(validateOrganMapBinding(renalPrecursor, kidneyTpl as never)).toEqual([{ input: 'derived.precursorMarginStatus', problem: 'unknownValue' }]);
  });
  it('the sign-out warning: invasive carcinoma with a margin still blank — none when one is involved, all reported, or no carcinoma', () => {
    expect(invasiveMarginGaps(polyp('notSampled'))).toEqual(['lateral']);
    expect(invasiveMarginGaps(polyp('notSampled', {}, 'marginPositive'))).toEqual([]);
    expect(invasiveMarginGaps(polyp())).toEqual([]);
    expect(invasiveMarginGaps(polyp('notSampled', {}, 'notSampled', 'adenoma'))).toEqual([]);
    expect(bindingDraftDirty(b, { ...b })).toBe(false);
  });
});

describe('Batch 466d: existing bindings when margins become per component', () => {
  const C = 'psmap_crp_derived_';
  it('PathScribe’s Colorectal Local Excision binds its CAP margin questions itself', () => {
    const d = pathScribeDefaultBinding(polypTpl as never)!.derived!;
    expect([d.marginStatus!.fieldId, d.marginsInvolved!.fieldId, d.precursorMarginStatus!.fieldId]).toEqual([`${C}marginStatus`, `${C}marginsInvolved`, `${C}precursorMarginStatus`]);
    expect(d.marginStatus!.values).toEqual({ [`${C}marginStatus_notInvolved`]: 'notInvolved', [`${C}marginStatus_involved`]: 'involved' });
  });
  it('a lab binding for it: a role on a removed question is dropped, empty roles filled from PathScribe’s, no review', () => {
    const def = pathScribeDefaultBinding(polypTpl as never)!;
    const lab = { mapType: 'colorectalPolyp', inputs: (def as { inputs: object }).inputs, derived: { marginStatus: { fieldId: 'peripheral_margin_involvement', values: { x: 'involved' } } } } as OrganMapBinding;
    const up = upgradeStoredBinding(polypTpl as never, lab);
    expect(up.derived).toEqual(def.derived);
    expect([bindingNeedsMarginReview(up), up.marginComponents]).toEqual([false, true]);
    expect(resolveOrganMapBinding(polypTpl as never, { colorectal_local_excision: lab })!.derived).toEqual(def.derived);
  });
  it('a lab’s own question saved before 466d on a map with a precursor waits for review: not calculated, then confirmed by saving', () => {
    const tpl = { id: 'lab_polyp', sections: [{ fields: [{ id: 'lab_margin', type: 'radio', options: [{ id: 'a' }, { id: 'b' }] }] }] };
    const old = { mapType: 'colorectalPolyp', inputs: {}, derived: { marginStatus: { fieldId: 'lab_margin', values: { a: 'involved', b: 'notInvolved' } } } } as OrganMapBinding;
    expect(bindingNeedsMarginReview(old)).toBe(true);
    expect(resolveOrganMapBinding(tpl as never, { lab_polyp: old })!.derived).toBeUndefined();
    expect(organMapBindingStatus(tpl as never, { lab_polyp: old })).toBe('needsReview');
    // The draft is per component, so saving it (unchanged) confirms the assignment.
    const draft = bindingDraftOf(tpl as never, { lab_polyp: old });
    expect([draft.marginComponents, bindingDraftDirty(draft, old)]).toEqual([true, true]);
    expect(organMapBindingStatus(tpl as never, { lab_polyp: draft })).toBe('lab');
    // Renal: one component, so a 466b binding carries on.
    expect(bindingNeedsMarginReview(binding)).toBe(false);
  });
  it('a polyp answered as having no invasive carcinoma leaves the carcinoma’s margins without a status', () => {
    const payload = { mapType: 'colorectalPolyp' as const, meta: { invasiveCarcinoma: 'absent', adenomaAtMargin: 'present' }, sectors: [{ id: 'deep', category: 'marginClear', overlays: [] }, { id: 'lateralL', category: 'marginClear', overlays: [] }] as never };
    expect([derivedMarginState(payload, 'invasive'), derivedMarginState(payload, 'precursor').status]).toEqual([{ involved: [] }, 'involved']);
  });
  it('breast: only the faces the lab’s margins grid has are waited for', () => {
    const sectors = ['superior', 'inferior', 'medial', 'lateral', 'anterior', 'posterior'].flatMap(f => [
      { id: `m_${f}_inv`, category: f === 'superior' || f === 'inferior' ? 'marginClear' : 'notSampled' }, { id: `m_${f}_dcis`, category: 'notSampled' },
      { id: `c_${f}`, category: 'invasive' },
    ]) as never;
    const b2 = { mapType: 'breastClock', margins: { fieldId: 'g', rows: { r1: 'superior', r2: 'inferior' }, columns: { invasive: 'inv' } } } as unknown as OrganMapBinding;
    const scope = marginScopeOf(b2);
    expect(derivedMarginState({ mapType: 'breastClock', sectors }, 'invasive', scope)).toEqual({ status: 'notInvolved', involved: [] });
    expect(invasiveMarginGaps({ mapType: 'breastClock', sectors }, scope)).toEqual([]);
    expect(invasiveMarginGaps({ mapType: 'breastClock', sectors })).toEqual(['medial', 'lateral', 'anterior', 'posterior']);
  });
});
