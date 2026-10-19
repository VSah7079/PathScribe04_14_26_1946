import { describe, expect, it, vi } from 'vitest';
import { newAuditId } from './auditIds';
import { mockAuditService } from './mockAuditService';

describe('newAuditId', () => {
  it('gives 1,000 ids that are all different, even in the same millisecond', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newAuditId('al')));
    expect(ids.size).toBe(1000);
  });

  it('keeps the al and el prefixes', () => {
    expect(newAuditId('al').startsWith('al-')).toBe(true);
    expect(newAuditId('el').startsWith('el-')).toBe(true);
  });

  it('still gives different ids when crypto.randomUUID is not available', () => {
    vi.stubGlobal('crypto', {});
    try {
      const ids = new Set(Array.from({ length: 1000 }, () => newAuditId('el')));
      expect(ids.size).toBe(1000);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('mockAuditService ids', () => {
  it('writes entries logged back to back with different ids', async () => {
    const entries = await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        mockAuditService.logEvent({ type: 'user', event: `Event ${i}`, detail: 'id test', user: 'Test', caseId: null, confidence: null }),
      ),
    );
    const ids = entries.map((r) => (r.ok ? r.data.id : ''));
    expect(new Set(ids).size).toBe(25);
  });
});
