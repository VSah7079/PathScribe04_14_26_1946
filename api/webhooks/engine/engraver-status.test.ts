import { describe, it, expect, vi, beforeEach } from 'vitest';

const { verifyEngineAuth, upsertEngraverStatus, logIntegrationError } = vi.hoisted(() => ({
  verifyEngineAuth: vi.fn(),
  upsertEngraverStatus: vi.fn(),
  logIntegrationError: vi.fn(),
}));

vi.mock('./_lib/verifyEngineAuth', () => ({ verifyEngineAuth }));
vi.mock('./_lib/upsertEngraverStatus', () => ({ upsertEngraverStatus }));
vi.mock('./_lib/logIntegrationError', () => ({ logIntegrationError }));

import handler from './engraver-status';

const validPayload = {
  messageId: 'msg-1', timestamp: '2026-01-01T00:00:00Z', organisationId: 'ORG-MFT',
  deviceId: 'ENG-NY-04', deviceName: 'Grossing Bench 01', status: 'warning',
  supplyWarnings: [{ code: 'CASSETTE_SUPPLY_LOW', colorKey: 'COLOR_BIOPSY' }], sourceSystem: 'CASSETTE_ENGINE',
};

function makeRequest(body: unknown, method = 'POST'): Request {
  return new Request('https://example.com/api/webhooks/engine/engraver-status', {
    method, headers: { 'x-api-key': 'real-secret' }, body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
}

describe('engraver-status webhook handler', () => {
  beforeEach(() => {
    verifyEngineAuth.mockReset();
    upsertEngraverStatus.mockReset();
    logIntegrationError.mockReset();
    verifyEngineAuth.mockReturnValue({ ok: true });
    upsertEngraverStatus.mockResolvedValue('applied');
  });

  it('rejects a non-POST method with 405', async () => {
    expect((await handler(makeRequest(null, 'GET'))).status).toBe(405);
  });

  it('rejects a failed auth check with 401', async () => {
    verifyEngineAuth.mockReturnValue({ ok: false, reason: 'bad secret' });
    expect((await handler(makeRequest(validPayload))).status).toBe(401);
  });

  it('rejects a payload with an invalid status value with 400', async () => {
    expect((await handler(makeRequest({ ...validPayload, status: 'not-a-real-status' }))).status).toBe(400);
  });

  it('rejects a payload with an invalid supplyWarnings code with 400', async () => {
    const res = await handler(makeRequest({ ...validPayload, supplyWarnings: [{ code: 'NOT_A_REAL_CODE' }] }));
    expect(res.status).toBe(400);
    expect(logIntegrationError).toHaveBeenCalledWith(expect.objectContaining({ category: 'PAYLOAD_VALIDATION_FAILED', httpStatus: 400, eventType: 'engraver-status' }));
  });

  it('accepts a payload with no supplyWarnings at all', async () => {
    const { supplyWarnings, ...rest } = validPayload as any;
    const res = await handler(makeRequest(rest));
    expect(res.status).toBe(200);
  });

  it('rejects a payload missing required fields with 400', async () => {
    expect((await handler(makeRequest({ messageId: 'msg-1' }))).status).toBe(400);
  });

  it('returns 200 already-processed on a redelivered messageId (Batch 549: the claim is checked inside the status update)', async () => {
    upsertEngraverStatus.mockResolvedValue('already-processed');
    const res = await handler(makeRequest(validPayload));
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe('already-processed');
    expect(upsertEngraverStatus).toHaveBeenCalledWith(expect.anything(), { messageId: validPayload.messageId, eventType: 'engraver-status' });
  });

  it('applies a real status update and returns 200', async () => {
    const res = await handler(makeRequest(validPayload));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('applied');
    expect(upsertEngraverStatus).toHaveBeenCalledWith(expect.objectContaining({ deviceId: 'ENG-NY-04', status: 'warning' }), expect.objectContaining({ eventType: 'engraver-status' }));
  });

  it('surfaces a stale-ignored outcome from upsertEngraverStatus rather than reporting it as applied', async () => {
    upsertEngraverStatus.mockResolvedValue('stale-ignored');
    const res = await handler(makeRequest(validPayload));
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe('stale-ignored');
  });

  it('returns 500 on an unexpected internal error', async () => {
    upsertEngraverStatus.mockRejectedValue(new Error('Firestore is down'));
    expect((await handler(makeRequest(validPayload))).status).toBe(500);
  });
});
