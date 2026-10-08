import { describe, it, expect, vi } from 'vitest';
import { createCaseAddresses, isCaseAddressReference, CASE_ADDRESS_VIEWS } from './caseAddresses';

const REF = 'SR-7K2Q-9MXD';
const refs = () => ({
  forRecord: vi.fn(async (kind: 'case', recordId: string) => ({ ok: true as const, data: { ref: REF, kind, recordId, createdAt: '' } })),
  recordIdFor: vi.fn(async (ref: string) => (ref === 'SR-AAAA-BBBB' ? { ok: true as const, data: 'S26-9999' } : { ok: false as const, error: 'supportReferenceNotFound' })),
});

describe('case addresses carry a reference, never the accession (Batch 446)', () => {
  it('builds every view with the reference', async () => {
    const a = createCaseAddresses(refs());
    expect(await a.addressOf('S26-4410', 'synoptic')).toBe(`/case/${REF}/synoptic`);
    expect(await a.addressOf('S26-4410', 'grossing')).toBe(`/case/${REF}/grossing`);
    expect(await a.addressOf('S26-4410', 'report')).toBe(`/report/${REF}`);
    expect(await a.addressOf('S26-4410', 'cytology')).toBe(`/cytology-worklist/${REF}`);
    expect(await a.addressOf('S26-4410', 'addOnOrders')).toBe(`/add-on-orders?case=${REF}`);
    expect(await a.addressOf('S26-4410', 'synoptic', { specimen: 'A' })).toBe(`/case/${REF}/synoptic?specimen=A`);
    for (const view of Object.keys(CASE_ADDRESS_VIEWS) as (keyof typeof CASE_ADDRESS_VIEWS)[]) {
      expect(await a.addressOf('S26-4410', view)).not.toContain('S26-4410');
    }
  });
  it('resolves a reference it created without asking the service', async () => {
    const r = refs();
    const a = createCaseAddresses(r);
    await a.addressOf('S26-4410', 'synoptic');
    expect(a.knownCaseId(REF)).toBe('S26-4410');
    expect(await a.caseIdOf(REF)).toEqual({ caseId: 'S26-4410', legacy: false });
    expect(r.recordIdFor).not.toHaveBeenCalled();
  });
  it('asks the service for a reference from elsewhere (a refresh, a bookmark)', async () => {
    const a = createCaseAddresses(refs());
    expect(await a.caseIdOf('SR-AAAA-BBBB')).toEqual({ caseId: 'S26-9999', legacy: false });
    expect(await a.caseIdOf('SR-ZZZZ-ZZZZ')).toEqual({ caseId: undefined, legacy: false });
  });
  it('treats anything else as an old accession address, to be replaced', async () => {
    const a = createCaseAddresses(refs());
    expect(await a.caseIdOf('S26-4410')).toEqual({ caseId: 'S26-4410', legacy: true });
  });
  it('recognises only the exact reference form, so no accession is mistaken for one', () => {
    expect(isCaseAddressReference(REF)).toBe(true);
    for (const s of ['S26-44102', 'sr-7k2q-9mxd', 'SR7K2Q9MXD', 'SR-7K2Q-9MXI', '', undefined]) expect(isCaseAddressReference(s)).toBe(false);
  });
});
