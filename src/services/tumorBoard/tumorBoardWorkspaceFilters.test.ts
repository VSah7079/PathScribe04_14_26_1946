// src/services/tumorBoard/tumorBoardWorkspaceFilters.test.ts
import { describe, it, expect } from 'vitest';
import { resolveMeetingWindow, toServiceFilter, sortListings, DEFAULT_WORKSPACE_FILTERS } from './tumorBoardWorkspaceFilters';
import type { TumorBoardListing } from './ITumorBoardService';

const TZ = 'America/Phoenix';

function listing(overrides: Partial<TumorBoardListing>): TumorBoardListing {
  return {
    id: 'tbl-1',
    caseId: 'c1',
    caseAccession: 'A1',
    board: 'Breast MDT',
    status: 'Pending Presentation',
    source: 'Manual',
    createdAt: '2026-10-01T00:00:00.000Z',
    createdByUserId: 'u1',
    createdByUserName: 'Dr A',
    updatedAt: '2026-10-01T00:00:00.000Z',
    updatedByUserId: 'u1',
    updatedByUserName: 'Dr A',
    ...overrides,
  };
}

describe('resolveMeetingWindow', () => {
  it("'all' resolves to no date constraint", () => {
    expect(resolveMeetingWindow('all', new Date('2026-10-08T12:00:00Z'), TZ)).toEqual({});
  });

  it("'today' resolves to a single-day range", () => {
    const r = resolveMeetingWindow('today', new Date('2026-10-08T12:00:00Z'), TZ);
    expect(r.meetingDateFrom).toBe(r.meetingDateTo);
    expect(r.meetingDateFrom).toBe('2026-10-08');
  });

  it("'thisWeek' resolves to a 7-day rolling window starting today", () => {
    const r = resolveMeetingWindow('thisWeek', new Date('2026-10-08T12:00:00Z'), TZ);
    expect(r.meetingDateFrom).toBe('2026-10-08');
    expect(r.meetingDateTo).toBe('2026-10-14');
  });

  it("'thisMonth' resolves to a 30-day rolling window starting today", () => {
    const r = resolveMeetingWindow('thisMonth', new Date('2026-10-08T12:00:00Z'), TZ);
    expect(r.meetingDateFrom).toBe('2026-10-08');
    expect(r.meetingDateTo).toBe('2026-11-06');
  });
});

describe('toServiceFilter', () => {
  it('omits board/status/presenter when set to "all"', () => {
    const f = toServiceFilter({ board: 'all', status: 'all', presenterUserId: 'all', meetingWindow: 'all', sortBy: 'meetingDate' }, new Date('2026-10-08T12:00:00Z'), TZ);
    expect(f).toEqual({});
  });

  it('includes board/status/presenter when set, plus the resolved meeting window', () => {
    const f = toServiceFilter({ board: 'GI MDT', status: 'Presented', presenterUserId: 'u9', meetingWindow: 'today', sortBy: 'meetingDate' }, new Date('2026-10-08T12:00:00Z'), TZ);
    expect(f).toEqual({ board: 'GI MDT', status: 'Presented', presenterUserId: 'u9', meetingDateFrom: '2026-10-08', meetingDateTo: '2026-10-08' });
  });

  it('defaults to Pending Presentation per Pete\'s own spec', () => {
    expect(DEFAULT_WORKSPACE_FILTERS.status).toBe('Pending Presentation');
  });
});

describe('sortListings', () => {
  it('sorts by meetingDate ascending, unscheduled listings last', () => {
    const rows = [
      listing({ id: 'a', meetingDate: '2026-10-20' }),
      listing({ id: 'b', meetingDate: undefined, updatedAt: '2026-10-05T00:00:00.000Z' }),
      listing({ id: 'c', meetingDate: '2026-10-10' }),
    ];
    expect(sortListings(rows, 'meetingDate').map(r => r.id)).toEqual(['c', 'a', 'b']);
  });

  it('sorts by updatedAt descending (most recent first)', () => {
    const rows = [
      listing({ id: 'a', updatedAt: '2026-10-01T00:00:00.000Z' }),
      listing({ id: 'b', updatedAt: '2026-10-07T00:00:00.000Z' }),
    ];
    expect(sortListings(rows, 'updatedAt').map(r => r.id)).toEqual(['b', 'a']);
  });

  it('does not mutate the input array', () => {
    const rows = [listing({ id: 'a', meetingDate: '2026-10-20' }), listing({ id: 'b', meetingDate: '2026-10-01' })];
    const original = [...rows];
    sortListings(rows, 'meetingDate');
    expect(rows).toEqual(original);
  });
});
