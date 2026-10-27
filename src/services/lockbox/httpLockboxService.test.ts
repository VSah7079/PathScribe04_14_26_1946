import { describe, expect, it } from 'vitest';
import { createHttpLockboxService } from './httpLockboxService';
import { expectCalls, expectEveryMethod, fakeApi, type CallCase } from '../apiServer/httpTestHelpers';

describe('http lockbox service', () => {
  const { client, fetch } = fakeApi(200, {});
  const service = createHttpLockboxService(client);
  const input = { barcode: 'AB 1', urgent: true, callbackNumber: '555-0100', placeholder: { clientFreeText: 'x' } };
  const cases: CallCase[] = [
    ['lookupBarcode', ['AB 1'], 'POST', '/api/lockbox/lockbox-drop-off/lookup-barcode', { barcode: 'AB 1' }],
    ['receiveSpecimen', [input], 'POST', '/api/lockbox/lockbox-drop-off/receive-specimen', input],
    ['getFolder', [], 'GET', '/api/lockbox/lockbox-drop-off/get-folder'],
    ['markAccessioned', ['r1'], 'POST', '/api/lockbox/lockbox-drop-off/mark-accessioned', { receiptId: 'r1' }],
    ['accessionReceiptForCase', [{ caseId: 'C1', orderId: 'o1' }], 'POST', '/api/lockbox/lockbox-drop-off/accession-receipt-for-case', { caseId: 'C1', orderId: 'o1' }],
    ['resolvePlaceholder', ['r1', 'S26-1'], 'POST', '/api/lockbox/lockbox-drop-off/resolve-placeholder', { receiptId: 'r1', accessionNumber: 'S26-1' }],
  ];
  it('sends each method to its route', async () => { await expectCalls(service, fetch, cases); });
  it('has a route for every method', () => { expectEveryMethod(service, cases); });
  it('puts no barcode, id or text in a URL', async () => {
    fetch.mockClear();
    await service.lookupBarcode('SECRET-77');
    await service.markAccessioned('receipt-9');
    expect(fetch.mock.calls.map(c => String(c[0]))).toEqual([
      'https://api.test/api/lockbox/lockbox-drop-off/lookup-barcode', 'https://api.test/api/lockbox/lockbox-drop-off/mark-accessioned',
    ]);
  });
  it('a receipt comes back as the receipt', async () => {
    const receipt = { id: 'r1', barcode: 'B', state: 'placeholder', receivedAt: '2026-10-21T02:00:00.000Z', receivedBy: { userId: 'u', userName: 'n' }, urgent: false };
    const api = fakeApi(200, receipt);
    expect(await createHttpLockboxService(api.client).receiveSpecimen({ barcode: 'B' })).toEqual({ ok: true, data: receipt });
  });
  it('a refusal is the fixed code, never the server text', async () => {
    const api = fakeApi(403, { error: 'NOT_PERMITTED', message: 'Smith, John' });
    const r = await createHttpLockboxService(api.client).getFolder();
    expect(r).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(JSON.stringify(r)).not.toContain('Smith');
  });
  it('a duplicate barcode (409) is the fixed code CONFLICT', async () => {
    const api = fakeApi(409, { error: 'CONFLICT' });
    expect(await createHttpLockboxService(api.client).receiveSpecimen({ barcode: 'B' })).toEqual({ ok: false, error: 'CONFLICT' });
  });
});
