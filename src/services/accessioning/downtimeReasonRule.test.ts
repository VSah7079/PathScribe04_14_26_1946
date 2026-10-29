import { describe, it, expect } from 'vitest';
import { isDowntimeReasonMissing, missingDowntimeReasonFieldIds, DOWNTIME_REASON_FIELD_ID } from './downtimeReasonRule';

describe('isDowntimeReasonMissing (Batch 658)', () => {
  it('a downtime accession with no reason is refused', () => {
    expect(isDowntimeReasonMissing(true, '')).toBe(true);
    expect(isDowntimeReasonMissing(true, '  ')).toBe(true);
    expect(isDowntimeReasonMissing(true, undefined)).toBe(true);
  });
  it('a reason, or an ordinary accession, passes', () => {
    expect(isDowntimeReasonMissing(true, 'network')).toBe(false);
    expect(isDowntimeReasonMissing(false, '')).toBe(false);
  });
});

describe('missingDowntimeReasonFieldIds (Batch 712)', () => {
  it('names the downtime reason while downtime mode is on and no reason is chosen', () => {
    expect(missingDowntimeReasonFieldIds(true, '')).toEqual([DOWNTIME_REASON_FIELD_ID]);
    expect(missingDowntimeReasonFieldIds(true, '   ')).toEqual(['downtimeReason']);
  });
  it('lists nothing once a reason is chosen, or when the intake is not downtime', () => {
    expect(missingDowntimeReasonFieldIds(true, 'network')).toEqual([]);
    expect(missingDowntimeReasonFieldIds(false, '')).toEqual([]);
    expect(missingDowntimeReasonFieldIds(false, undefined)).toEqual([]);
  });
});
