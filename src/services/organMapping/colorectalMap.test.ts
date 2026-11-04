// @vitest-environment happy-dom
// src/services/organMapping/colorectalMap.test.ts
// Batch 464: the colorectal maps — a polyp drawn by its Paris type with the
// Haggitt or Kikuchi levels its carcinoma reaches and its margins judged by
// the site's malignant-polyp rule; a rectal resection with the tumour's
// quadrants, the CRM judged by the site's CRM rule, the peritoneal reflection
// and the distal margin. The rules' thresholds and operators, the bindings,
// the drawing and words, and the demo cases.
import { describe, expect, it } from 'vitest';
import localExcision from '@/data/templates/generic/colorectal_local_excision.json';
import resectionB from '@/data/templates/generic/colorectal_resection_b.json';
import colonResection from '@/data/templates/generic/colon_resection.json';
import { mockCaseService } from '../cases/mockCaseService';
import { pathScribeDefaultBinding, validateOrganMapBinding, FIELD_INPUT_SPECS, type FieldInputsBinding } from './organMapBindings';
import {
  BUILT_IN_ORGAN_MAP_SCHEME, BUILT_IN_ORGAN_MAP_THRESHOLDS, marginInvolved, organMapSchemeChangeDetail, resolveOrganMapScheme, validateOrganMapScheme,
  type OrganMapThresholds,
} from './organMapScheme';
import { resolveOrganMap } from './resolveProstateMap';
import { organMapLayout, renderOrganMapSvg } from './organMapDrawing';
import { organMapInlineText, organMapLabelsFor, organMapSectorName, organMapSectorSummary } from './organMapLabels';
import {
  bindableFields, bindingProblemInputKey, emptyOrganMapBinding, fieldInputCandidates, thresholdHintKey, withFieldInput, withFieldInputValue, withThresholdRow, withoutThresholdRow,
} from './organMapConfigDraft';
import { THRESHOLD_ROWS } from './organMapScheme';

const scheme = BUILT_IN_ORGAN_MAP_SCHEME;
const T = BUILT_IN_ORGAN_MAP_THRESHOLDS;
const polypBinding = pathScribeDefaultBinding(localExcision as never) as FieldInputsBinding;
const rectalBinding = pathScribeDefaultBinding(resectionB as never) as FieldInputsBinding;
const P = 'psmap_crp_'; const R = 'psmap_rec_';
const polyp = (answers: Record<string, string | string[]>, thresholds: OrganMapThresholds = T) =>
  resolveOrganMap({ binding: polypBinding, answers, scheme, thresholds, templateId: localExcision.id, instanceId: 'i1' });
const rectal = (answers: Record<string, string | string[]>, thresholds: OrganMapThresholds = T) =>
  resolveOrganMap({ binding: rectalBinding, answers, scheme, thresholds, templateId: resectionB.id, instanceId: 'i1' });
const cat = (p: { sectors: { id: string; category: string }[] }) => Object.fromEntries(p.sectors.map(s => [s.id, s.category]));
const t = (k: string, o: Record<string, unknown> = {}) => `${k}${Object.keys(o).length ? JSON.stringify(o) : ''}`;

describe('the site rules (Pete: a distance and an operator, set per site, ≤ 1.0 mm by default)', () => {
  it('compares by ≤, < or =; a missing or negative distance is not a distance', () => {
    expect([marginInvolved(1, 1, 'lte'), marginInvolved(1, 1, 'lt'), marginInvolved(0.5, 1, 'lt'), marginInvolved(0, 0, 'eq'), marginInvolved(0.2, 0, 'eq')]).toEqual([true, false, true, true, false]);
    expect([marginInvolved(undefined, 1, 'lte'), marginInvolved(-1, 1, 'lte')]).toEqual([undefined, undefined]);
    // Review: carcinoma on ink is involved whatever the operator.
    expect([marginInvolved(0, 1, 'eq'), marginInvolved(0, 0, 'lt')]).toEqual([true, true]);
  });
  it('layers per site like the colours, validated and audited', () => {
    expect([T.polypInvolvedMarginMm, T.polypInvolvedMarginOperator, T.rectalCrmInvolvedMm, T.rectalCrmInvolvedOperator]).toEqual([1, 'lte', 1, 'lte']);
    const r = resolveOrganMapScheme({ enterprise: { thresholds: { polypInvolvedMarginMm: 0 } }, facilities: { F1: { thresholds: { polypInvolvedMarginOperator: 'eq' } } } }, { facilityId: 'F1' });
    expect([r.thresholds.polypInvolvedMarginMm, r.thresholds.polypInvolvedMarginOperator, r.thresholdSources.polypInvolvedMarginOperator]).toEqual([0, 'eq', 'facility']);
    expect(resolveOrganMapScheme({ enterprise: { thresholds: { polypInvolvedMarginOperator: 'gte' as never } } }, {}).thresholds.polypInvolvedMarginOperator).toBe('lte');
    expect(validateOrganMapScheme({ thresholds: { polypInvolvedMarginMm: 0, rectalCrmInvolvedOperator: 'lt' } })).toEqual([]);
    expect(validateOrganMapScheme({ thresholds: { polypInvolvedMarginMm: -1, rectalCrmInvolvedOperator: 'gte' as never } }))
      .toEqual([{ key: 'polypInvolvedMarginMm', problem: 'threshold' }, { key: 'rectalCrmInvolvedOperator', problem: 'operator' }]);
    // "=" is for on-ink-only, with 0 mm.
    expect(validateOrganMapScheme({ thresholds: { polypInvolvedMarginMm: 1, polypInvolvedMarginOperator: 'eq' } })).toEqual([{ key: 'polypInvolvedMarginOperator', problem: 'equalsNeedsZero' }]);
    expect(validateOrganMapScheme({ thresholds: { polypInvolvedMarginMm: 0, polypInvolvedMarginOperator: 'eq' } })).toEqual([]);
    // A stored value outside the screen's range is ignored when resolving.
    expect(resolveOrganMapScheme({ enterprise: { thresholds: { rectalCrmInvolvedMm: -5 } } }, {}).thresholds.rectalCrmInvolvedMm).toBe(1);
    expect(organMapSchemeChangeDetail('facility F1', undefined, { thresholds: { polypInvolvedMarginOperator: 'lt' } })).toBe('Organ map colours (facility F1): polypInvolvedMarginOperator: (inherited) → lt');
  });
  it('the configuration screen overrides a row (distance and operator together) and gives it back', () => {
    const row = THRESHOLD_ROWS.find(r => r.key === 'polypInvolvedMarginMm')!;
    const d = withThresholdRow({}, row, { ...T, polypInvolvedMarginMm: 2 });
    expect(d).toEqual({ thresholds: { polypInvolvedMarginMm: 2, polypInvolvedMarginOperator: 'lte' } });
    expect(withoutThresholdRow(d, row)).toEqual({});
    expect(THRESHOLD_ROWS.map(r => thresholdHintKey(r.key))).toEqual(['breastCloseMarginHint', 'polypInvolvedMarginHint', 'rectalCrmInvolvedHint', 'oralInvolvedMarginHint', 'oralCloseMarginHint', 'renalParenchymalInvolvedHint', 'renalSoftTissueInvolvedHint']);
  });
});

describe('templates and bindings', () => {
  it('PathScribe’s map questions bind themselves: the polyp in Local Excision, the rectal map in both resection templates', () => {
    expect(polypBinding.mapType).toBe('colorectalPolyp');
    expect(Object.keys(polypBinding.inputs)).toEqual(FIELD_INPUT_SPECS.colorectalPolyp.map(s => s.key));
    expect((polypBinding.inputs.paris as { values: Record<string, string> }).values).toMatchObject({ [`${P}paris_0-Ip`]: '0-Ip', [`${P}paris_0-III`]: '0-III' });
    for (const tpl of [resectionB, colonResection]) {
      const b = pathScribeDefaultBinding(tpl as never) as FieldInputsBinding;
      expect(b.mapType, tpl.id).toBe('rectalResection');
      expect(validateOrganMapBinding(b, tpl as never)).toEqual([]);
    }
    expect(validateOrganMapBinding(polypBinding, localExcision as never)).toEqual([]);
  });
  it('a lab binds its own questions: choice inputs to choice questions with their meanings, numbers to numeric ones; validated', () => {
    const lab = { id: 'lab_polyp', sections: [{ fields: [
      { id: 'shape', type: 'dropdown', label: 'Shape', options: [{ id: 'ped', label: 'Pedunculated' }, { id: 'ses', label: 'Sessile' }] },
      { id: 'deep', type: 'numeric', label: 'Deep (mm)' },
      { id: 'note', type: 'longtext', label: 'Note' },
    ] }] };
    const specOf = (k: string) => FIELD_INPUT_SPECS.colorectalPolyp.find(s => s.key === k)!;
    expect(fieldInputCandidates(lab as never, specOf('paris')).map(f => f.id)).toEqual(['shape']);
    expect(fieldInputCandidates(lab as never, specOf('deepMarginMm')).map(f => f.id)).toEqual(['deep']);
    expect(bindableFields(lab as never, 'colorectalPolyp').map(f => f.id)).toEqual(['shape', 'deep']);
    let b = emptyOrganMapBinding('colorectalPolyp') as FieldInputsBinding;
    expect(validateOrganMapBinding(b, lab as never)).toEqual([{ input: 'paris', problem: 'fieldMissing' }]);
    b = withFieldInput(b, specOf('paris'), 'shape');
    expect(validateOrganMapBinding(b, lab as never)).toEqual([{ input: 'paris', problem: 'noValues' }]);
    b = withFieldInputValue(withFieldInputValue(b, 'paris', 'ped', '0-Ip'), 'paris', 'ses', '0-Is');
    b = withFieldInput(b, specOf('deepMarginMm'), 'deep');
    expect(validateOrganMapBinding(b, lab as never)).toEqual([]);
    expect(validateOrganMapBinding(withFieldInput(b, specOf('lateralMarginMm'), 'shape'), lab as never)).toEqual([{ input: 'lateralMarginMm', problem: 'fieldMissing' }]);
    expect(validateOrganMapBinding(withFieldInputValue(b, 'paris', 'ped', 'stalked'), lab as never)).toEqual([{ input: 'paris', problem: 'unknownValue' }]);
    expect(withFieldInputValue(b, 'paris', 'ped', '').inputs.paris).toEqual({ fieldId: 'shape', values: { ses: '0-Is' } });
    expect(bindingProblemInputKey('crmMm')).toBe('colorectal.inputs.crmMm');
    const m = polyp({ shape: 'ped' });
    expect(m.hasData).toBe(false); // the PathScribe binding doesn't read a lab's questions
    expect(resolveOrganMap({ binding: b, answers: { shape: 'ped', deep: '3' }, scheme, thresholds: T, templateId: 'lab_polyp', instanceId: 'x' }).variant).toBe('0-Ip');
  });
});

describe('the polyp map', () => {
  it('nothing until a map question is answered; the drawing follows the Paris type (sessile when none)', () => {
    expect(polyp({}).hasData).toBe(false);
    expect(polyp({}).variant).toBe('0-Is');
    expect(polyp({ [`${P}paris`]: `${P}paris_0-Ip` }).sectors.map(s => s.id)).toEqual(['h1', 'h2', 'h3', 'h4', 'deep']);
    expect(polyp({ [`${P}paris`]: `${P}paris_0-IIc` }).sectors.map(s => s.id)).toEqual(['mucosaL', 'mucosaR', 'submucosaL', 'submucosaR', 'sm1', 'sm2', 'sm3', 'lesion', 'lateralL', 'lateralR', 'deep']);
    // A Haggitt level with no Paris type is drawn pedunculated.
    expect(polyp({ [`${P}depth`]: `${P}depth_haggitt3` }).variant).toBe('0-Ip');
  });
  it('pedunculated: carcinoma from the head down to its Haggitt level; the stalk margin judged by the site rule', () => {
    const m = polyp({ [`${P}paris`]: `${P}paris_0-Ip`, [`${P}invasive`]: `${P}invasive_yes`, [`${P}depth`]: `${P}depth_haggitt2`, [`${P}deepMarginMm`]: '0.8' });
    expect(cat(m)).toEqual({ h1: 'invasive', h2: 'invasive', h3: 'benign', h4: 'benign', deep: 'marginPositive' });
    expect(m.sectors.find(s => s.id === 'deep')!.details).toEqual({ marginMm: 0.8, involved: true });
    // The site's own rule: involved only on ink (0 mm, =) — 0.8 mm is clear.
    const strict = polyp({ [`${P}paris`]: `${P}paris_0-Ip`, [`${P}invasive`]: `${P}invasive_yes`, [`${P}deepMarginMm`]: '0.8' }, { ...T, polypInvolvedMarginMm: 0, polypInvolvedMarginOperator: 'eq' });
    expect(cat(strict).deep).toBe('marginClear');
    expect(cat(strict).h1).toBe('invasive'); // invasive with no level: the head
    expect(strict.meta).toMatchObject({ paris: '0-Ip', scale: 'haggitt', rule: 'eq:0' });
    // A change of rule changes the image.
    expect(strict.fingerprint).not.toBe(polyp({ [`${P}paris`]: `${P}paris_0-Ip`, [`${P}invasive`]: `${P}invasive_yes`, [`${P}deepMarginMm`]: '0.8' }).fingerprint);
  });
  it('sessile: adenoma in the mucosa, carcinoma down to its Kikuchi third; lateral margins with adenoma marked', () => {
    const m = polyp({
      [`${P}paris`]: `${P}paris_0-IIa`, [`${P}invasive`]: `${P}invasive_yes`, [`${P}depth`]: `${P}depth_sm2`,
      [`${P}deepMarginMm`]: '3', [`${P}lateralMarginMm`]: '1', [`${P}lateralAdenoma`]: `${P}lateralAdenoma_present`,
    });
    const c = cat(m);
    expect([c.lesion, c.sm1, c.sm2, c.sm3, c.deep, c.lateralL, c.lateralR, c.mucosaL]).toEqual(['adenoma', 'invasive', 'invasive', 'benign', 'marginClear', 'marginPositive', 'marginPositive', 'benign']);
    expect(m.sectors.find(s => s.id === 'lateralL')!.overlays.map(o => o.key)).toEqual(['adenomaAtMargin']);
    expect(m.legend.map(l => l.key)).toEqual(['benign', 'invasive', 'marginClear', 'marginPositive', 'adenoma', 'adenomaAtMargin']);
  });
  it('review: with the carcinoma question unanswered or not bound, a depth or a margin distance means carcinoma', () => {
    const c = cat(polyp({ [`${P}paris`]: `${P}paris_0-Is`, [`${P}depth`]: `${P}depth_sm3`, [`${P}deepMarginMm`]: '0.2' }));
    expect([c.sm3, c.deep]).toEqual(['invasive', 'marginPositive']);
    expect(cat(polyp({ [`${P}paris`]: `${P}paris_0-Is`, [`${P}lateralAdenoma`]: `${P}lateralAdenoma_present` })).lesion).toBe('adenoma');
  });
  it('no carcinoma: the lesion is adenoma and the margins are clear of carcinoma; no distance: not given', () => {
    expect(cat(polyp({ [`${P}paris`]: `${P}paris_0-Is`, [`${P}invasive`]: `${P}invasive_no` }))).toMatchObject({ lesion: 'adenoma', deep: 'marginClear', lateralL: 'marginClear', sm1: 'benign' });
    expect(cat(polyp({ [`${P}paris`]: `${P}paris_0-Is`, [`${P}invasive`]: `${P}invasive_yes` }))).toMatchObject({ lesion: 'invasive', deep: 'notSampled' });
    expect(cat(polyp({ [`${P}paris`]: `${P}paris_0-Is`, [`${P}invasive`]: `${P}invasive_yes`, [`${P}deepMarginMm`]: '-2' })).deep).toBe('notSampled');
  });
});

describe('the rectal resection map', () => {
  it('the tumour’s quadrants; the CRM at its closest quadrant judged by the site rule, the others clear', () => {
    const m = rectal({
      [`${R}quadrants`]: [`${R}quadrants_anterior`, `${R}quadrants_left`], [`${R}crmMm`]: '1', [`${R}crmQuadrant`]: `${R}crmQuadrant_anterior`,
      [`${R}tmePlane`]: `${R}tmePlane_intramesorectal`, [`${R}reflection`]: `${R}reflection_at`, [`${R}distalMarginMm`]: '0',
    });
    const c = cat(m);
    expect([c.wall_anterior, c.wall_left, c.wall_posterior, c.wall_right]).toEqual(['invasive', 'invasive', 'benign', 'benign']);
    expect([c.crm_anterior, c.crm_left, c.crm_posterior, c.crm_right]).toEqual(['marginPositive', 'marginClear', 'marginClear', 'marginClear']);
    expect([c.long_tumour, c.long_distal]).toEqual(['invasive', 'marginPositive']);
    expect(m.variant).toBe('at');
    expect(m.meta).toEqual({ tme: 'intramesorectal', reflection: 'at', rule: 'lte:1' });
    // Below 1 mm only (<): 1 mm is not involved.
    expect(cat(rectal({ [`${R}crmMm`]: '1', [`${R}crmQuadrant`]: `${R}crmQuadrant_anterior` }, { ...T, rectalCrmInvolvedOperator: 'lt' })).crm_anterior).toBe('marginClear');
  });
  it('circumferential tumour; no closest quadrant given: the tumour’s quadrants carry the CRM; no reflection: no tumour on the long view', () => {
    const m = rectal({ [`${R}quadrants`]: [`${R}quadrants_circumferential`], [`${R}crmMm`]: '0.5' });
    expect(Object.values(cat(m)).filter(v => v === 'invasive')).toHaveLength(4);
    expect(m.sectors.filter(s => s.id.startsWith('crm_')).every(s => s.category === 'marginPositive')).toBe(true);
    expect(m.sectors.some(s => s.id === 'long_tumour')).toBe(false);
    expect(m.variant).toBeUndefined();
    expect(cat(rectal({ [`${R}quadrants`]: [`${R}quadrants_posterior`] })).crm_posterior).toBe('notSampled');
    // Review: a CRM distance with neither its position nor the tumour's: every quadrant judged, never clear by default; the caption says so.
    const unknown = rectal({ [`${R}crmMm`]: '0.5' });
    expect(unknown.sectors.filter(s => s.id.startsWith('crm_')).map(s => s.category)).toEqual(['marginPositive', 'marginPositive', 'marginPositive', 'marginPositive']);
    expect(unknown.meta!.crmPosition).toBe('notGiven');
    expect(rectal({ [`${R}crmMm`]: '0.5', [`${R}crmQuadrant`]: `${R}crmQuadrant_left` }).meta!.crmPosition).toBeUndefined();
    expect(rectal({}).hasData).toBe(false);
  });
});

describe('drawing and words', () => {
  it('the layout follows the variant; every sector has a shape', () => {
    for (const paris of ['0-Ip', '0-Isp', '0-Is', '0-IIa', '0-IIb', '0-IIc', '0-III']) {
      const m = polyp({ [`${P}paris`]: `${P}paris_${paris}` });
      const ids = new Set(organMapLayout('colorectalPolyp', undefined, 0, m.variant).shapes.map(s => s.id));
      expect(m.sectors.every(s => ids.has(s.id)), paris).toBe(true);
    }
    expect(organMapLayout('rectalResection', undefined, 0, 'below').shapes.some(s => s.id === 'long_tumour')).toBe(true);
    expect(organMapLayout('rectalResection').shapes.some(s => s.id === 'long_tumour')).toBe(false);
  });
  it('names, inline distances, summaries and captions with the Paris type, the TME plane and the site rule', () => {
    expect(organMapSectorName(t, 'colorectalPolyp', 'h2')).toBe('organMap.colorectal.sector.h2');
    const m = polyp({ [`${P}paris`]: `${P}paris_0-Ip`, [`${P}invasive`]: `${P}invasive_yes`, [`${P}deepMarginMm`]: '0.8' });
    const deep = m.sectors.find(s => s.id === 'deep')!;
    expect(organMapInlineText(t, 'colorectalPolyp', deep, 'deep')).toEqual(['organMap.colorectal.inline.mm{"n":0.8}']);
    const summary = organMapSectorSummary((k, o) => (k === 'organMap.details.separator' ? `${o!.a} | ${o!.b}` : k), 'colorectalPolyp', deep, scheme);
    expect(summary.split(' | ')).toEqual(['organMap.colorectal.sector.deep', 'organMap.legendByMap.colorectalPolyp.marginPositive', 'organMap.breast.details.margin', 'organMap.colorectal.details.involved']);
    const labels = organMapLabelsFor(t, m, scheme);
    expect(labels.captions.title).toBe('organMap.colorectal.caption.titleParis{"paris":"organMap.colorectal.value.0-Ip"}');
    expect(labels.captions.rule).toBe('organMap.colorectal.polypRule{"op":"organMap.colorectal.operator.lte","n":1}');
    const r = rectal({ [`${R}tmePlane`]: `${R}tmePlane_mesorectal` });
    const sep = (k: string, o: Record<string, unknown> = {}) => (k === 'organMap.details.separator' ? `${o.a} · ${o.b}` : t(k, o));
    expect(organMapLabelsFor(sep, r, scheme).captions.tme).toBe('organMap.colorectal.caption.tmePlane{"plane":"organMap.colorectal.value.mesorectal"} · organMap.colorectal.crmRule{"op":"organMap.colorectal.operator.lte","n":1}');
    const svg = renderOrganMapSvg(m, scheme, labels);
    expect(svg).toContain('organMap.colorectal.caption.titleParis');
    expect(svg).toContain('organMap.colorectal.inline.mm');
  });
});

describe('demo cases', () => {
  it('S26-4464: low rectal tumour, anterior and left, below the reflection; CRM 1.5 mm anteriorly (clear at ≤ 1 mm); distal 25 mm; mesorectal plane', async () => {
    const c = (await mockCaseService.getCase('S26-4464'))!;
    const inst = c.synopticReports![0];
    const m = rectal(inst.answers as never);
    const k = cat(m);
    expect([k.wall_anterior, k.wall_left, k.crm_anterior, k.long_tumour, k.long_distal, m.variant, m.meta!.tme]).toEqual(['invasive', 'invasive', 'marginClear', 'invasive', 'marginClear', 'below', 'mesorectal']);
    // At a site that calls ≤ 2 mm involved, the same answers show an involved CRM.
    expect(cat(rectal(inst.answers as never, { ...T, rectalCrmInvolvedMm: 2 })).crm_anterior).toBe('marginPositive');
  });
  it('S26-4465: pedunculated malignant polyp, Haggitt 2, stalk margin 0.8 mm — involved at ≤ 1 mm', async () => {
    const c = (await mockCaseService.getCase('S26-4465'))!;
    const m = polyp(c.synopticReports![0].answers as never);
    expect(cat(m)).toEqual({ h1: 'invasive', h2: 'invasive', h3: 'benign', h4: 'benign', deep: 'marginPositive' });
  });
});
