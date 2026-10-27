import { describe, it, expect } from 'vitest';
import { checkTriageReleaseGate, isTriagePending } from './triageReleaseGate';
import type { SpecimenTriage } from '@/types/case/Specimen';

const triage = (o: Partial<SpecimenTriage> = {}): SpecimenTriage =>
  ({ checklistItems: [{ item: 'a', confirmed: false }], ...o } as unknown as SpecimenTriage);

describe('triageReleaseGate', () => {
  it('no triage record is never pending', () => expect(isTriagePending(undefined)).toBe(false));
  it('unconfirmed item without override is pending', () => expect(isTriagePending(triage())).toBe(true));
  it('all confirmed is not pending', () =>
    expect(isTriagePending(triage({ checklistItems: [{ item: 'a', confirmed: true }] as never }))).toBe(false));
  it('override reason resolves it', () => expect(isTriagePending(triage({ overrideReason: 'urgent' }))).toBe(false));

  it('blocks release while triage is open', () => {
    expect(checkTriageReleaseGate([{ id: 's1', triage: triage() }], 's1')).toEqual({ allowed: false, reason: 'triageIncomplete' });
  });
  it('allows release for a specimen with no triage', () => {
    expect(checkTriageReleaseGate([{ id: 's1' }], 's1')).toEqual({ allowed: true });
  });
  it('refuses an unknown specimen', () => {
    expect(checkTriageReleaseGate([], 'x')).toEqual({ allowed: false, reason: 'specimenNotFound' });
    expect(checkTriageReleaseGate(undefined, 'x')).toEqual({ allowed: false, reason: 'specimenNotFound' });
  });
});
