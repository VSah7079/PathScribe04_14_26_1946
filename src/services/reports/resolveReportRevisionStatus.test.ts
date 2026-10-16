// Batch 495 (PS-283 §4.2.2): revision status for the printed report header.
import { describe, it, expect } from 'vitest';
import { resolveReportRevisionStatus } from './resolveReportRevisionStatus';

describe('resolveReportRevisionStatus', () => {
  it('is null for a report with no released revision (drafts do not count)', () => {
    expect(resolveReportRevisionStatus({ finalizedAt: '2026-10-01T10:00:00Z' }, [])).toBeNull();
    expect(resolveReportRevisionStatus({ finalizedAt: '2026-10-01T10:00:00Z' }, [{ type: 'amendment', status: 'draft' }])).toBeNull();
  });

  it('reports the original sign-out date and the latest released revision', () => {
    const status = resolveReportRevisionStatus({ finalizedAt: '2026-10-01T10:00:00Z' }, [
      { type: 'addendum', status: 'released', releasedAt: '2026-10-05T09:00:00Z' },
      { type: 'amendment', status: 'released', releasedAt: '2026-10-03T09:00:00Z' },
      { type: 'correction', status: 'draft' },
    ]);
    expect(status).toEqual({
      latestType: 'addendum',
      revisionCount: 2,
      originalSignOutAt: '2026-10-01T10:00:00Z',
      latestRevisionAt: '2026-10-05T09:00:00Z',
    });
  });

  it('leaves the original sign-out date null when the case has none on record', () => {
    const status = resolveReportRevisionStatus(null, [{ type: 'correction', status: 'released', releasedAt: '2026-10-03T09:00:00Z' }]);
    expect(status?.originalSignOutAt).toBeNull();
    expect(status?.latestType).toBe('correction');
  });
});
