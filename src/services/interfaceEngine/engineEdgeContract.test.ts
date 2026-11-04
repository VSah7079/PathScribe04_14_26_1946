import { describe, expect, it } from 'vitest';
import {
  ENGINE_HEALTH_LIMITS, INBOUND_RESPONSES, engineActionForStatus, engineStatus, inboundIdempotencyKey, inboundRetryExpired,
  outboundOutcomeForAck, processingIdProblem, updateStaleness, type EngineHeartbeat,
} from './engineEdgeContract';

// Batch 545 (PS-539 phase 2c): the engine ↔ API contract (INTERFACE_ENGINE_EDGE.md).
describe('inbound: what the engine does with each answer', () => {
  it('each named outcome has one status, and the engine reads that status the same way', () => {
    for (const { status, action } of Object.values(INBOUND_RESPONSES)) expect(engineActionForStatus(status)).toBe(action);
  });
  it('success acks; not-yet and server errors retry; a refusal dead-letters', () => {
    expect(engineActionForStatus(201)).toBe('ack');
    for (const s of [408, 409, 425, 429, 500, 502, 503]) expect(engineActionForStatus(s), String(s)).toBe('retry');
    for (const s of [400, 413, 415, 422]) expect(engineActionForStatus(s), String(s)).toBe('deadLetter');
  });
  it('a 401 gets a new token first; 403 and a proxy\'s 407 pause the channel', () => {
    expect(engineActionForStatus(401)).toBe('reauthenticate');
    expect(engineActionForStatus(403)).toBe('stopAndAlert');
    expect(engineActionForStatus(407)).toBe('stopAndAlert');
  });
  it('a 404 is "not there yet" only on today\'s webhooks; on the API it is a wrong address', () => {
    expect(engineActionForStatus(404, { legacyWebhook: true })).toBe('retry');
    expect(engineActionForStatus(404)).toBe('stopAndAlert');
  });
  it('a message retried for longer than the limit is dead-lettered, so it cannot hold its key for ever', () => {
    const now = new Date('2026-10-14T12:00:00Z');
    expect(inboundRetryExpired('2026-10-13T11:59:00Z', now)).toBe(true);
    expect(inboundRetryExpired('2026-10-13T12:01:00Z', now)).toBe(false);
  });
  it('a message is applied once per tenant, sending system and MSH-10, and parts cannot run together', () => {
    const k = inboundIdempotencyKey({ tenantId: 'ORG-MFT', sourceSystem: 'EPIC|MFT', messageControlId: ' 123 ' });
    expect(k).toBe(inboundIdempotencyKey({ tenantId: 'ORG-MFT', sourceSystem: 'EPIC|MFT', messageControlId: '123' }));
    expect(inboundIdempotencyKey({ tenantId: 'ORG-DVMC', sourceSystem: 'EPIC|MFT', messageControlId: '123' })).not.toBe(k);
    expect(inboundIdempotencyKey({ tenantId: 'ORG-MFT', sourceSystem: 'EPIC', messageControlId: 'MFT|123' })).not.toBe(k);
  });
});

describe('stale updates: by the messages\' own event times', () => {
  it('older than the last applied message is stale; equal or newer is current', () => {
    expect(updateStaleness('2026-10-13T10:00:00Z', '2026-10-13T11:00:00Z')).toBe('stale');
    expect(updateStaleness('2026-10-13T11:00:00Z', '2026-10-13T11:00:00Z')).toBe('current');
    expect(updateStaleness('2026-10-13T12:00:00+01:00', '2026-10-13T10:30:00Z')).toBe('current');
    expect(updateStaleness('2026-10-13T12:00:00Z', undefined)).toBe('current');
  });
  it('a time without an offset, or not a time, is refused rather than guessed', () => {
    expect(updateStaleness('2026-10-13T12:00:00', '2026-10-13T11:00:00Z')).toBe('invalid');
    expect(updateStaleness('yesterday', undefined)).toBe('invalid');
  });
});

describe('processing ID (MSH-11) against the instance', () => {
  it('production takes only P; a validation instance never takes P', () => {
    expect(processingIdProblem('P', 'production')).toBeNull();
    expect(processingIdProblem('T', 'production')).toBe('PROCESSING_ID_NOT_PRODUCTION');
    expect(processingIdProblem('T', 'validation')).toBeNull();
    expect(processingIdProblem('P', 'validation')).toBe('PRODUCTION_MESSAGE_ON_VALIDATION');
  });
});

describe('outbound: what an ACK means', () => {
  it('AA sent; CA sent unless an application ACK was asked for', () => {
    expect(outboundOutcomeForAck('AA')).toBe('sent');
    expect(outboundOutcomeForAck('CA')).toBe('sent');
    expect(outboundOutcomeForAck('CA', true)).toBe('awaitingApplicationAck');
  });
  it('no answer, AR and CE retry (often temporary); AE and CR fail at once (a person corrects and resends)', () => {
    for (const c of [null, 'AR', 'CE'] as const) expect(outboundOutcomeForAck(c)).toBe('retry');
    for (const c of ['AE', 'CR'] as const) expect(outboundOutcomeForAck(c)).toBe('failed');
  });
});

describe('engine status from its heartbeat (the same in the cloud and on site, D6)', () => {
  const now = new Date('2026-10-13T12:00:00Z');
  const at = (secondsAgo: number) => new Date(now.getTime() - secondsAgo * 1000).toISOString();
  const hb = (over: Partial<EngineHeartbeat> = {}, channel: Partial<EngineHeartbeat['channels'][number]> = {}) => ({
    receivedAt: at(30),
    heartbeat: {
      v: 1, engineInstanceId: 'e1', hosting: 'onsite', imageVersion: '1.0.0', apiReachable: true, diskFreePercent: 60,
      channels: [{ channelId: 'adt-in', direction: 'inbound', state: 'started', queued: 0, deadLetters: 0, ...channel }], ...over,
    } as EngineHeartbeat,
  });
  it('online when recent and healthy, hosted or on site', () => {
    expect(engineStatus(hb(), now)).toBe('online');
    expect(engineStatus(hb({ hosting: 'cloud' }), now)).toBe('online');
  });
  it('offline with no heartbeat, or none received for three intervals (the server\'s clock, not the engine\'s)', () => {
    expect(engineStatus(undefined, now)).toBe('offline');
    expect(engineStatus({ ...hb(), receivedAt: at(ENGINE_HEALTH_LIMITS.offlineAfterSeconds + 1) }, now)).toBe('offline');
  });
  it('degraded when a channel errs or is paused, a message waits too long, the API is unreachable, disk is low or a certificate is near expiry', () => {
    expect(engineStatus(hb({}, { state: 'error' }), now)).toBe('degraded');
    expect(engineStatus(hb({}, { state: 'paused' }), now)).toBe('degraded');
    // Batch 554: a stopped listener, and times that can't be read.
    expect(engineStatus(hb({}, { state: 'stopped' }), now)).toBe('degraded');
    expect(engineStatus({ ...hb(), receivedAt: 'not a date' }, now)).toBe('offline');
    expect(engineStatus(hb(), new Date('nope'))).toBe('offline');
    expect(engineStatus(hb({}, { queued: 3, oldestQueuedAgeSeconds: 16 * 60 }), now)).toBe('degraded');
    expect(engineStatus(hb({ apiReachable: false }), now)).toBe('degraded');
    expect(engineStatus(hb({ diskFreePercent: 5 }), now)).toBe('degraded');
    expect(engineStatus(hb({ certExpiresAt: '2026-10-20T00:00:00Z' }), now)).toBe('degraded');
    expect(engineStatus(hb({}, { queued: 3, oldestQueuedAgeSeconds: 60 }), now)).toBe('online');
  });
  it('dead letters alone show as needing attention, so a new fault still shows as degraded', () => {
    expect(engineStatus(hb({}, { deadLetters: 2 }), now)).toBe('attention');
    expect(engineStatus(hb({ apiReachable: false }, { deadLetters: 2 }), now)).toBe('degraded');
  });
});
