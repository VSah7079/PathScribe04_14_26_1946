import { describe, it, expect } from 'vitest';
import { formatFacilityDateTime } from './formatFacilityDateTime';

describe('formatFacilityDateTime (access-12)', () => {
  const iso = '2026-10-24T00:30:00.000Z';
  it('shows the moment in the facility zone, whatever the device zone is', () => {
    const phoenix = formatFacilityDateTime(iso, 'en-US', 'America/Phoenix');
    const london = formatFacilityDateTime(iso, 'en-US', 'Europe/London');
    expect(phoenix).toContain('Oct 23, 2026');
    expect(phoenix).toContain('5:30');
    expect(london).toContain('Oct 24, 2026');
    expect(london).toContain('1:30');
    expect(phoenix).not.toBe(london);
  });
  it('names the zone beside the time', () => {
    expect(formatFacilityDateTime(iso, 'en-US', 'America/Phoenix')).toMatch(/MST|GMT-7/);
  });
  it('is empty for nothing or an unreadable date, and never throws on an unknown zone', () => {
    expect(formatFacilityDateTime(undefined, 'en-US', 'America/Phoenix')).toBe('');
    expect(formatFacilityDateTime('nope', 'en-US', 'America/Phoenix')).toBe('');
    expect(formatFacilityDateTime(iso, 'en-US', 'Not/AZone')).not.toBe('');
  });
});
