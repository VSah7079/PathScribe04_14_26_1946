import { describe, expect, it } from 'vitest';
import { createLockboxService, type LockboxServiceDeps, type LockboxStore } from './lockboxService';
import type { PendingOrderRef } from './lockboxRules';
import type { LockboxReceipt, LockboxResolution } from './lockboxTypes';

function setup(over: { granted?: string[]; orders?: PendingOrderRef[]; start?: string } = {}) {
  const granted = over.granted ?? ['lockbox:specimen:receive', 'lockbox:folder:review', 'lockbox:placeholder:resolve'];
  const receipts: LockboxReceipt[] = [];
  const resolutions: LockboxResolution[] = [];
  const asked: string[] = [];
  const audits: { event: string; detail: string; caseId: string | null; facilityId: string | null; user: string }[] = [];
  let clock = new Date(over.start ?? '2026-10-21T02:00:00.000Z');
  let n = 0;
  let orders: PendingOrderRef[] = over.orders ?? [{ id: 'o1', externalOrderNumber: 'FGH-ORD-1', status: 'pending', receivedAt: '2026-10-20T20:00:00.000Z', facilityId: 'f1' }];
  const store: LockboxStore = {
    receipts: async () => [...receipts], resolutions: async () => [...resolutions],
    appendReceipt: async r => { receipts.push(r); }, appendResolution: async r => { resolutions.push(r); },
  };
  const deps: LockboxServiceDeps = {
    authorization: { enforce: async (c: string) => { asked.push(c); return { capability: c, allowed: granted.includes(c), grantedBy: [], missingRequirements: [], context: {} } as never; } },
    store, pendingOrders: async () => orders,
    facilityName: async id => ({ f1: 'Fenwick General', f2: 'Royal Clinic' } as Record<string, string>)[id],
    physicianName: async id => (id === 'p1' ? 'Ada Lovelace' : undefined),
    now: () => clock, actor: () => ({ userId: 'u-night', userName: 'Night Tech' }), newId: () => `id${++n}`,
    audit: async e => { audits.push(e); },
  };
  return { svc: createLockboxService(deps), receipts, resolutions, asked, audits, advance: (min: number) => { clock = new Date(clock.getTime() + min * 60000); }, setOrders: (o: PendingOrderRef[]) => { orders = o; } };
}

describe('lockbox service: receiving', () => {
  it('state A: a pending order is received with its accession number and facility, stamped with server time and the signed-in user', async () => {
    const { svc, receipts } = setup();
    const r = await svc.receiveSpecimen({ barcode: ' fgh-ord-1\r\n' });
    expect(r.ok).toBe(true);
    expect(receipts[0]).toMatchObject({ state: 'matchedOrder', barcode: 'FGH-ORD-1', accessionNumber: 'FGH-ORD-1', facilityName: 'Fenwick General', receivedAt: '2026-10-21T02:00:00.000Z', receivedBy: { userId: 'u-night', userName: 'Night Tech' }, urgent: false });
  });

  it('the receipt carries no patient field at all', async () => {
    const orders = [{ id: 'o1', externalOrderNumber: 'A1', status: 'pending', receivedAt: 'x', patient: { lastName: 'Wilcox', mrn: '999' } } as PendingOrderRef];
    const { svc, receipts } = setup({ orders });
    await svc.receiveSpecimen({ barcode: 'A1' });
    expect(JSON.stringify(receipts[0])).not.toMatch(/Wilcox|999|patient/);
    const l = await svc.lookupBarcode('A1');
    expect(JSON.stringify(l)).not.toMatch(/Wilcox|999|patient/);
  });

  it('state B: an unknown barcode becomes a placeholder, not a failure, and never gets an accession number', async () => {
    const { svc, receipts } = setup();
    const r = await svc.receiveSpecimen({ barcode: 'NO-ORDER', placeholder: { facilityId: 'f2', physicianId: 'p1', clientFreeText: 'Unlisted clinic' } });
    expect(r.ok).toBe(true);
    expect(receipts[0]).toMatchObject({ state: 'placeholder', placeholderId: 'LBX-PH-20261021-001', facilityName: 'Royal Clinic', physicianName: 'Ada Lovelace', clientFreeText: 'Unlisted clinic' });
    expect(receipts[0].accessionNumber).toBeUndefined();
  });

  it('state B with no details at all still records the drop', async () => {
    const { svc, receipts } = setup();
    expect((await svc.receiveSpecimen({ barcode: 'BARE' })).ok).toBe(true);
    expect(receipts[0].state).toBe('placeholder');
  });

  it('placeholder ids count up through the night', async () => {
    const { svc, receipts } = setup();
    await svc.receiveSpecimen({ barcode: 'P1' });
    await svc.receiveSpecimen({ barcode: 'P2' });
    expect(receipts.map(r => r.placeholderId)).toEqual(['LBX-PH-20261021-001', 'LBX-PH-20261021-002']);
  });

  it('the server decides the state: placeholder details sent with a barcode that matches an order are ignored', async () => {
    const { svc, receipts } = setup();
    await svc.receiveSpecimen({ barcode: 'FGH-ORD-1', placeholder: { clientFreeText: 'sneaky', facilityId: 'f2' } });
    expect(receipts[0].state).toBe('matchedOrder');
    expect(receipts[0].clientFreeText).toBeUndefined();
    expect(receipts[0].facilityName).toBe('Fenwick General');
  });

  it('time and user in the input are ignored: the server\'s are used', async () => {
    const { svc, receipts } = setup();
    await svc.receiveSpecimen({ barcode: 'T1', receivedAt: '1999-01-01T00:00:00.000Z', receivedBy: { userId: 'x', userName: 'Impostor' } } as never);
    expect(receipts[0].receivedAt).toBe('2026-10-21T02:00:00.000Z');
    expect(receipts[0].receivedBy.userName).toBe('Night Tech');
  });

  it('STATE C: an urgent drop is tagged high priority with its callback number, on A and on B', async () => {
    const { svc, receipts } = setup();
    await svc.receiveSpecimen({ barcode: 'FGH-ORD-1', urgent: true, callbackNumber: '520-555-0100' });
    await svc.receiveSpecimen({ barcode: 'URG-B', urgent: true, callbackNumber: '520-555-0101' });
    expect(receipts.map(r => [r.state, r.urgent, r.callbackNumber])).toEqual([['matchedOrder', true, '520-555-0100'], ['placeholder', true, '520-555-0101']]);
  });

  it('a callback number that is not a phone number is refused, and nothing is written', async () => {
    const { svc, receipts } = setup();
    expect(await svc.receiveSpecimen({ barcode: 'X1', urgent: true, callbackNumber: 'ask for Sam' })).toEqual({ ok: false, error: 'INVALID' });
    expect(receipts).toHaveLength(0);
  });

  it('a callback number on a non-urgent drop is not kept', async () => {
    const { svc, receipts } = setup();
    await svc.receiveSpecimen({ barcode: 'X2', callbackNumber: '520-555-0100' });
    expect(receipts[0].callbackNumber).toBeUndefined();
  });

  it('re-scanning a received barcode writes no duplicate (409 CONFLICT) and lookup returns the earlier receipt', async () => {
    const { svc, receipts, advance } = setup();
    await svc.receiveSpecimen({ barcode: 'FGH-ORD-1' });
    advance(90);
    expect(await svc.receiveSpecimen({ barcode: 'fgh-ord-1' })).toEqual({ ok: false, error: 'CONFLICT' });
    expect(receipts).toHaveLength(1);
    const l = await svc.lookupBarcode('FGH-ORD-1');
    expect(l.ok === true && l.data.kind === 'duplicate' && l.data.receipt.receivedAt).toBe('2026-10-21T02:00:00.000Z');
  });

  it('an empty barcode is INVALID', async () => {
    const { svc } = setup();
    expect(await svc.receiveSpecimen({ barcode: '  ' })).toEqual({ ok: false, error: 'INVALID' });
    expect(await svc.lookupBarcode('')).toEqual({ ok: false, error: 'INVALID' });
  });

  it('an implausible typed drop time is INVALID', async () => {
    const { svc } = setup();
    expect(await svc.receiveSpecimen({ barcode: 'T2', placeholder: { reportedDropAt: '2026-10-22T02:00:00.000Z' } })).toEqual({ ok: false, error: 'INVALID' });
  });

  it('writes an audit entry with no patient data and not the barcode', async () => {
    const { svc, audits } = setup();
    await svc.receiveSpecimen({ barcode: 'SECRET-BARCODE-77', urgent: true });
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ event: 'Lockbox specimen received', user: 'Night Tech', caseId: null });
    expect(audits[0].detail).toBe('Received in lockbox, placeholder LBX-PH-20261021-001, urgent. Receipt id1.');
    expect(audits[0].detail).not.toContain('SECRET');
  });

  it('a matched receipt\'s audit entry names the accession number in caseId only', async () => {
    const { svc, audits } = setup();
    await svc.receiveSpecimen({ barcode: 'FGH-ORD-1' });
    expect(audits[0]).toMatchObject({ caseId: 'FGH-ORD-1', facilityId: 'f1' });
    expect(audits[0].detail).toBe('Received in lockbox, matched to a pending order. Receipt id1.');
  });
});

describe('lockbox service: capabilities are checked on every call', () => {
  it('each method asks for its own capability and stops on a refusal', async () => {
    const { svc, receipts, asked } = setup({ granted: [] });
    expect(await svc.lookupBarcode('A')).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(await svc.receiveSpecimen({ barcode: 'A' })).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(await svc.getFolder()).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(await svc.markAccessioned('r')).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(await svc.resolvePlaceholder('r', 'S26-1')).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(asked).toEqual(['lockbox:specimen:receive', 'lockbox:specimen:receive', 'lockbox:folder:review', 'lockbox:folder:review', 'lockbox:placeholder:resolve']);
    expect(receipts).toHaveLength(0);
  });

  it('the capabilities are separate: review without receive cannot receive, receive without review cannot see the folder', async () => {
    const reviewOnly = setup({ granted: ['lockbox:folder:review'] });
    expect((await reviewOnly.svc.receiveSpecimen({ barcode: 'A' })).ok).toBe(false);
    expect((await reviewOnly.svc.getFolder()).ok).toBe(true);
    const receiveOnly = setup({ granted: ['lockbox:specimen:receive'] });
    expect((await receiveOnly.svc.receiveSpecimen({ barcode: 'A' })).ok).toBe(true);
    expect((await receiveOnly.svc.getFolder()).ok).toBe(false);
  });

  it('resolving needs its own capability, not just folder review', async () => {
    const { svc } = setup({ granted: ['lockbox:specimen:receive', 'lockbox:folder:review'] });
    const r = await svc.receiveSpecimen({ barcode: 'PH1' });
    const id = r.ok === true ? r.data.id : '';
    expect(await svc.resolvePlaceholder(id, 'S26-9')).toEqual({ ok: false, error: 'NOT_PERMITTED' });
  });
});

describe('lockbox service: the Overnight folder and its actions', () => {
  it('lists receipts urgent first then oldest, with waiting time', async () => {
    const t = setup();
    await t.svc.receiveSpecimen({ barcode: 'FGH-ORD-1' });
    t.advance(30);
    await t.svc.receiveSpecimen({ barcode: 'B2', urgent: true });
    t.advance(60);
    await t.svc.receiveSpecimen({ barcode: 'B3' });
    t.advance(30);
    const f = await t.svc.getFolder();
    expect(f.ok).toBe(true);
    if (f.ok !== true) return;
    expect(f.data.entries.map(e => [e.receipt.barcode, e.dwellMinutes])).toEqual([['B2', 90], ['FGH-ORD-1', 120], ['B3', 30]]);
    expect(f.data.summary).toMatchObject({ waitingCount: 3, accessionedCount: 0 });
  });

  it('marking accessioned appends an entry and the receipt stays unchanged', async () => {
    const t = setup();
    const r = await t.svc.receiveSpecimen({ barcode: 'FGH-ORD-1' });
    const id = r.ok === true ? r.data.id : '';
    const before = JSON.stringify(t.receipts[0]);
    t.advance(240);
    const m = await t.svc.markAccessioned(id);
    expect(m.ok).toBe(true);
    expect(t.resolutions).toHaveLength(1);
    expect(t.resolutions[0]).toMatchObject({ kind: 'accessioned', receiptId: id, at: '2026-10-21T06:00:00.000Z', by: { userName: 'Night Tech' }, accessionNumber: 'FGH-ORD-1' });
    expect(JSON.stringify(t.receipts[0])).toBe(before);
    const f = await t.svc.getFolder();
    expect(f.ok === true && f.data.entries).toEqual([]);
    expect(f.ok === true && f.data.summary).toMatchObject({ accessionedCount: 1, medianMinutes: 240, waitingCount: 0 });
  });

  it('refuses a second "accessioned" and an unknown receipt', async () => {
    const t = setup();
    const r = await t.svc.receiveSpecimen({ barcode: 'FGH-ORD-1' });
    const id = r.ok === true ? r.data.id : '';
    await t.svc.markAccessioned(id);
    expect(await t.svc.markAccessioned(id)).toEqual({ ok: false, error: 'ALREADY_ACCESSIONED' });
    expect(await t.svc.markAccessioned('nope')).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect(t.resolutions).toHaveLength(1);
  });

  it('an unresolved placeholder cannot be marked accessioned; resolving adds an entry, then it can', async () => {
    const t = setup();
    const r = await t.svc.receiveSpecimen({ barcode: 'PH-1' });
    const id = r.ok === true ? r.data.id : '';
    expect(await t.svc.markAccessioned(id)).toEqual({ ok: false, error: 'PLACEHOLDER_UNRESOLVED' });
    const before = JSON.stringify(t.receipts[0]);
    t.advance(10);
    const res = await t.svc.resolvePlaceholder(id, ' s26-4403 ');
    expect(res.ok).toBe(true);
    expect(t.resolutions[0]).toMatchObject({ kind: 'placeholderResolved', accessionNumber: 'S26-4403', receiptId: id });
    expect(JSON.stringify(t.receipts[0])).toBe(before);
    const f = await t.svc.getFolder();
    expect(f.ok === true && f.data.entries[0]).toMatchObject({ status: 'placeholderLinked', linkedAccessionNumber: 'S26-4403' });
    t.advance(5);
    expect((await t.svc.markAccessioned(id)).ok).toBe(true);
    expect(t.resolutions.map(x => x.kind)).toEqual(['placeholderResolved', 'accessioned']);
  });

  it('resolving a placeholder with a pending order\'s number links that order', async () => {
    const t = setup();
    const r = await t.svc.receiveSpecimen({ barcode: 'PH-2' });
    const id = r.ok === true ? r.data.id : '';
    const res = await t.svc.resolvePlaceholder(id, 'fgh-ord-1');
    expect(res.ok === true && res.data).toMatchObject({ orderId: 'o1', accessionNumber: 'FGH-ORD-1' });
  });

  it('resolving is refused for a matched receipt, twice, or with an empty number', async () => {
    const t = setup();
    const a = await t.svc.receiveSpecimen({ barcode: 'FGH-ORD-1' });
    const b = await t.svc.receiveSpecimen({ barcode: 'PH-3' });
    const aid = a.ok === true ? a.data.id : '';
    const bid = b.ok === true ? b.data.id : '';
    expect(await t.svc.resolvePlaceholder(aid, 'S26-1')).toEqual({ ok: false, error: 'NOT_A_PLACEHOLDER' });
    expect(await t.svc.resolvePlaceholder(bid, '  ')).toEqual({ ok: false, error: 'INVALID' });
    expect((await t.svc.resolvePlaceholder(bid, 'S26-2')).ok).toBe(true);
    expect(await t.svc.resolvePlaceholder(bid, 'S26-3')).toEqual({ ok: false, error: 'CONFLICT' });
    expect(await t.svc.resolvePlaceholder('missing', 'S26-3')).toEqual({ ok: false, error: 'NOT_FOUND' });
  });

  it('the audit entries for these actions carry the receipt id and no patient text', async () => {
    const t = setup();
    const r = await t.svc.receiveSpecimen({ barcode: 'PH-4' });
    const id = r.ok === true ? r.data.id : '';
    await t.svc.resolvePlaceholder(id, 'S26-8');
    await t.svc.markAccessioned(id);
    expect(t.audits.map(a => a.event)).toEqual(['Lockbox specimen received', 'Lockbox placeholder resolved', 'Lockbox specimen accessioned']);
    expect(t.audits[1].detail).toBe(`Placeholder LBX-PH-20261021-001 linked to an accession number. Receipt ${id}.`);
    expect(t.audits[2].detail).toBe(`Marked accessioned from the Overnight folder. Receipt ${id}.`);
  });
});
