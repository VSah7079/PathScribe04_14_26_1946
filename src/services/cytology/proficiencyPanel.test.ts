import { describe, it, expect } from 'vitest';
import { gradeSimulatedPanel, ptPanelProblem, simulatedKeyFor, type PtPanelDraft } from './proficiencyPanel';

const draft = (over: Partial<PtPanelDraft> = {}): PtPanelDraft => ({ provider: 'CAP', eventReference: 'PAP-2026-C', challenges: [{ slideId: 'S1', labResponse: 'negative' }], ...over });

describe('proficiency panel (Batch 608, #77)', () => {
  it('names the first problem with a draft', () => {
    expect(ptPanelProblem(draft({ provider: ' ' }))).toBe('noProvider');
    expect(ptPanelProblem(draft({ eventReference: '' }))).toBe('noReference');
    expect(ptPanelProblem(draft({ challenges: [] }))).toBe('noChallenges');
    expect(ptPanelProblem(draft({ challenges: [{ slideId: 'S1', labResponse: '' }] }))).toBe('unanswered');
    expect(ptPanelProblem(draft())).toBeNull();
  });
  it('the key for a slide is repeatable and always readable', () => {
    expect(simulatedKeyFor('S1')).toBe(simulatedKeyFor('S1'));
    for (const id of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) expect(simulatedKeyFor(id)).not.toBe('unsatisfactory');
  });
  it('grades all-correct as satisfactory and mostly wrong as unsatisfactory', () => {
    const ids = ['S1', 'S2', 'S3', 'S4', 'S5'];
    const right = gradeSimulatedPanel({ challenges: ids.map(slideId => ({ slideId, labResponse: simulatedKeyFor(slideId) })) });
    expect(right).toMatchObject({ scorePercent: 100, outcome: 'satisfactory' });
    const wrong = gradeSimulatedPanel({ challenges: ids.map(slideId => ({ slideId, labResponse: 'unsatisfactory' as const })) });
    expect(wrong).toMatchObject({ scorePercent: 0, outcome: 'unsatisfactory' });
  });
  it('one wrong in five is 80%: below the 90% pass mark', () => {
    const ids = ['S1', 'S2', 'S3', 'S4', 'S5'];
    const challenges = ids.map((slideId, i) => ({ slideId, labResponse: i === 0 ? ('unsatisfactory' as const) : simulatedKeyFor(slideId) }));
    expect(gradeSimulatedPanel({ challenges })).toMatchObject({ scorePercent: 80, outcome: 'unsatisfactory' });
  });
  it('no answers at all is no response', () => {
    expect(gradeSimulatedPanel({ challenges: [{ slideId: 'S1', labResponse: '' }] }).outcome).toBe('no_response');
  });
});
