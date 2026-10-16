// Batch 512: the LIS sync state a specimen gets when saved from the report page.
import { describe, it, expect } from 'vitest';
import { resolveSpecimenLisSyncState, lisSyncStateNeedsBadge } from './resolveSpecimenLisSyncState';

describe('resolveSpecimenLisSyncState', () => {
  it('an orchestration (O26-) case is local only', () => {
    expect(resolveSpecimenLisSyncState(true)).toBe('local_only');
  });
  it('any add or edit on an LIS (S26-) case needs writing back, including an ordinary specimen with no sync state', () => {
    expect(resolveSpecimenLisSyncState(false)).toBe('pending_sync');
  });
});

describe('lisSyncStateNeedsBadge', () => {
  it('only unsent or answered changes show a badge', () => {
    expect([undefined, 'lis_owned', 'local_only', 'pending_sync', 'sync_sent', 'sync_rejected'].map(s => lisSyncStateNeedsBadge(s as never)))
      .toEqual([false, false, false, true, true, true]);
  });
});
