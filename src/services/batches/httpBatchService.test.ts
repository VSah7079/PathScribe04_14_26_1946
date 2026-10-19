import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpBatchService } from './httpBatchService';

// Batch 617 (PS-514): every call of IBatchService against a fake fetch: verb, path, body, and what a success and a refusal become.
const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpBatchService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
type Call = (...a: unknown[]) => Promise<unknown>;
const call = (f: ReturnType<typeof vi.fn>, name: string, args: unknown[]): Promise<unknown> => (svc(f) as unknown as Record<string, Call>)[name](...args);
const rejection = async (p: Promise<unknown>): Promise<string> => { try { await p; return 'none'; } catch (e) { return (e as { code?: string }).code ?? 'none'; } };

const CALLS: { name: string; kind: string; verb: string; path: string; body?: unknown; missing: unknown; args: unknown[] }[] = [
  { name: 'getAll', kind: 'result', verb: 'GET', path: '/api/batches/batch/get-all', missing: null, args: [] },
  { name: 'getById', kind: 'result', verb: 'GET', path: '/api/batches/batch/get-by-id?id=id-1', missing: null, args: ['id-1'] },
  { name: 'getByMasterBarcode', kind: 'result', verb: 'GET', path: '/api/batches/batch/get-by-master-barcode?barcode=barcode-1', missing: null, args: ['barcode-1'] },
  { name: 'create', kind: 'result', verb: 'POST', path: '/api/batches/batch/create', body: {"sample":1}, missing: null, args: [{ sample: 1 } as never] },
  { name: 'addItemByScan', kind: 'required', verb: 'POST', path: '/api/batches/batch/add-item-by-scan', body: {"batchId":"batchId-1","scannedValue":"scannedValue-1","byUserId":"byUserId-1","byUserName":"byUserName-1","fovCount":3}, missing: null, args: ['batchId-1', 'scannedValue-1', 'byUserId-1', 'byUserName-1', 3] },
  { name: 'removeItem', kind: 'result', verb: 'POST', path: '/api/batches/batch/remove-item', body: {"batchId": "batchId-1", "itemId": "itemId-1", "byUserId": "byUserId-1", "byUserName": "byUserName-1"}, missing: null, args: ['batchId-1', 'itemId-1', 'byUserId-1', 'byUserName-1'] },
  { name: 'moveItem', kind: 'result', verb: 'POST', path: '/api/batches/batch/move-item', body: {"fromBatchId":"fromBatchId-1","itemId":"itemId-1","toBatchId":"toBatchId-1","byUserId":"byUserId-1","byUserName":"byUserName-1"}, missing: null, args: ['fromBatchId-1', 'itemId-1', 'toBatchId-1', 'byUserId-1', 'byUserName-1'] },
  { name: 'startReconciliation', kind: 'result', verb: 'POST', path: '/api/batches/batch/start-reconciliation', body: {"batchId":"batchId-1","byUserId":"byUserId-1","byUserName":"byUserName-1"}, missing: null, args: ['batchId-1', 'byUserId-1', 'byUserName-1'] },
  { name: 'scanItemOut', kind: 'result', verb: 'POST', path: '/api/batches/batch/scan-item-out', body: {"batchId":"batchId-1","scannedValue":"scannedValue-1","byUserId":"byUserId-1","byUserName":"byUserName-1"}, missing: null, args: ['batchId-1', 'scannedValue-1', 'byUserId-1', 'byUserName-1'] },
  { name: 'completeReconciliation', kind: 'result', verb: 'POST', path: '/api/batches/batch/complete-reconciliation', body: {"batchId":"batchId-1"}, missing: null, args: ['batchId-1'] },
  { name: 'overrideAndComplete', kind: 'result', verb: 'POST', path: '/api/batches/batch/override-and-complete', body: {"batchId":"batchId-1","byUserId":"byUserId-1","byUserName":"byUserName-1","reason":"reason-1"}, missing: null, args: ['batchId-1', 'byUserId-1', 'byUserName-1', 'reason-1'] },
  { name: 'setColdChainExcursion', kind: 'result', verb: 'POST', path: '/api/batches/batch/set-cold-chain-excursion', body: {"batchId":"batchId-1","readingId":"readingId-1","temperatureCelsius":3,"detectedAt":"detectedAt-1"}, missing: null, args: ['batchId-1', 'readingId-1', 3, 'detectedAt-1'] },
  { name: 'acknowledgeColdChainExcursion', kind: 'result', verb: 'POST', path: '/api/batches/batch/acknowledge-cold-chain-excursion', body: {"batchId":"batchId-1","byUserId":"byUserId-1","byUserName":"byUserName-1","note":"note-1"}, missing: null, args: ['batchId-1', 'byUserId-1', 'byUserName-1', 'note-1'] },
  { name: 'setCytologyInstrumentStatus', kind: 'result', verb: 'POST', path: '/api/batches/batch/set-cytology-instrument-status', body: {"batchId":"batchId-1","status":"status-1"}, missing: null, args: ['batchId-1', 'status-1'] },
  { name: 'setStainingInstrumentStatus', kind: 'result', verb: 'POST', path: '/api/batches/batch/set-staining-instrument-status', body: {"batchId":"batchId-1","status":"status-1"}, missing: null, args: ['batchId-1', 'status-1'] },
  { name: 'confirmQcVisualRead', kind: 'result', verb: 'POST', path: '/api/batches/batch/confirm-qc-visual-read', body: {"batchId":"batchId-1","userId":"userId-1","userName":"userName-1"}, missing: null, args: ['batchId-1', 'userId-1', 'userName-1'] },
  { name: 'abort', kind: 'result', verb: 'POST', path: '/api/batches/batch/abort', body: {"batchId":"batchId-1","byUserId":"byUserId-1","byUserName":"byUserName-1","reason":"reason-1"}, missing: null, args: ['batchId-1', 'byUserId-1', 'byUserName-1', 'reason-1'] },
  { name: 'releaseRack', kind: 'result', verb: 'POST', path: '/api/batches/batch/release-rack', body: {"batchId":"batchId-1","byUserId":"byUserId-1","byUserName":"byUserName-1"}, missing: null, args: ['batchId-1', 'byUserId-1', 'byUserName-1'] },
  { name: 'transferToProcessing', kind: 'result', verb: 'POST', path: '/api/batches/batch/transfer-to-processing', body: {"batchId":"batchId-1","byUserId":"byUserId-1","byUserName":"byUserName-1"}, missing: null, args: ['batchId-1', 'byUserId-1', 'byUserName-1'] },
];
const okBody = (kind: string): unknown => (kind === 'list' ? { items: [{ id: 'r1' }] } : kind === 'done' ? {} : kind === 'value' ? { id: 'r1' } : kind === 'resultCustom' ? { ok: true, data: { id: 'r1' } } : { id: 'r1' });

describe('createHttpBatchService', () => {
  it('has a call for every method of the interface', () => {
    expect(Object.keys(svc(vi.fn())).sort()).toEqual(CALLS.map(c => c.name).sort());
  });
  it.each(CALLS)('$name sends $verb $path', async (c) => {
    const f = vi.fn().mockResolvedValue(reply(200, okBody(c.kind)));
    await call(f, c.name, c.args);
    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0][0]).toBe(`https://api.test${c.path}`);
    const init = f.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe(c.verb);
    if (c.body === undefined) expect(init.body === undefined || init.body === '{}').toBe(true);
    else expect(JSON.parse(init.body as string)).toEqual(c.body);
  });
  it.each(CALLS)('$name returns the data on success', async (c) => {
    const f = vi.fn().mockResolvedValue(reply(200, okBody(c.kind)));
    const r = await call(f, c.name, c.args);
    if (c.kind === 'result') expect(r).toMatchObject({ ok: true, data: { id: 'r1' } });
    else if (c.kind === 'list') expect(r).toEqual([{ id: 'r1' }]);
    else if (c.kind === 'done') expect(r).toBeUndefined();
    else if (c.kind === 'requiredOk') expect(r).toMatchObject({ ok: true });
    else if (c.kind === 'resultCustom') expect(r).toEqual({ ok: true, data: { id: 'r1' } });
    else expect(r).toEqual({ id: 'r1' });
  });
  it.each(CALLS)('$name turns a 403 and a 404 into fixed codes', async (c) => {
    const f = vi.fn().mockResolvedValueOnce(reply(403, { message: 'Smith, J. MRN 123' })).mockResolvedValueOnce(reply(404, {}));
    if (c.kind === 'result') {
      expect(await call(f, c.name, c.args)).toEqual({ ok: false, error: 'NOT_PERMITTED' });
      expect(await call(f, c.name, c.args)).toEqual({ ok: false, error: 'NOT_FOUND' });
    } else if (c.kind === 'resultCustom') {
      expect(await call(f, c.name, c.args)).toEqual({ ok: false, error: 'NOT_PERMITTED', code: 'NOT_PERMITTED' });
      expect(await call(f, c.name, c.args)).toEqual({ ok: false, error: 'NOT_FOUND', code: 'NOT_FOUND' });
    } else if (c.kind === 'list' || c.kind === 'value') {
      const fallback = c.kind === 'list' ? [] : c.missing;
      expect(await call(f, c.name, c.args)).toEqual(fallback);
      expect(await call(f, c.name, c.args)).toEqual(fallback);
    } else {
      expect(await rejection(call(f, c.name, c.args))).toBe('NOT_PERMITTED');
      expect(await rejection(call(f, c.name, c.args))).toBe('NOT_FOUND');
    }
  });
});
