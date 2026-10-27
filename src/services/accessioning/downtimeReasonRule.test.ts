import { describe, it, expect } from 'vitest';
import { isDowntimeReasonMissing } from './downtimeReasonRule';

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
