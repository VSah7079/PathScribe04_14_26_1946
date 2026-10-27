import { describe, expect, it } from 'vitest';
import {
  accessionRefusal, buildFolder, buildFolderEntries, buildReceipt, dropTimeFromLocalInput, dwellMinutes, dwellParts, effectiveDropAt,
  dwellLabel, findReceiptByBarcode, localInputValueFromDate, matchPendingOrder, nextPlaceholderId, normalizeBarcode, normalizeCallbackNumber, resolveLockboxLookup,
  resolveRefusal, scanStepFor, sortFolderEntries, summarizeTimeToReceipt, validateReportedDropAt, type PendingOrderRef,
} from './lockboxRules';
import type { LockboxReceipt, LockboxResolution } from './lockboxTypes';

const actor = { userId: 'u1', userName: 'Night Tech' };
const order = (id: string, number: string, over: Partial<PendingOrderRef> = {}): PendingOrderRef => ({ id, externalOrderNumber: number, status: 'pending', receivedAt: '2026-10-20T20:00:00.000Z', ...over });
const receipt = (id: string, over: Partial<LockboxReceipt> = {}): LockboxReceipt => ({
  id, barcode: id.toUpperCase(), state: 'matchedOrder', receivedAt: '2026-10-21T02:00:00.000Z', receivedBy: actor, urgent: false, accessionNumber: `S26-${id}`, ...over,
});
const placeholder = (id: string, over: Partial<LockboxReceipt> = {}): LockboxReceipt => receipt(id, { state: 'placeholder', accessionNumber: undefined, placeholderId: `LBX-PH-20261021-00${id.length}`, ...over });
const res = (receiptId: string, kind: LockboxResolution['kind'], at: string, accessionNumber?: string): LockboxResolution => ({ id: `${kind}-${receiptId}`, receiptId, kind, at, by: actor, accessionNumber });

describe('normalizeBarcode', () => {
  it('drops scanner control characters and spaces and upper-cases', () => {
    expect(normalizeBarcode('  abc-123\r\n')).toBe('ABC-123');
    expect(normalizeBarcode('a\u001d b\tc')).toBe('ABC');
  });
  it('refuses nothing-left and over-long values', () => {
    expect(normalizeBarcode('  \r\n')).toBeNull();
    expect(normalizeBarcode(undefined)).toBeNull();
    expect(normalizeBarcode('x'.repeat(65))).toBeNull();
    expect(normalizeBarcode('x'.repeat(64))).toBe('X'.repeat(64));
  });
});

describe('normalizeCallbackNumber', () => {
  it('undefined when empty, the trimmed number when plausible, null otherwise', () => {
    expect(normalizeCallbackNumber('')).toBeUndefined();
    expect(normalizeCallbackNumber(undefined)).toBeUndefined();
    expect(normalizeCallbackNumber(' +1 (520) 555-0100 x12 ')).toBe('+1 (520) 555-0100 x12');
    expect(normalizeCallbackNumber('call Dr Smith')).toBeNull();
    expect(normalizeCallbackNumber('12')).toBeNull();
  });
});

describe('matching a pending order', () => {
  const orders = [order('o2', 'fgh-ord-2', { receivedAt: '2026-10-20T21:00:00.000Z' }), order('o1', 'FGH-ORD-1'), order('o3', 'FGH-ORD-3', { status: 'linked' }), order('o4', 'ZZZ', { specimens: [{ containerBarcode: ' cb-9 ' }] })];
  it('matches the order number, ignoring case', () => expect(matchPendingOrder('FGH-ORD-2', orders)?.id).toBe('o2'));
  it('matches a container barcode on a specimen', () => expect(matchPendingOrder('CB-9', orders)?.id).toBe('o4'));
  it('does not match an order that is no longer pending', () => expect(matchPendingOrder('FGH-ORD-3', orders)).toBeNull());
  it('takes the oldest when several carry the barcode', () => {
    expect(matchPendingOrder('DUP', [order('b', 'dup', { receivedAt: '2026-10-20T22:00:00.000Z' }), order('a', 'DUP', { receivedAt: '2026-10-20T19:00:00.000Z' })])?.id).toBe('a');
  });
  it('is null for an unknown barcode', () => expect(matchPendingOrder('NOPE', orders)).toBeNull());
});

describe('resolving what a scan is (states A and B, and a re-scan)', () => {
  const orders = [order('o1', 'FGH-ORD-1', { facilityId: 'f1' })];
  const names = (id: string | undefined) => (id === 'f1' ? 'Fenwick General' : undefined);
  it('state A: a pending order gives its accession number and facility only', () => {
    const l = resolveLockboxLookup('FGH-ORD-1', orders, [], names);
    expect(l).toEqual({ kind: 'matchedOrder', accessionNumber: 'FGH-ORD-1', facilityId: 'f1', facilityName: 'Fenwick General' });
    expect(Object.keys(l).sort()).toEqual(['accessionNumber', 'facilityId', 'facilityName', 'kind']);
  });
  it('state B: no order and an unknown barcode are both "unmatched", never a failure', () => {
    expect(resolveLockboxLookup('UNKNOWN', orders, [], names)).toEqual({ kind: 'unmatched' });
    expect(resolveLockboxLookup('UNKNOWN', [], [], names)).toEqual({ kind: 'unmatched' });
  });
  it('a barcode already received shows the earlier receipt, even when an order now matches (no duplicate)', () => {
    const earlier = receipt('r1', { barcode: 'FGH-ORD-1' });
    expect(resolveLockboxLookup('FGH-ORD-1', orders, [earlier], names)).toEqual({ kind: 'duplicate', receipt: earlier });
    expect(findReceiptByBarcode('FGH-ORD-1', [earlier])).toBe(earlier);
  });
  it('the kiosk step follows the lookup', () => {
    expect(scanStepFor({ kind: 'duplicate', receipt: receipt('r') })).toBe('showEarlierReceipt');
    expect(scanStepFor({ kind: 'matchedOrder', accessionNumber: 'A' })).toBe('receive');
    expect(scanStepFor({ kind: 'unmatched' })).toBe('askPlaceholder');
  });
});

describe('the drop time a person types', () => {
  const now = new Date('2026-10-21T03:00:00.000Z');
  it('is optional', () => { expect(validateReportedDropAt('', now)).toBeUndefined(); expect(validateReportedDropAt(undefined, now)).toBeUndefined(); });
  it('is kept as an ISO instant when plausible', () => expect(validateReportedDropAt('2026-10-21T01:30:00.000Z', now)).toBe('2026-10-21T01:30:00.000Z'));
  it('allows a few minutes of clock drift ahead, no more', () => {
    expect(validateReportedDropAt('2026-10-21T03:04:00.000Z', now)).toBe('2026-10-21T03:04:00.000Z');
    expect(validateReportedDropAt('2026-10-21T03:10:00.000Z', now)).toBeNull();
  });
  it('refuses nonsense and anything over a week old', () => {
    expect(validateReportedDropAt('not a time', now)).toBeNull();
    expect(validateReportedDropAt('2026-10-13T00:00:00.000Z', now)).toBeNull();
  });
  it('reads a datetime-local value as the browser\'s local time', () => {
    expect(dropTimeFromLocalInput('2026-10-21T02:15')).toBe(new Date(2026, 9, 21, 2, 15).toISOString());
    expect(dropTimeFromLocalInput('')).toBeUndefined();
    expect(dropTimeFromLocalInput('garbage')).toBeUndefined();
  });
});

describe('placeholder ids', () => {
  it('count up within a day and restart on the next', () => {
    expect(nextPlaceholderId([], '2026-10-21T02:00:00.000Z')).toBe('LBX-PH-20261021-001');
    expect(nextPlaceholderId(['LBX-PH-20261021-001', undefined, 'LBX-PH-20261021-007', 'LBX-PH-20261020-099'], '2026-10-21T23:59:00.000Z')).toBe('LBX-PH-20261021-008');
    expect(nextPlaceholderId(['LBX-PH-20261021-001'], '2026-10-22T00:01:00.000Z')).toBe('LBX-PH-20261022-001');
  });
  it('are never an accession number', () => expect(nextPlaceholderId([], '2026-10-21T02:00:00.000Z')).toMatch(/^LBX-PH-/));
});

describe('building a receipt', () => {
  const base = { id: 'r1', barcode: 'B1', nowIso: '2026-10-21T02:00:00.000Z', actor };
  it('a match makes a matchedOrder receipt with the accession number and facility, and ignores placeholder details', () => {
    const r = buildReceipt({ ...base, urgent: false, match: { orderId: 'o1', accessionNumber: 'S26-1', facilityId: 'f1', facilityName: 'Fenwick' }, placeholder: { clientFreeText: 'ignored' }, placeholderId: 'x' });
    expect(r).toMatchObject({ state: 'matchedOrder', accessionNumber: 'S26-1', orderId: 'o1', facilityName: 'Fenwick', receivedAt: base.nowIso, receivedBy: actor });
    expect(r.clientFreeText).toBeUndefined();
    expect(r.placeholderId).toBeUndefined();
  });
  it('no match makes a placeholder receipt with no accession number', () => {
    const r = buildReceipt({ ...base, urgent: false, placeholderId: 'LBX-PH-1', placeholder: { facilityId: 'f2', facilityName: 'Clinic', clientFreeText: '  Dr Who\'s clinic ', physicianId: 'p1', physicianName: 'A B', reportedDropAt: '2026-10-21T01:00:00.000Z' } });
    expect(r).toMatchObject({ state: 'placeholder', placeholderId: 'LBX-PH-1', facilityId: 'f2', clientFreeText: 'Dr Who\'s clinic', physicianName: 'A B', reportedDropAt: '2026-10-21T01:00:00.000Z' });
    expect(r.accessionNumber).toBeUndefined();
  });
  it('a placeholder with nothing given is still a receipt', () => {
    expect(buildReceipt({ ...base, urgent: false, placeholderId: 'LBX-PH-2' })).toMatchObject({ state: 'placeholder', placeholderId: 'LBX-PH-2', urgent: false });
  });
  it('a callback number is kept only on an urgent drop', () => {
    expect(buildReceipt({ ...base, urgent: true, callbackNumber: '555-0100', placeholderId: 'p' })).toMatchObject({ urgent: true, callbackNumber: '555-0100' });
    expect(buildReceipt({ ...base, urgent: false, callbackNumber: '555-0100', placeholderId: 'p' }).callbackNumber).toBeUndefined();
  });
});

describe('dwell time', () => {
  const now = '2026-10-21T08:00:00.000Z';
  it('counts from the receipt', () => expect(dwellMinutes(receipt('a', { receivedAt: '2026-10-21T02:30:00.000Z' }), now)).toBe(330));
  it('a placeholder counts from the typed drop time when it is not after the receipt', () => {
    const p = placeholder('pp', { receivedAt: '2026-10-21T02:30:00.000Z', reportedDropAt: '2026-10-21T01:30:00.000Z' });
    expect(effectiveDropAt(p)).toBe('2026-10-21T01:30:00.000Z');
    expect(dwellMinutes(p, now)).toBe(390);
  });
  it('ignores a typed time after the receipt', () => {
    const p = placeholder('pq', { receivedAt: '2026-10-21T02:30:00.000Z', reportedDropAt: '2026-10-21T03:00:00.000Z' });
    expect(effectiveDropAt(p)).toBe('2026-10-21T02:30:00.000Z');
  });
  it('is never negative, and splits into days, hours and minutes', () => {
    expect(dwellMinutes(receipt('f', { receivedAt: '2026-10-21T09:00:00.000Z' }), now)).toBe(0);
    expect(dwellParts(1500)).toEqual({ days: 1, hours: 1, minutes: 0 });
    expect(dwellParts(59)).toEqual({ days: 0, hours: 0, minutes: 59 });
  });
});

describe('the Overnight folder', () => {
  const now = '2026-10-21T08:00:00.000Z';
  const receipts = [
    receipt('old', { receivedAt: '2026-10-20T22:00:00.000Z' }),
    receipt('new', { receivedAt: '2026-10-21T04:00:00.000Z' }),
    receipt('urgentnew', { receivedAt: '2026-10-21T06:00:00.000Z', urgent: true }),
    receipt('urgentold', { receivedAt: '2026-10-21T01:00:00.000Z', urgent: true }),
    placeholder('ph', { receivedAt: '2026-10-21T03:00:00.000Z' }),
    receipt('done', { receivedAt: '2026-10-20T23:00:00.000Z' }),
  ];
  const resolutions = [res('done', 'accessioned', '2026-10-21T07:00:00.000Z')];
  it('lists what is not accessioned: urgent first, then the oldest first', () => {
    expect(buildFolderEntries(receipts, resolutions, now).map(e => e.receipt.id)).toEqual(['urgentold', 'urgentnew', 'old', 'ph', 'new']);
  });
  it('orders by the typed drop time for a placeholder, and breaks ties by id', () => {
    const entries = [
      { receipt: receipt('b', { receivedAt: '2026-10-21T03:00:00.000Z' }), status: 'matched' as const, dwellMinutes: 0 },
      { receipt: receipt('a', { receivedAt: '2026-10-21T03:00:00.000Z' }), status: 'matched' as const, dwellMinutes: 0 },
      { receipt: placeholder('c', { receivedAt: '2026-10-21T03:30:00.000Z', reportedDropAt: '2026-10-21T02:00:00.000Z' }), status: 'placeholderOpen' as const, dwellMinutes: 0 },
    ];
    expect(sortFolderEntries(entries).map(e => e.receipt.id)).toEqual(['c', 'a', 'b']);
  });
  it('shows the waiting time and the state of each entry', () => {
    const e = buildFolderEntries(receipts, resolutions, now);
    expect(e.find(x => x.receipt.id === 'old')).toMatchObject({ status: 'matched', dwellMinutes: 600 });
    expect(e.find(x => x.receipt.id === 'ph')).toMatchObject({ status: 'placeholderOpen' });
  });
  it('a linked placeholder shows its real number and is no longer open', () => {
    const e = buildFolderEntries([placeholder('ph')], [res('ph', 'placeholderResolved', '2026-10-21T07:00:00.000Z', 'S26-77')], now);
    expect(e[0]).toMatchObject({ status: 'placeholderLinked', linkedAccessionNumber: 'S26-77' });
  });
  it('never changes the receipts it is given', () => {
    const copy = JSON.parse(JSON.stringify(receipts));
    buildFolder(receipts, resolutions, now);
    expect(receipts).toEqual(copy);
  });
});

describe('time-to-receipt for QA', () => {
  const rs = [
    receipt('a', { receivedAt: '2026-10-21T00:00:00.000Z' }),
    receipt('b', { receivedAt: '2026-10-21T01:00:00.000Z', urgent: true }),
    receipt('c', { receivedAt: '2026-10-21T02:00:00.000Z' }),
    receipt('d', { receivedAt: '2026-10-21T03:00:00.000Z' }),
  ];
  const resolutions = [
    res('a', 'accessioned', '2026-10-21T06:00:00.000Z'),   // 360
    res('b', 'accessioned', '2026-10-21T04:00:00.000Z'),   // 180, urgent
    res('c', 'accessioned', '2026-10-21T04:00:00.000Z'),   // 120
  ];
  it('measures drop to accessioned', () => {
    expect(summarizeTimeToReceipt(rs, resolutions, '2026-10-21T08:00:00.000Z')).toEqual({
      accessionedCount: 3, medianMinutes: 180, meanMinutes: 220, maxMinutes: 360,
      urgentAccessionedCount: 1, urgentMedianMinutes: 180, waitingCount: 1, oldestWaitingMinutes: 300,
    });
  });
  it('is empty without data', () => {
    expect(summarizeTimeToReceipt([], [], '2026-10-21T08:00:00.000Z')).toEqual({
      accessionedCount: 0, medianMinutes: null, meanMinutes: null, maxMinutes: null, urgentAccessionedCount: 0, urgentMedianMinutes: null, waitingCount: 0, oldestWaitingMinutes: null,
    });
  });
});

describe('what may be done to a receipt', () => {
  const m = receipt('m');
  const p = placeholder('pp');
  it('a matched receipt can be accessioned; an open placeholder cannot until it is linked', () => {
    expect(accessionRefusal(m, [])).toBeNull();
    expect(accessionRefusal(p, [])).toBe('PLACEHOLDER_UNRESOLVED');
    expect(accessionRefusal(p, [res('pp', 'placeholderResolved', '2026-10-21T05:00:00.000Z', 'S26-1')])).toBeNull();
  });
  it('not twice, and not unknown', () => {
    expect(accessionRefusal(m, [res('m', 'accessioned', '2026-10-21T05:00:00.000Z')])).toBe('ALREADY_ACCESSIONED');
    expect(accessionRefusal(undefined, [])).toBe('NOT_FOUND');
  });
  it('only an open placeholder can be resolved, once', () => {
    expect(resolveRefusal(p, [])).toBeNull();
    expect(resolveRefusal(m, [])).toBe('NOT_A_PLACEHOLDER');
    expect(resolveRefusal(p, [res('pp', 'placeholderResolved', '2026-10-21T05:00:00.000Z', 'S26-1')])).toBe('CONFLICT');
    expect(resolveRefusal(p, [res('pp', 'accessioned', '2026-10-21T05:00:00.000Z')])).toBe('ALREADY_ACCESSIONED');
    expect(resolveRefusal(undefined, [])).toBe('NOT_FOUND');
  });
});

describe('values for the screen', () => {
  it('the default time dropped is now, as a datetime-local value', () => {
    expect(localInputValueFromDate(new Date(2026, 9, 21, 2, 5))).toBe('2026-10-21T02:05');
    expect(dropTimeFromLocalInput(localInputValueFromDate(new Date(2026, 9, 21, 2, 5)))).toBe(new Date(2026, 9, 21, 2, 5).toISOString());
  });
  it('a waiting time is shown in the largest useful units', () => {
    expect(dwellLabel(0)).toEqual({ key: 'minutes', values: { minutes: 0 } });
    expect(dwellLabel(125)).toEqual({ key: 'hoursMinutes', values: { hours: 2, minutes: 5 } });
    expect(dwellLabel(1500)).toEqual({ key: 'daysHours', values: { days: 1, hours: 1 } });
  });
});

describe('accessionLinkForReceipt (Batch 659)', () => {
  it('carries the matched order to the Accession screen, or opens it blank', async () => {
    const { accessionLinkForReceipt } = await import('./lockboxRules');
    expect(accessionLinkForReceipt({ orderId: 'ord-005' })).toBe('/accession?order=ord-005');
    expect(accessionLinkForReceipt({})).toBe('/accession');
  });
});
