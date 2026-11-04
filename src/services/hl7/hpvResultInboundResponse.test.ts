import { describe, it, expect } from 'vitest';
import { hpvResultInboundResponse } from './hpvResultInboundResponse';
import { INBOUND_RESPONSES } from '../interfaceEngine/engineEdgeContract';

describe('hpvResultInboundResponse (PS-174)', () => {
  it('applied and a redelivery are both acknowledged (200)', () => {
    expect(hpvResultInboundResponse({ outcome: 'applied' }).outcome).toBe('applied');
    expect(hpvResultInboundResponse({ outcome: 'already-applied' }).outcome).toBe('duplicate');
    expect(INBOUND_RESPONSES.duplicate.status).toBe(200);
  });

  it('a result that beats its order into PathScribe is retried, not refused', () => {
    const r = hpvResultInboundResponse({ outcome: 'case-not-found' });
    expect(r.outcome).toBe('retryLater');
    expect(INBOUND_RESPONSES[r.outcome]).toEqual({ status: 409, action: 'retry' });
  });

  it('a wrong specimen letter and a malformed result are refused with an AE and plain English, no patient data', () => {
    for (const outcome of ['specimen-not-found', 'invalid-payload'] as const) {
      const r = hpvResultInboundResponse({ outcome });
      expect(r.outcome).toBe('rejected');
      expect(r.rejection?.hl7Ack).toBe('AE');
      expect(r.rejection?.code).toMatch(/^HPV_/);
      expect(INBOUND_RESPONSES.rejected.status).toBe(422);
    }
  });
});
