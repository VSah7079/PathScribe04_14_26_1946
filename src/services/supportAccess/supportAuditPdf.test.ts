import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildSupportAuditPdf, type SupportAuditPdfInput } from './supportAuditPdf';

const input: SupportAuditPdfInput = {
  organisationName: 'Org', exportedBy: 'Admin', exportedAt: '2026-10-22T10:00:00.000Z',
  chain: { intact: true, entries: 1 } as never,
  entries: [{ seq: 1, at: '2026-10-22T09:00:00.000Z', action: 'VIEW', actorName: 'S', detail: 'looked', caseIds: [], hash: 'a'.repeat(64) } as never],
};

const hex = async (b: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', b as unknown as BufferSource))).map(x => x.toString(16).padStart(2, '0')).join('');

describe('buildSupportAuditPdf is deterministic', () => {
  afterEach(() => vi.useRealTimers());
  it('the same input gives the same SHA-256 even when the clock has moved', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-22T10:00:01.000Z'));
    const a = await buildSupportAuditPdf(input);
    vi.setSystemTime(new Date('2027-01-01T00:00:00.000Z'));
    const b = await buildSupportAuditPdf(input);
    expect(await hex(a)).toBe(await hex(b));
  });
  it('a different input is a different document', async () => {
    const a = await buildSupportAuditPdf(input);
    const b = await buildSupportAuditPdf({ ...input, exportedBy: 'Someone else' });
    expect(await hex(a)).not.toBe(await hex(b));
  });
});
