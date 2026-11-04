// src/services/tumorBoard/tumorBoardSessionGrouping.test.ts
import { describe, it, expect } from 'vitest';
import { groupTumorBoardRowsBySession } from './tumorBoardSessionGrouping';
import type { TumorBoardListing } from './ITumorBoardService';

function listing(overrides: Partial<TumorBoardListing> = {}): TumorBoardListing {
  return {
    id: 'tbl-' + Math.random().toString(36).slice(2, 8),
    caseId: 'case-1',
    caseAccession: 'S26-1000',
    board: 'Breast MDT',
    status: 'Pending Presentation',
    source: 'Manual',
    createdAt: '2026-01-01T00:00:00.000Z',
    createdByUserId: 'u1',
    createdByUserName: 'Dr A',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedByUserId: 'u1',
    updatedByUserName: 'Dr A',
    ...overrides,
  };
}

const NOW = new Date('2026-10-08T12:00:00.000Z');

describe('groupTumorBoardRowsBySession', () => {
  it('groups rows sharing the same board+meetingDate into one session', () => {
    const rows = [
      { listing: listing({ id: 'a', meetingDate: '2026-12-01' }) },
      { listing: listing({ id: 'b', meetingDate: '2026-12-01' }) },
    ];
    const groups = groupTumorBoardRowsBySession(rows, 48, NOW, 'UTC');
    expect(groups).toHaveLength(1);
    expect(groups[0].rows).toHaveLength(2);
    expect(groups[0].board).toBe('Breast MDT');
    expect(groups[0].meetingDate).toBe('2026-12-01');
  });

  it('keeps different boards on the same date as separate sessions', () => {
    const rows = [
      { listing: listing({ id: 'a', board: 'Breast MDT', meetingDate: '2026-12-01' }) },
      { listing: listing({ id: 'b', board: 'GI MDT', meetingDate: '2026-12-01' }) },
    ];
    const groups = groupTumorBoardRowsBySession(rows, 48, NOW, 'UTC');
    expect(groups).toHaveLength(2);
  });

  it('collects every listing with no meetingDate into a single trailing Unscheduled group', () => {
    const rows = [
      { listing: listing({ id: 'a', meetingDate: '2026-12-01' }) },
      { listing: listing({ id: 'b' }) },
      { listing: listing({ id: 'c' }) },
    ];
    const groups = groupTumorBoardRowsBySession(rows, 48, NOW, 'UTC');
    expect(groups).toHaveLength(2);
    const unscheduled = groups[groups.length - 1];
    expect(unscheduled.key).toBe('unscheduled');
    expect(unscheduled.board).toBeNull();
    expect(unscheduled.locked).toBe(false);
    expect(unscheduled.rows).toHaveLength(2);
  });

  it('sorts dated sessions soonest-first, with Unscheduled always last', () => {
    const rows = [
      { listing: listing({ id: 'a', meetingDate: '2026-12-15' }) },
      { listing: listing({ id: 'b' }) },
      { listing: listing({ id: 'c', meetingDate: '2026-11-01' }) },
    ];
    const groups = groupTumorBoardRowsBySession(rows, 48, NOW, 'UTC');
    expect(groups.map(g => g.meetingDate ?? 'unscheduled')).toEqual(['2026-11-01', '2026-12-15', 'unscheduled']);
  });

  it('computes unassignedCount per session', () => {
    const rows = [
      { listing: listing({ id: 'a', meetingDate: '2026-12-01', presenterUserId: 'u2' }) },
      { listing: listing({ id: 'b', meetingDate: '2026-12-01' }) },
      { listing: listing({ id: 'c', meetingDate: '2026-12-01' }) },
    ];
    const groups = groupTumorBoardRowsBySession(rows, 48, NOW, 'UTC');
    expect(groups[0].unassignedCount).toBe(2);
  });

  it('marks a session locked once inside the configured cut-off', () => {
    const rows = [{ listing: listing({ id: 'a', meetingDate: '2026-10-09', meetingTime: '09:00' }) }];
    const groups = groupTumorBoardRowsBySession(rows, 48, NOW, 'UTC'); // ~21h before the meeting, inside 48h
    expect(groups[0].locked).toBe(true);
  });

  it('marks a session open well outside the configured cut-off', () => {
    const rows = [{ listing: listing({ id: 'a', meetingDate: '2026-12-01', meetingTime: '09:00' }) }];
    const groups = groupTumorBoardRowsBySession(rows, 48, NOW, 'UTC');
    expect(groups[0].locked).toBe(false);
  });

  it('returns no groups for an empty row list', () => {
    expect(groupTumorBoardRowsBySession([], 48, NOW, 'UTC')).toEqual([]);
  });
});
