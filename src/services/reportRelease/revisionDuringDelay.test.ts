// src/services/reportRelease/revisionDuringDelay.test.ts
// Batch 540 (Pete): no correction or addendum while the report is still in its release delay.
import { describe, it, expect, vi } from 'vitest';
import type { HeldRelease } from '@/types/reportRelease/HeldRelease';
import { revisionAllowedNow, revisionBlockedByDelay, ORIGINAL_REPORT_HOLDS } from './revisionDuringDelay';

const held = (kind: HeldRelease['kind'], status: HeldRelease['status'] = 'held') => ({ id: `h-${kind}`, caseId: 'C1', kind, status } as HeldRelease);

describe('revisionBlockedByDelay', () => {
  it('a surgical or autopsy case in its sign-out buffer waits', () => {
    expect(revisionBlockedByDelay({ caseStatus: 'pending-release', held: [] })).toBe(true);
    expect(revisionBlockedByDelay({ caseStatus: 'finalized', held: [] })).toBe(false);
  });

  it('any held original report waits; a held revision, preliminary, or a hold already settled does not', () => {
    for (const kind of ORIGINAL_REPORT_HOLDS) expect(revisionBlockedByDelay({ caseStatus: 'finalized', held: [held(kind)] }), kind).toBe(true);
    for (const kind of ['cytology-revision', 'surgical-amendment', 'cytology-preliminary', 'surgical-preliminary'] as const) {
      expect(revisionBlockedByDelay({ caseStatus: 'finalized', held: [held(kind)] }), kind).toBe(false);
    }
    expect(revisionBlockedByDelay({ caseStatus: 'finalized', held: [held('cytology-sign-out', 'released'), held('cytology-sign-out', 'recalled')] })).toBe(false);
  });
});

describe('revisionAllowedNow', () => {
  it('reads the case status and its held releases', async () => {
    const deps = { caseStatus: vi.fn(async () => 'finalized'), heldReleases: vi.fn(async () => [held('cytology-sign-out')]) };
    expect(await revisionAllowedNow('C1', deps)).toBe(false);
    expect(deps.heldReleases).toHaveBeenCalledWith('C1');
    expect(await revisionAllowedNow('C1', { caseStatus: async () => 'finalized', heldReleases: async () => [] })).toBe(true);
  });
});
