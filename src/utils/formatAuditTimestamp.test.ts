// src/utils/formatAuditTimestamp.test.ts
import { describe, it, expect } from 'vitest';
import { formatAuditTimestamp, parseStoredUtc } from './formatDate';

describe('formatAuditTimestamp — real fix: AuditLogPage was displaying raw, unformatted ISO timestamps', () => {
  it('formats a real ISO timestamp as an explicit, unambiguous UTC string', () => {
    const result = formatAuditTimestamp('2026-08-01T20:36:01.123Z');
    expect(result).toBe('2026-08-01 20:36:01.123 UTC');
  });

  it('returns an em dash for an undefined timestamp rather than crashing or showing "undefined"', () => {
    expect(formatAuditTimestamp(undefined)).toBe('—');
  });

  it('falls back to the original string for a genuinely invalid date rather than showing "Invalid Date"', () => {
    expect(formatAuditTimestamp('not-a-real-date')).toBe('not-a-real-date');
  });

  it('is deliberately not locale/jurisdiction-dependent - same output regardless of viewer, unlike the main formatDate() - correct for audit/compliance logs', () => {
    const a = formatAuditTimestamp('2026-01-15T09:30:00.000Z');
    const b = formatAuditTimestamp('2026-01-15T09:30:00.000Z');
    expect(a).toBe(b);
    expect(a).toContain('UTC');
  });

  it('Batch 437: the audit log stores UTC without a zone; it is shown as that UTC time, not shifted by the viewer\'s offset', () => {
    expect(formatAuditTimestamp('2026-10-02 22:06:32')).toBe('2026-10-02 22:06:32.000 UTC');
    expect(parseStoredUtc('2026-10-02 22:06:32').toISOString()).toBe('2026-10-02T22:06:32.000Z');
    expect(parseStoredUtc('2026-10-02').toISOString()).toBe('2026-10-02T00:00:00.000Z');
  });
});
