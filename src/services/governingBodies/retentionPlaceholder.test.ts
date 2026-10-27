import { describe, it, expect } from 'vitest';
import { isUnverifiedRetentionPlaceholder } from './retentionPlaceholder';

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};
const { mockGoverningBodyService } = await import('./mockGoverningBodyService');

describe('isUnverifiedRetentionPlaceholder (Batch 652)', () => {
  it('flags a note that says unverified, in any case', () => {
    expect(isUnverifiedRetentionPlaceholder({ sourceNote: 'Wet-tissue figure is an UNVERIFIED placeholder' })).toBe(true);
    expect(isUnverifiedRetentionPlaceholder({ sourceNote: 'unverified' })).toBe(true);
  });
  it('does not flag a cited note', () => {
    expect(isUnverifiedRetentionPlaceholder({ sourceNote: 'RCPath G031, 6th ed.' })).toBe(false);
  });
  it('flags the seeded CAP wet-tissue and RCPA versions, and not the cited RCPath ones', async () => {
    const bodies = await mockGoverningBodyService.getAll();
    const flagged = (id: string) => bodies.find(b => b.id === id)!.retentionPolicyVersions!.every(isUnverifiedRetentionPlaceholder);
    expect(flagged('CAP')).toBe(true);
    expect(flagged('RCPA')).toBe(true);
    expect(bodies.find(b => b.id === 'RCPath')!.retentionPolicyVersions!.some(isUnverifiedRetentionPlaceholder)).toBe(false);
  });
});
