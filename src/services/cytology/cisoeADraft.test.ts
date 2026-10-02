import { describe, it, expect } from 'vitest';
import { EMPTY_CISOEA_DRAFT, resolveCisoeAScoreFromDraft, resolveCisoeAPartialFromDraft, cisoeADraftFromScore, type CisoeADraft } from './cisoeADraft';

const full: CisoeADraft = { ...EMPTY_CISOEA_DRAFT, composition: '1', inflammation: '2', squamous: '3', otherEndometrium: '0', endocervical: '9', adequacy: 'satisfactory', squamousComment: 'x' };

describe('CISOE-A draft', () => {
  it('turns a complete draft into a score, keeping comments only when written', () => {
    const score = resolveCisoeAScoreFromDraft(full)!;
    expect(score.squamous).toEqual({ value: 3, comment: 'x' });
    expect(score.composition.comment).toBeUndefined();
    expect(score.adequacy).toBe('satisfactory');
  });
  it('returns nothing when a component is empty, out of range or not a number, or adequacy is missing', () => {
    expect(resolveCisoeAScoreFromDraft({ ...full, squamous: '' })).toBeUndefined();
    expect(resolveCisoeAScoreFromDraft({ ...full, squamous: '10' })).toBeUndefined();
    expect(resolveCisoeAScoreFromDraft({ ...full, squamous: '-1' })).toBeUndefined();
    expect(resolveCisoeAScoreFromDraft({ ...full, squamous: 'a' })).toBeUndefined();
    expect(resolveCisoeAScoreFromDraft({ ...full, adequacy: '' })).toBeUndefined();
  });
  it('a partial draft yields exactly the axes that are filled in and valid', () => {
    const partial = resolveCisoeAPartialFromDraft({ ...EMPTY_CISOEA_DRAFT, composition: '4', squamous: '12', adequacy: 'suboptimal' });
    expect(Object.keys(partial).sort()).toEqual(['adequacy', 'composition']);
  });
  it('a saved score round-trips back to the same draft', () => {
    const score = resolveCisoeAScoreFromDraft(full)!;
    const back = cisoeADraftFromScore(score, 'note');
    expect(back).toEqual({ ...full, notes: 'note' });
    expect(resolveCisoeAScoreFromDraft(back)).toEqual(score);
  });
});
