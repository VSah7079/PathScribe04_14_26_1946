// Batch 498 (PS-283 §4.2.2): the revision block sent to the PDF renderer.
import { describe, it, expect } from 'vitest';
import { buildReportRenderRevision } from './buildReportRenderRevision';
import { formatDateTime } from '@/utils/formatDate';

describe('buildReportRenderRevision', () => {
  it('is undefined for an unrevised report', () => {
    expect(buildReportRenderRevision(null, 'en-GB')).toBeUndefined();
  });

  it('writes both dates in the report locale', () => {
    const block = buildReportRenderRevision(
      { latestType: 'amendment', revisionCount: 2, originalSignOutAt: '2026-10-01T10:00:00Z', latestRevisionAt: '2026-10-05T09:00:00Z' },
      'de-DE',
    );
    expect(block).toEqual({
      type: 'amendment', revisionCount: 2,
      originalSignOutAt: formatDateTime('2026-10-01T10:00:00Z', 'de-DE'),
      latestRevisionAt: formatDateTime('2026-10-05T09:00:00Z', 'de-DE'),
    });
    expect(block!.latestRevisionAt).not.toContain('T09');
  });

  it('keeps a missing original sign-out date as null', () => {
    expect(buildReportRenderRevision({ latestType: 'addendum', revisionCount: 1, originalSignOutAt: null, latestRevisionAt: '2026-10-05T09:00:00Z' }, 'en-GB')!.originalSignOutAt).toBeNull();
  });
});
