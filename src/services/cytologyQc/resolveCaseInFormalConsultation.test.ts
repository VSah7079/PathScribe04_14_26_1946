import { describe, it, expect } from 'vitest';
import { resolveCaseInFormalConsultation } from './resolveCaseInFormalConsultation';

const participant = (types: string[], status = 'active') => ({ staffId: 'p', staffName: 'P', source: 'manual', participationTypeIds: types, addedBy: 'x', addedAt: '', status }) as never;

describe('resolveCaseInFormalConsultation (Batch 501)', () => {
  it('an active pending-consultation hold counts; a released one does not', () => {
    expect(resolveCaseInFormalConsultation({ caseHolds: [{ reason: 'pending_consultation', active: true } as never] })).toBe(true);
    expect(resolveCaseInFormalConsultation({ caseHolds: [{ reason: 'pending_consultation', active: false } as never] })).toBe(false);
    expect(resolveCaseInFormalConsultation({ caseHolds: [{ reason: 'quality_issue', active: true } as never] })).toBe(false);
  });
  it('an active consultant or second-opinion participant counts', () => {
    expect(resolveCaseInFormalConsultation({ participants: [participant(['second_opinion'])] })).toBe(true);
    expect(resolveCaseInFormalConsultation({ participants: [participant(['consultant'])] })).toBe(true);
    expect(resolveCaseInFormalConsultation({ participants: [participant(['consultant'], 'removed')] })).toBe(false);
    expect(resolveCaseInFormalConsultation({ participants: [participant(['attending'])] })).toBe(false);
  });
  it('nothing on the case: not in consultation', () => {
    expect(resolveCaseInFormalConsultation({})).toBe(false);
  });
});
