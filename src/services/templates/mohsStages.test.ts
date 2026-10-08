// src/services/templates/mohsStages.test.ts
// Batch 463: the Mohs stage question — stages, sectors with chosen (463b; not auto-lettered)
// blocks and the default histology, clearing, the report text, and voice
// commands in all five languages.
import { describe, expect, it } from 'vitest';
import {
  addMohsStage, applyAnswerPatch, clearMohsStage, mohsCaseClear, mohsDefaultHistology, mohsReportWords, mohsStageCount, mohsStagesDisplay,
  mohsVoicePatch, mohsBlockOptions, mohsBlockProblems, mohsStageBlockProblem, mohsHistologySourceProblem, mohsTemplateProblems, parseMohsVoiceCommand, readMohsStages, removeLastMohsStage, setMohsSector, setMohsSectorDetail,
  setMohsStageDetail, toggleMohsSector, MOHS_MAX_STAGES, mohsSectorToggleEvent, mohsVoiceOutcome, mohsShapePositive,
} from './mohsStages';

const F = 'psmap_mohs_stages';
type A = Record<string, string | string[]>;
const at = (h: number, m: number) => new Date(2026, 9, 5, h, m);
const apply = (answers: A, patch: Record<string, string | string[] | undefined>) => applyAnswerPatch(answers, patch);
/** One stage added at 09:05. */
const oneStage = (): A => apply({}, addMohsStage(F, {}, at(9, 5)));

describe('stages', () => {
  it('adds stages stamped with the time, up to eight; removes the last with everything recorded for it', () => {
    let a = oneStage();
    expect(a).toEqual({ [`${F}__stages`]: '1', [`${F}__s1__time`]: '09:05' });
    a = apply(a, addMohsStage(F, a, at(10, 30)));
    a = apply(a, setMohsSector(F, a, 2, 'c3', 'positive'));
    expect(mohsStageCount(F, a)).toBe(2);
    a = apply(a, removeLastMohsStage(F, a));
    expect(a).toEqual({ [`${F}__stages`]: '1', [`${F}__s1__time`]: '09:05' });
    a = apply(a, removeLastMohsStage(F, a));
    expect(a).toEqual({});
    for (let i = 0; i < MOHS_MAX_STAGES; i++) a = apply(a, addMohsStage(F, a, at(9, i)));
    expect(addMohsStage(F, a, at(12, 0))).toEqual({});
  });

  it('a positive sector starts with no block (click order is not cutting order) and the default histology; negative removes its details', () => {
    let a = oneStage();
    a = apply(a, setMohsSector(F, a, 1, 'c3', 'positive', 'Basal cell carcinoma, nodular'));
    a = apply(a, setMohsSector(F, a, 1, 'deep', 'positive', 'Basal cell carcinoma, nodular'));
    a = apply(a, setMohsSector(F, a, 1, 'c12', 'positive'));
    const [st] = readMohsStages(F, a);
    expect(st.positive.map(p => [p.sectorId, p.block ?? null, p.histology ?? null, p.layer])).toEqual([
      ['c12', null, null, 'peripheral'], ['c3', null, 'Basal cell carcinoma, nodular', 'peripheral'], ['deep', null, 'Basal cell carcinoma, nodular', 'deep'],
    ]);
    expect(st.clear).toBe(false);
    a = apply(a, toggleMohsSector(F, a, 1, 'c3'));
    expect(Object.keys(a).some(k => k.includes('__c3__'))).toBe(false);
    // Setting what is already so changes nothing; a stage that doesn't exist neither.
    expect(setMohsSector(F, a, 1, 'deep', 'positive')).toEqual({});
    expect(setMohsSector(F, a, 3, 'c1', 'positive')).toEqual({});
    // A block given with it (a voice command naming it) is kept, upper case.
    expect(setMohsSector(F, a, 1, 'c6', 'positive', undefined, 'b')).toEqual({ [`${F}__s1__positive`]: ['c12', 'c6', 'deep'], [`${F}__s1__c6__block`]: 'B' });
  });

  it('blocks: choices up to Blocks cut; unassigned or beyond Blocks cut is a problem until fixed (Pete: block traceability)', () => {
    let a = oneStage();
    a = apply(a, setMohsSector(F, a, 1, 'c12', 'positive'));
    a = apply(a, setMohsSector(F, a, 1, 'c1', 'positive'));
    expect(mohsBlockOptions(readMohsStages(F, a)[0])).toHaveLength(26);
    expect(mohsBlockProblems(F, a)).toEqual([{ stage: 1, sectorId: 'c12', problem: 'unassigned' }, { stage: 1, sectorId: 'c1', problem: 'unassigned' }]);
    a = apply(a, setMohsStageDetail(F, 1, 'blocks', '2'));
    a = apply(a, setMohsSectorDetail(F, 1, 'c12', 'block', 'A'));
    a = apply(a, setMohsSectorDetail(F, 1, 'c1', 'block', 'C'));
    // C is beyond 2 blocks cut: still offered (to be seen and corrected), and a problem.
    expect(mohsBlockOptions(readMohsStages(F, a)[0])).toEqual(['A', 'B', 'C']);
    expect(mohsBlockProblems(F, a)).toEqual([{ stage: 1, sectorId: 'c1', problem: 'notCut' }]);
    expect(mohsStageBlockProblem(mohsBlockProblems(F, a), 1)).toBe('notCut');
    // One block may cover two sectors.
    a = apply(a, setMohsSectorDetail(F, 1, 'c1', 'block', 'A'));
    expect(mohsBlockProblems(F, a)).toEqual([]);
    expect(mohsStageBlockProblem([], 1)).toBeUndefined();
  });

  it('review (463b): Blocks cut 0 counts as not entered for both the choices and the check; a block must be one letter', () => {
    let a = oneStage();
    a = apply(a, setMohsSector(F, a, 1, 'c1', 'positive', undefined, 'A'));
    a = apply(a, setMohsStageDetail(F, 1, 'blocks', '0'));
    expect(mohsBlockOptions(readMohsStages(F, a)[0])).toHaveLength(26);
    expect(mohsBlockProblems(F, a)).toEqual([]);
    expect(mohsBlockProblems(F, { ...a, [`${F}__s1__c1__block`]: '1' })).toEqual([{ stage: 1, sectorId: 'c1', problem: 'notCut' }]);
    expect(setMohsSectorDetail(F, 1, 'c1', 'block', 'ab')).toEqual({ [`${F}__s1__c1__block`]: 'A' });
  });

  it('the pathologist overrides a row: block (upper case), histology, perineural invasion; stage blocks and time', () => {
    let a = oneStage();
    a = apply(a, setMohsSector(F, a, 1, 'c6', 'positive', 'BCC'));
    a = apply(a, setMohsSectorDetail(F, 1, 'c6', 'block', ' b '));
    a = apply(a, setMohsSectorDetail(F, 1, 'c6', 'histology', 'Squamous cell carcinoma'));
    a = apply(a, setMohsSectorDetail(F, 1, 'c6', 'pni', true));
    a = apply(a, setMohsStageDetail(F, 1, 'blocks', '4'));
    expect(readMohsStages(F, a)[0]).toEqual({
      number: 1, time: '09:05', blocks: 4, clear: false,
      positive: [{ sectorId: 'c6', layer: 'peripheral', block: 'B', histology: 'Squamous cell carcinoma', perineural: true }],
    });
    a = apply(a, setMohsSectorDetail(F, 1, 'c6', 'pni', false));
    a = apply(a, setMohsStageDetail(F, 1, 'time', ''));
    expect(readMohsStages(F, a)[0].positive[0].perineural).toBe(false);
    expect(readMohsStages(F, a)[0].time).toBeUndefined();
  });

  it('marking a stage clear removes every positive sector; the case is clear when its last stage is', () => {
    let a = oneStage();
    a = apply(a, setMohsSector(F, a, 1, 'c1', 'positive', 'BCC'));
    a = apply(a, setMohsSector(F, a, 1, 'deep', 'positive', 'BCC'));
    expect(mohsCaseClear(readMohsStages(F, a))).toBe(false);
    a = apply(a, clearMohsStage(F, a, 1));
    expect(a).toEqual({ [`${F}__stages`]: '1', [`${F}__s1__time`]: '09:05' });
    expect(mohsCaseClear(readMohsStages(F, a))).toBe(true);
    expect(mohsCaseClear([])).toBe(false);
    expect(clearMohsStage(F, a, 1)).toEqual({});
  });

  it('a canvas click becomes the spec’s SectorToggleEvent; a positive sector’s shape is pressed', () => {
    const st = { number: 2, positive: [{ sectorId: 'c1' as const, layer: 'peripheral' as const, perineural: false }] };
    expect(mohsSectorToggleEvent(st, 's2_c1')).toEqual({ stageNumber: 2, sectorId: 'c1', layerType: 'PERIPHERAL', newStatus: 'NEGATIVE' });
    expect(mohsSectorToggleEvent(st, 's2_deep')).toEqual({ stageNumber: 2, sectorId: 'deep', layerType: 'DEEP', newStatus: 'POSITIVE' });
    expect(mohsSectorToggleEvent(st, 's2_c13')).toBeNull();
    expect([mohsShapePositive(st, 's2_c1'), mohsShapePositive(st, 's2_c11')]).toEqual([true, false]);
  });

  it('ignores unknown sectors and nonsense counts', () => {
    expect(readMohsStages(F, { [`${F}__stages`]: 'two' })).toEqual([]);
    expect(mohsStageCount(F, { [`${F}__stages`]: '40' })).toBe(MOHS_MAX_STAGES);
    expect(readMohsStages(F, { [`${F}__stages`]: '1', [`${F}__s1__positive`]: ['c13', 'deep'] })[0].positive.map(p => p.sectorId)).toEqual(['deep']);
  });

  it('the default histology is the label of the tumour type answered', () => {
    const tpl = { sections: [{ fields: [{ id: 'tt', options: [{ id: 'bcc', label: 'Basal cell carcinoma, nodular' }] }] }] };
    expect(mohsDefaultHistology(tpl, { defaultHistologyFieldId: 'tt' }, { tt: 'bcc' })).toBe('Basal cell carcinoma, nodular');
    expect(mohsDefaultHistology(tpl, { defaultHistologyFieldId: 'tt' }, { tt: ['bcc', 'x'] })).toBe('Basal cell carcinoma, nodular');
    expect(mohsDefaultHistology(tpl, { defaultHistologyFieldId: 'tt' }, {})).toBeUndefined();
    expect(mohsDefaultHistology(tpl, {}, { tt: 'bcc' })).toBeUndefined();
    // "Other": the free text it shows, never the word "Other".
    const withOther = { sections: [{ fields: [
      { id: 'tt', options: [{ id: 'bcc', label: 'BCC' }, { id: 'tt_other', label: 'Other' }] },
      { id: 'tt_text', type: 'text', visibleWhen: { fieldId: 'tt', answerId: 'tt_other' } },
    ] }] };
    expect(mohsDefaultHistology(withOther, { defaultHistologyFieldId: 'tt' }, { tt: 'tt_other', tt_text: 'Microcystic adnexal carcinoma' })).toBe('Microcystic adnexal carcinoma');
    expect(mohsDefaultHistology(withOther, { defaultHistologyFieldId: 'tt' }, { tt: 'tt_other' })).toBeUndefined();
    // Batch 463b: the template editor's check of the source question.
    const mohsTpl = { sections: [{ fields: [{ id: 'tt', type: 'dropdown' }, { id: 'note', type: 'text' }, { id: 'm', type: 'spatialStageCanvas', defaultHistologyFieldId: 'tt' }] }] };
    expect(mohsHistologySourceProblem(mohsTpl, mohsTpl.sections[0].fields[2])).toBeUndefined();
    expect(mohsHistologySourceProblem(mohsTpl, { type: 'spatialStageCanvas', defaultHistologyFieldId: 'gone' })).toBe('missing');
    expect(mohsHistologySourceProblem(mohsTpl, { type: 'spatialStageCanvas', defaultHistologyFieldId: 'note' })).toBe('notChoice');
    expect(mohsHistologySourceProblem(mohsTpl, { type: 'spatialStageCanvas' })).toBeUndefined();
    expect(mohsTemplateProblems(mohsTpl)).toEqual([]);
    expect(mohsTemplateProblems({ sections: [{ fields: [{ id: 'm', type: 'spatialStageCanvas', defaultHistologyFieldId: 'gone' }] }] })).toEqual(['m']);
    // A function patch is built from the answers when applied.
    expect(applyAnswerPatch({ x: '1' }, a => ({ y: String(Number(a.x) + 1) }))).toEqual({ x: '1', y: '2' });
  });
});

describe('report text', () => {
  const t = (k: string, o: Record<string, unknown> = {}) => {
    const last = k.split('.').pop()!;
    if (last === 'join') return `${o.a}, ${o.b}`;
    if (last === 'list') return `${o.a}; ${o.b}`;
    return `${last}${Object.values(o).length ? `(${Object.values(o).join('')})` : ''}`;
  };
  it('a line per stage: time, blocks, clear or residual with each positive sector', () => {
    let a = oneStage();
    a = apply(a, setMohsSector(F, a, 1, 'c12', 'positive', 'BCC', 'A'));
    a = apply(a, setMohsSector(F, a, 1, 'deep', 'positive', 'BCC', 'B'));
    a = apply(a, setMohsSectorDetail(F, 1, 'deep', 'pni', true));
    a = apply(a, setMohsStageDetail(F, 1, 'blocks', '2'));
    a = apply(a, addMohsStage(F, a, at(10, 0)));
    expect(mohsStagesDisplay(F, a, mohsReportWords(t)).split('\n')).toEqual([
      'stage(1), time(09:05), blocksCut(2), residual, hourName(12), peripheral, block(A), BCC; deep, block(B), BCC, perineural',
      'stage(2), time(10:00), clear',
    ]);
  });
});

describe('voice commands (all five languages)', () => {
  const cases: [string, string, ReturnType<typeof parseMohsVoiceCommand>][] = [
    ["Stage 1, positive at 12 o'clock", 'en', { stage: 1, sector: 'c12', status: 'positive' }],
    ['stage two deep negative', 'en-GB', { stage: 2, sector: 'deep', status: 'negative' }],
    ['stage 2 clear', 'en', { stage: 2, status: 'clear' }],
    ['stade 1 positif à 3 heures', 'fr', { stage: 1, sector: 'c3', status: 'positive' }],
    ['étape deux profond négatif', 'fr', { stage: 2, sector: 'deep', status: 'negative' }],
    ['stade 2 sain', 'fr', { stage: 2, status: 'clear' }],
    ['Stufe 1 positiv bei 12 Uhr', 'de', { stage: 1, sector: 'c12', status: 'positive' }],
    ['Stufe zwei tief positiv', 'de', { stage: 2, sector: 'deep', status: 'positive' }],
    ['Stufe 3 tumorfrei', 'de', { stage: 3, status: 'clear' }],
    ['stadium 1 positief op 9 uur', 'nl', { stage: 1, sector: 'c9', status: 'positive' }],
    ['fase twee diep negatief', 'nl', { stage: 2, sector: 'deep', status: 'negative' }],
    ['stadium 2 vrij', 'nl', { stage: 2, status: 'clear' }],
    ['1단계 12시 양성', 'ko', { stage: 1, sector: 'c12', status: 'positive' }],
    ['2단계 심부 음성', 'ko', { stage: 2, sector: 'deep', status: 'negative' }],
    ['2단계 깨끗', 'ko', { stage: 2, status: 'clear' }],
    ['fase één tumorvrij', 'nl', { stage: 1, status: 'clear' }],
    ['stade 1 positif en profondeur', 'fr', { stage: 1, sector: 'deep', status: 'positive' }],
    ['open the next case', 'en', null],
    ['stage 9 clear', 'en', null],
    ['stage 1 at 13 positive', 'en', null],
    // Review (Batch 463): never clear a whole stage on a sector command that wasn't understood…
    ['stage 1 negative 3', 'en', null],
    ['Stufe 1 negativ bei 3', 'de', null],
    ['stadium 1 negatief op 3', 'nl', null],
    ['stade 1 négatif à 3', 'fr', null],
    // …never let "deep" in the histology override a clock position (기저세포암 = basal cell carcinoma)…
    ['1단계 3시 양성 기저세포암', 'ko', { stage: 1, sector: 'c3', status: 'positive' }],
    ['2단계 기저 절제연 양성', 'ko', { stage: 2, sector: 'deep', status: 'positive' }],
    ['stage 1 positive in the deep dermis at 3 o\'clock', 'en', null],
    ['Stufe 2 positiv bei 3 Uhr tief infiltrierend', 'de', null],
    // …and never record one sector of a range or list.
    ['stage 1 positive from 12 to 3 o\'clock', 'en', null],
    ['stage 1 positive at 1 and 2 o\'clock', 'en', null],
    ['stade 1, une tumeur positive à 3 heures', 'fr', { stage: 1, sector: 'c3', status: 'positive' }],
    // Batch 463b: the block spoken with it; 12 o'clock words; Korean number words.
    ["Stage 1, positive at 12 o'clock, block A", 'en', { stage: 1, sector: 'c12', status: 'positive', block: 'A' }],
    ['stade 2 positif à 3 heures bloc b', 'fr', { stage: 2, sector: 'c3', status: 'positive', block: 'B' }],
    ['Stufe 1 positiv bei 6 Uhr Block C', 'de', { stage: 1, sector: 'c6', status: 'positive', block: 'C' }],
    ['stadium 1 positief op 9 uur blok d', 'nl', { stage: 1, sector: 'c9', status: 'positive', block: 'D' }],
    ['1단계 12시 양성 블록 A', 'ko', { stage: 1, sector: 'c12', status: 'positive', block: 'A' }],
    ['stage 1 positive at noon', 'en', { stage: 1, sector: 'c12', status: 'positive' }],
    ["stage 1 positive at 12 o'clock noon", 'en', { stage: 1, sector: 'c12', status: 'positive' }],
    ['stage 1 midnight negative', 'en', { stage: 1, sector: 'c12', status: 'negative' }],
    ['stade 1 positif à midi', 'fr', { stage: 1, sector: 'c12', status: 'positive' }],
    ['stade 1 minuit négatif', 'fr', { stage: 1, sector: 'c12', status: 'negative' }],
    ['Stufe 1 positiv mittags', 'de', { stage: 1, sector: 'c12', status: 'positive' }],
    ['1단계 세 시 양성', 'ko', { stage: 1, sector: 'c3', status: 'positive' }],
    ['일단계 열두시 양성', 'ko', { stage: 1, sector: 'c12', status: 'positive' }],
    ['이단계 십일시 음성', 'ko', { stage: 2, sector: 'c11', status: 'negative' }],
    // Review (463b): "열 두 시" spoken with a space is 12, not 2; "이 단계" with a space is "this stage", not stage 2.
    ['1단계 열 두 시 양성', 'ko', { stage: 1, sector: 'c12', status: 'positive' }],
    ['1단계 열 한 시 음성', 'ko', { stage: 1, sector: 'c11', status: 'negative' }],
    ['이 단계 세 시 양성', 'ko', null],
    ['삼단계 깨끗', 'ko', { stage: 3, status: 'clear' }],
    ['1단계 세 시 양성 기저세포암', 'ko', { stage: 1, sector: 'c3', status: 'positive' }],
  ];
  it.each(cases)('%s (%s)', (spoken, lang, expected) => {
    expect(parseMohsVoiceCommand(spoken, lang)).toEqual(expected);
  });

  it('says what a command would do: applied, a stage not added yet, or nothing to change', () => {
    const a = oneStage();
    expect(mohsVoiceOutcome(F, a, { stage: 1, sector: 'c3', status: 'positive' })).toBe('applied');
    expect(mohsVoiceOutcome(F, a, { stage: 3, status: 'clear' })).toBe('noStage');
    expect(mohsVoiceOutcome(F, a, { stage: 1, status: 'clear' })).toBe('noChange');
  });

  it('a command changes the answers like a click (default histology; the block only when spoken); a stage not added yet changes nothing', () => {
    const a = oneStage();
    expect(mohsVoicePatch(F, a, { stage: 1, sector: 'c12', status: 'positive' }, 'BCC'))
      .toEqual({ [`${F}__s1__positive`]: ['c12'], [`${F}__s1__c12__histology`]: 'BCC' });
    expect(mohsVoicePatch(F, a, { stage: 1, sector: 'c12', status: 'positive', block: 'B' }, 'BCC'))
      .toEqual({ [`${F}__s1__positive`]: ['c12'], [`${F}__s1__c12__block`]: 'B', [`${F}__s1__c12__histology`]: 'BCC' });
    // "… block B" for a sector already positive assigns its block.
    const pos = apply(a, setMohsSector(F, a, 1, 'c12', 'positive'));
    expect(mohsVoicePatch(F, pos, { stage: 1, sector: 'c12', status: 'positive', block: 'B' })).toEqual({ [`${F}__s1__c12__block`]: 'B' });
    expect(mohsVoicePatch(F, a, { stage: 2, sector: 'c12', status: 'positive' })).toEqual({});
    const b = apply(a, setMohsSector(F, a, 1, 'c4', 'positive'));
    expect(apply(b, mohsVoicePatch(F, b, { stage: 1, status: 'clear' }))).toEqual(a);
  });
});
