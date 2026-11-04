import { describe, it, expect } from 'vitest';
import {
  answerMatches, buildSynopticFieldCatalogue, type CaseWithSynopticAnswers, caseMatchesSynopticValues, leadingNumber, normalizeCriteria, operatorsForKind,
  usableCriteria, type SynopticFieldInfo, type SynopticValueCriterion,
} from './synopticValueCriteria';
import { matchesCaseSearch } from './caseSearchMatching';
import type { Case } from '@/types/case/Case';

const catalogue = buildSynopticFieldCatalogue([{
  id: 'breast', sections: [{ fields: [
    { id: 'grade', label: 'Grade', type: 'dropdown', options: [{ id: 'g1', label: 'Grade 1' }, { id: 'g3', label: 'Grade 3' }] },
    { id: 'size', label: 'Tumor size', type: 'numeric', unit: 'cm' },
    { id: 'notes', label: 'Notes', type: 'longtext' },
    { id: 'margins', label: 'Margins', type: 'checkboxes', options: [{ id: 'm_pos', label: 'Positive' }, { id: 'm_neg', label: 'Negative' }] },
    { id: 'grid', label: 'Grid', type: 'partGrid' },
  ] }],
}]);
const field = (id: string): SynopticFieldInfo => catalogue.get('breast')!.get(id)!;
const k = (fieldId: string, operator: SynopticValueCriterion['operator'], value = ''): SynopticValueCriterion => ({ templateId: 'breast', fieldId, operator, value });
const withAnswers = (answers: Record<string, string | string[]>, templateId = 'breast') => ({ synopticReports: [{ templateId, answers }] });

describe('synoptic value search (Batch 613)', () => {
  it('builds the catalogue from the protocol questions and leaves out what cannot be searched', () => {
    expect([...catalogue.get('breast')!.keys()]).toEqual(['grade', 'size', 'notes', 'margins']);
    expect(field('grade').kind).toBe('choice');
    expect(field('size')).toMatchObject({ kind: 'number', unit: 'cm' });
    expect(field('margins').kind).toBe('multi');
  });

  it('offers only the operators that fit the kind of question', () => {
    expect(operatorsForKind('choice')).not.toContain('gt');
    expect(operatorsForKind('number')).toEqual(expect.arrayContaining(['gt', 'gte', 'lt', 'lte']));
    expect(operatorsForKind('text')).toContain('contains');
  });

  it('reads the number at the start of an answer', () => {
    expect(leadingNumber('2.3 cm')).toBe(2.3);
    expect(leadingNumber('1,5 cm')).toBe(1.5);
    expect(leadingNumber('about 2')).toBeNull();
  });

  it('matches a choice by its option id or by its label', () => {
    expect(answerMatches('g3', k('grade', 'is', 'g3'), field('grade'))).toBe(true);
    expect(answerMatches('g3', k('grade', 'is', 'Grade 3'), field('grade'))).toBe(true);
    expect(answerMatches('g3', k('grade', 'is', 'g1'), field('grade'))).toBe(false);
    expect(answerMatches('g3', k('grade', 'isNot', 'g1'), field('grade'))).toBe(true);
  });

  it('"is not" needs an answer: an unanswered question is not "not Grade 1"', () => {
    expect(answerMatches(undefined, k('grade', 'isNot', 'g1'), field('grade'))).toBe(false);
    expect(answerMatches(undefined, k('grade', 'unanswered'), field('grade'))).toBe(true);
    expect(answerMatches('', k('grade', 'answered'), field('grade'))).toBe(false);
  });

  it('compares numbers by their leading number whatever the unit text', () => {
    expect(answerMatches('2.3 cm', k('size', 'gt', '2'), field('size'))).toBe(true);
    expect(answerMatches('2.3 cm', k('size', 'lt', '2'), field('size'))).toBe(false);
    expect(answerMatches('2.0', k('size', 'gte', '2'), field('size'))).toBe(true);
    expect(answerMatches('2 cm', k('size', 'is', '2.0'), field('size'))).toBe(true);
    expect(answerMatches('large', k('size', 'gt', '2'), field('size'))).toBe(false);
  });

  it('finds text anywhere in a text answer, ignoring case', () => {
    expect(answerMatches('Lymphovascular INVASION present', k('notes', 'contains', 'invasion'), field('notes'))).toBe(true);
  });

  it('matches a multi-choice answer when any of its choices matches', () => {
    expect(answerMatches(['m_neg', 'm_pos'], k('margins', 'is', 'm_pos'), field('margins'))).toBe(true);
    expect(answerMatches(['m_neg'], k('margins', 'is', 'm_pos'), field('margins'))).toBe(false);
  });

  it('a case matches when one of its reports from that protocol has the answer; every criterion must match', () => {
    const c: CaseWithSynopticAnswers = { synopticReports: [{ templateId: 'colon', answers: { grade: 'g1' } }, { templateId: 'breast', answers: { grade: 'g3', size: '2.3 cm' } }] };
    expect(caseMatchesSynopticValues(c, [k('grade', 'is', 'g3')], catalogue)).toBe(true);
    expect(caseMatchesSynopticValues(c, [k('grade', 'is', 'g1')], catalogue)).toBe(false); // g1 is in the colon report only
    expect(caseMatchesSynopticValues(c, [k('grade', 'is', 'g3'), k('size', 'gt', '5')], catalogue)).toBe(false);
    expect(caseMatchesSynopticValues({}, [k('grade', 'unanswered')], catalogue)).toBe(false); // no report from the protocol at all
    expect(caseMatchesSynopticValues(c, [], catalogue)).toBe(true);
  });

  it('keeps complete criteria only, without duplicates, up to the limit', () => {
    const list = [k('grade', 'is', 'g3'), k('grade', 'is', ' G3 '), k('grade', 'is', ''), k('size', 'answered', 'ignored'), { ...k('size', 'gt', '1'), fieldId: '' }];
    expect(usableCriteria(list)).toEqual([k('grade', 'is', 'g3'), k('size', 'answered', '')]);
    expect(usableCriteria(Array.from({ length: 30 }, (_, i) => k('size', 'gt', String(i)))).length).toBe(10);
  });

  it('reads a stored list back safely', () => {
    expect(normalizeCriteria('nonsense')).toEqual([]);
    expect(normalizeCriteria([{ templateId: 'breast', fieldId: 'grade', operator: 'bogus', value: 'g3' }, null, 7]))
      .toEqual([k('grade', 'is', 'g3')]);
  });

  it('is applied by the case search itself, with the catalogue the service loads', () => {
    const c = { id: 'C1', status: 'draft', createdAt: '2026-01-01T00:00:00Z', ...withAnswers({ grade: 'g3' }) } as unknown as Case;
    const ctx = { physicianNamesById: new Map(), timeZone: 'UTC', now: new Date('2026-09-27T00:00:00Z'), synopticFields: catalogue };
    expect(matchesCaseSearch(c, { synopticValues: [k('grade', 'is', 'Grade 3')] }, ctx)).toBe(true);
    expect(matchesCaseSearch(c, { synopticValues: [k('grade', 'is', 'Grade 1')] }, ctx)).toBe(false);
  });
});
