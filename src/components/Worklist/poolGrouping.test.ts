// src/components/Worklist/poolGrouping.test.ts
import { describe, it, expect } from 'vitest';
import { buildPoolGroupRows, computeRestrictedPoolKeys, type PoolDividerRow, type SubspecialtyForRestrictionCheck } from './poolGrouping';
import type { Case } from '@/types/case/Case';

function makeCase(id: string, poolName: string, priority: string = 'Routine'): Case {
  return {
    id, status: 'pool',
    order: { priority },
    poolName,
  } as any;
}

function isUrgent(c: Case): boolean {
  return (c as any).order?.priority === 'STAT';
}

function dividers(rows: (Case | PoolDividerRow)[]): PoolDividerRow[] {
  return rows.filter((r): r is PoolDividerRow => '__divider' in r);
}

describe('buildPoolGroupRows — real fix: pool cases previously had no per-pool visibility at all', () => {
  it('groups cases by their real poolName, not one flat bucket', () => {
    const cases = [
      makeCase('S26-1', 'GI Pool'),
      makeCase('S26-2', 'Breast Pool'),
      makeCase('S26-3', 'GI Pool'),
    ];
    const rows = buildPoolGroupRows(cases, isUrgent);
    const labels = dividers(rows).map(d => d.label);
    expect(labels).toContain('GI Pool');
    expect(labels).toContain('Breast Pool');
  });

  it('shows a real, accurate count per pool group', () => {
    const cases = [
      makeCase('S26-1', 'GI Pool'),
      makeCase('S26-2', 'GI Pool'),
      makeCase('S26-3', 'GI Pool'),
      makeCase('S26-4', 'Breast Pool'),
    ];
    const rows = buildPoolGroupRows(cases, isUrgent);
    const giDivider     = dividers(rows).find(d => d.label === 'GI Pool');
    const breastDivider = dividers(rows).find(d => d.label === 'Breast Pool');
    expect(giDivider?.count).toBe(3);
    expect(breastDivider?.count).toBe(1);
  });

  it('sorts pools with any urgent case before pools with none, regardless of alphabetical order', () => {
    const cases = [
      makeCase('S26-1', 'Zebra Pool'),
      makeCase('S26-2', 'Alpha Pool', 'STAT'),
    ];
    const rows = buildPoolGroupRows(cases, isUrgent);
    const labels = dividers(rows).map(d => d.label);
    // Alpha Pool's urgent divider should come before Zebra Pool's normal divider
    expect(labels.indexOf('Alpha Pool — Urgent')).toBeLessThan(labels.indexOf('Zebra Pool'));
  });

  it('sorts alphabetically within the same urgency tier', () => {
    const cases = [makeCase('S26-1', 'Zebra Pool'), makeCase('S26-2', 'Alpha Pool')];
    const rows = buildPoolGroupRows(cases, isUrgent);
    const labels = dividers(rows).map(d => d.label);
    expect(labels.indexOf('Alpha Pool')).toBeLessThan(labels.indexOf('Zebra Pool'));
  });

  it('splits a single pool into urgent and normal dividers when it has both', () => {
    const cases = [
      makeCase('S26-1', 'GI Pool', 'STAT'),
      makeCase('S26-2', 'GI Pool'),
    ];
    const rows = buildPoolGroupRows(cases, isUrgent);
    const labels = dividers(rows).map(d => d.label);
    expect(labels).toContain('GI Pool — Urgent');
    expect(labels).toContain('GI Pool');
  });

  it('urgent divider for a pool always comes before that same pool\'s normal divider', () => {
    const cases = [
      makeCase('S26-1', 'GI Pool'),
      makeCase('S26-2', 'GI Pool', 'STAT'),
    ];
    const rows = buildPoolGroupRows(cases, isUrgent);
    const labels = dividers(rows).map(d => d.label);
    expect(labels.indexOf('GI Pool — Urgent')).toBeLessThan(labels.indexOf('GI Pool'));
  });

  it('falls back to poolId, then a generic label, when poolName is missing', () => {
    const withPoolId = { id: 'S26-1', status: 'pool', order: { priority: 'Routine' }, poolId: 'general' } as any;
    const withNeither = { id: 'S26-2', status: 'pool', order: { priority: 'Routine' } } as any;
    const rows = buildPoolGroupRows([withPoolId, withNeither], isUrgent);
    const labels = dividers(rows).map(d => d.label);
    expect(labels).toContain('general');
    expect(labels).toContain('Pool');
  });

  it('returns no divider rows at all for an empty pool list', () => {
    const rows = buildPoolGroupRows([], isUrgent);
    expect(rows.length).toBe(0);
  });
});

describe('buildPoolGroupRows — real fix: divider rows now carry explicit flags instead of fragile label-string-matching', () => {
  it('every pool divider has isPool: true, regardless of urgency', () => {
    const cases = [makeCase('S26-1', 'GI Pool', 'STAT'), makeCase('S26-2', 'Breast Pool')];
    const rows = buildPoolGroupRows(cases, isUrgent);
    const allDividers = dividers(rows);
    expect(allDividers.every(d => d.isPool === true)).toBe(true);
  });

  it('isUrgent is correctly true only for the urgent-tier divider of a pool, not the normal-tier one', () => {
    const cases = [makeCase('S26-1', 'GI Pool', 'STAT'), makeCase('S26-2', 'GI Pool')];
    const rows = buildPoolGroupRows(cases, isUrgent);
    const urgentDivider = dividers(rows).find(d => d.label === 'GI Pool — Urgent');
    const normalDivider = dividers(rows).find(d => d.label === 'GI Pool');
    expect(urgentDivider?.isUrgent).toBe(true);
    expect(normalDivider?.isUrgent).toBe(false);
  });

  it('poolKey is the stable, real grouping key - not the display label, which changes between the urgent and normal dividers of the same pool', () => {
    const cases = [makeCase('S26-1', 'GI Pool', 'STAT'), makeCase('S26-2', 'GI Pool')];
    const rows = buildPoolGroupRows(cases, isUrgent);
    const urgentDivider = dividers(rows).find(d => d.label === 'GI Pool — Urgent');
    const normalDivider = dividers(rows).find(d => d.label === 'GI Pool');
    expect(urgentDivider?.poolKey).toBe('GI Pool');
    expect(normalDivider?.poolKey).toBe('GI Pool');
  });
});

describe('buildPoolGroupRows — restrictedForMe, the real per-user pool-visibility fix', () => {
  it('marks a pool as restrictedForMe when its key is in the restricted set', () => {
    const cases = [makeCase('S26-1', 'GI Pool')];
    const rows = buildPoolGroupRows(cases, isUrgent, new Set(['GI Pool']));
    expect(dividers(rows)[0].restrictedForMe).toBe(true);
  });

  it('defaults to unrestricted when no restricted set is passed at all', () => {
    const cases = [makeCase('S26-1', 'GI Pool')];
    const rows = buildPoolGroupRows(cases, isUrgent);
    expect(dividers(rows)[0].restrictedForMe).toBe(false);
  });

  it('only marks the specific pool that is actually restricted, not every pool', () => {
    const cases = [makeCase('S26-1', 'GI Pool'), makeCase('S26-2', 'Breast Pool')];
    const rows = buildPoolGroupRows(cases, isUrgent, new Set(['GI Pool']));
    const gi     = dividers(rows).find(d => d.label === 'GI Pool');
    const breast = dividers(rows).find(d => d.label === 'Breast Pool');
    expect(gi?.restrictedForMe).toBe(true);
    expect(breast?.restrictedForMe).toBe(false);
  });
});

describe('computeRestrictedPoolKeys — real fix: claim-time enforcement existed but the worklist display had no awareness of it', () => {
  const sub = (over: Partial<SubspecialtyForRestrictionCheck>): SubspecialtyForRestrictionCheck => ({
    id: 'sub-1', name: 'GI Pool', isWorkgroupEnabled: true, userIds: [], ...over,
  });

  it('restricts a pool when membership is enabled and the user is not a member', () => {
    const result = computeRestrictedPoolKeys([sub({ userIds: ['other-user'] })], 'me');
    expect(result.has('GI Pool')).toBe(true);
  });

  it('does not restrict when the user is a real member', () => {
    const result = computeRestrictedPoolKeys([sub({ userIds: ['me', 'other-user'] })], 'me');
    expect(result.has('GI Pool')).toBe(false);
  });

  it('does not restrict when isWorkgroupEnabled is off, regardless of membership - backward compatible default', () => {
    const result = computeRestrictedPoolKeys([sub({ isWorkgroupEnabled: false, userIds: ['other-user'] })], 'me');
    expect(result.has('GI Pool')).toBe(false);
  });

  it('treats a missing/undefined current user id as not a member, so an unauthenticated-edge-case never silently grants access', () => {
    const result = computeRestrictedPoolKeys([sub({ userIds: ['someone'] })], undefined);
    expect(result.has('GI Pool')).toBe(true);
  });

  it('matches by both the subspecialty name and id, since a case poolName could be either', () => {
    const result = computeRestrictedPoolKeys([sub({ id: 'sub-gi-001', name: 'GI Pool', userIds: [] })], 'me');
    expect(result.has('GI Pool')).toBe(true);
    expect(result.has('sub-gi-001')).toBe(true);
  });
});
