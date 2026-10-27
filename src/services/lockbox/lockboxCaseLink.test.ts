import { describe, expect, it, vi } from 'vitest';
import { createLockboxService, type LockboxServiceDeps, type LockboxStore } from './lockboxService';
import { linkLockboxReceiptAtAccession } from '../accessioning/linkLockboxReceipt';
import type { LockboxReceipt, LockboxResolution } from './lockboxTypes';

const receipt = (over: Partial<LockboxReceipt>): LockboxReceipt => ({
  id: 'r1', barcode: 'FGH-ORD-1', state: 'matchedOrder', receivedAt: '2026-10-21T02:00:00.000Z', receivedBy: { userId: 'u', userName: 'Night' },
  urgent: false, accessionNumber: 'FGH-ORD-1', orderId: 'o1', facilityId: 'f1', ...over,
});

function setup(opts: { receipts?: LockboxReceipt[]; resolutions?: LockboxResolution[]; allowed?: boolean; linkCase?: LockboxServiceDeps['linkCase'] } = {}) {
  const receipts = opts.receipts ?? [receipt({})];
  const resolutions: LockboxResolution[] = opts.resolutions ?? [];
  const audits: { event: string; detail: string; caseId: string | null }[] = [];
  const store: LockboxStore = { receipts: async () => receipts, resolutions: async () => [...resolutions], appendReceipt: async () => {}, appendResolution: async r => { resolutions.push(r); } };
  const asked: string[] = [];
  const linkCase = opts.linkCase ?? vi.fn().mockResolvedValue(true);
  const svc = createLockboxService({
    authorization: { enforce: async (c: string) => { asked.push(c); return { allowed: opts.allowed !== false } as never; } },
    store, pendingOrders: async () => [], facilityName: async () => undefined, physicianName: async () => undefined,
    now: () => new Date('2026-10-21T09:00:00.000Z'), actor: () => ({ userId: 'u2', userName: 'Day Accessioner' }), newId: () => 'res1',
    linkCase, audit: async e => { audits.push(e); },
  });
  return { svc, resolutions, audits, asked, linkCase };
}

describe('accessionReceiptForCase', () => {
  it('finds the receipt by order, links the case both ways, marks it accessioned and audits, in one call', async () => {
    const { svc, resolutions, audits, linkCase, asked } = setup();
    const r = await svc.accessionReceiptForCase({ caseId: 'C1', orderId: 'o1' });
    expect(r).toMatchObject({ ok: true, data: { kind: 'accessioned', receiptId: 'r1', caseId: 'C1', accessionNumber: 'FGH-ORD-1' } });
    expect(linkCase).toHaveBeenCalledWith('C1', 'r1');
    expect(resolutions).toHaveLength(1);
    expect(asked).toEqual(['lockbox:folder:review']);
    expect(audits[0]).toMatchObject({ event: 'Lockbox receipt linked to case', caseId: 'C1' });
    expect(audits[0].detail).not.toContain('FGH-ORD-1'); // no barcode in audit text
  });

  it('finds the receipt by accession number (case-insensitive), and a placeholder by the number it was linked to', async () => {
    expect((await setup().svc.accessionReceiptForCase({ caseId: 'C1', accessionNumber: ' fgh-ord-1 ' })).ok).toBe(true);
    const ph = receipt({ id: 'p1', state: 'placeholder', accessionNumber: undefined, orderId: undefined, barcode: 'X9', placeholderId: 'LBX-PH-1' });
    const link: LockboxResolution = { id: 'l1', receiptId: 'p1', kind: 'placeholderResolved', at: 't', by: { userId: 'u', userName: 'n' }, accessionNumber: 'S26-77', orderId: 'o9' };
    const { svc, resolutions } = setup({ receipts: [ph], resolutions: [link] });
    const r = await svc.accessionReceiptForCase({ caseId: 'C2', orderId: 'o9' });
    expect(r).toMatchObject({ ok: true, data: { receiptId: 'p1', caseId: 'C2', accessionNumber: 'S26-77' } });
    expect(resolutions[resolutions.length - 1]?.kind).toBe('accessioned');
  });

  it('an ordinary case (no receipt) is ok(null) and writes nothing; an open placeholder is never matched', async () => {
    const a = setup();
    expect(await a.svc.accessionReceiptForCase({ caseId: 'C1', orderId: 'other' })).toEqual({ ok: true, data: null });
    expect(a.linkCase).not.toHaveBeenCalled();
    const ph = receipt({ id: 'p1', state: 'placeholder', accessionNumber: undefined, orderId: undefined });
    expect(await setup({ receipts: [ph] }).svc.accessionReceiptForCase({ caseId: 'C1', orderId: 'o1' })).toEqual({ ok: true, data: null });
  });

  it('a receipt already accessioned is not matched again (null), and an explicit receipt id that is not open is NOT_FOUND', async () => {
    const done: LockboxResolution = { id: 'a1', receiptId: 'r1', kind: 'accessioned', at: 't', by: { userId: 'u', userName: 'n' } };
    const s = setup({ resolutions: [done] });
    expect(await s.svc.accessionReceiptForCase({ caseId: 'C1', orderId: 'o1' })).toEqual({ ok: true, data: null });
    expect(await s.svc.accessionReceiptForCase({ caseId: 'C1', receiptId: 'r1' })).toEqual({ ok: false, error: 'NOT_FOUND' });
  });

  it('is refused without the capability, and records nothing if the case cannot be written', async () => {
    expect(await setup({ allowed: false }).svc.accessionReceiptForCase({ caseId: 'C1', orderId: 'o1' })).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    const s = setup({ linkCase: vi.fn().mockResolvedValue(false) });
    expect(await s.svc.accessionReceiptForCase({ caseId: 'C1', orderId: 'o1' })).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect(s.resolutions).toHaveLength(0);
  });

  it('the manual markAccessioned still works', async () => {
    const { svc } = setup();
    expect((await svc.markAccessioned('r1')).ok).toBe(true);
  });
});

describe('linkLockboxReceiptAtAccession', () => {
  it('maps the answers and never throws', async () => {
    const mk = (v: unknown) => ({ accessionReceiptForCase: vi.fn().mockResolvedValue(v) });
    expect(await linkLockboxReceiptAtAccession({ caseId: 'C' }, mk({ ok: true, data: { id: 'x' } }))).toBe('linked');
    expect(await linkLockboxReceiptAtAccession({ caseId: 'C' }, mk({ ok: true, data: null }))).toBe('noReceipt');
    expect(await linkLockboxReceiptAtAccession({ caseId: 'C' }, mk({ ok: false, error: 'NOT_PERMITTED' }))).toBe('notPermitted');
    expect(await linkLockboxReceiptAtAccession({ caseId: 'C' }, mk({ ok: false, error: 'NOT_FOUND' }))).toBe('failed');
    expect(await linkLockboxReceiptAtAccession({ caseId: 'C' }, { accessionReceiptForCase: vi.fn().mockRejectedValue(new Error('x')) })).toBe('failed');
  });
});
