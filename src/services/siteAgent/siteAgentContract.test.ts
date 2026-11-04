import { describe, expect, it } from 'vitest';
import {
  AGENT_HEALTH_LIMITS, agentFailureRetriable, agentStatus, certificateNeedsRenewal, clockOffsetMs, fileIsStable, ipv4InCidr, isNewerVersion,
  jobStartable, pickupIdempotencyKey, printerOutsideAllowList, shareWithinRoots,
  type AgentErrorCode, type AgentHeartbeat,
} from './siteAgentContract';

// Batch 546 (PS-539 phase 2c, decision D3): the site agent contract (SITE_AGENT_API.md).
const now = new Date('2026-10-13T12:00:00Z');
const at = (secondsAgo: number) => new Date(now.getTime() - secondsAgo * 1000).toISOString();

describe('enrolment', () => {
  it('the certificate is renewed 30 days before it expires', () => {
    expect(certificateNeedsRenewal('2026-11-12T12:00:00Z', now)).toBe(true);
    expect(certificateNeedsRenewal('2026-11-13T12:00:01Z', now)).toBe(false);
  });
});

describe('jobs', () => {
  it('a job past its expiry is not started, judged on the server\'s clock', () => {
    expect(jobStartable({ expiresAt: at(-60) }, now)).toBe(true);
    expect(jobStartable({ expiresAt: at(1) }, now)).toBe(false);
    // The agent's clock runs 5 minutes slow: the job sent at server 12:05 expiring 12:06 has not expired at agent 12:00:30.
    const offset = clockOffsetMs('2026-10-13T12:05:00Z', now);
    expect(jobStartable({ expiresAt: '2026-10-13T12:06:00Z' }, new Date(now.getTime() + 30_000), offset)).toBe(true);
    expect(jobStartable({ expiresAt: '2026-10-13T12:06:00Z' }, new Date(now.getTime() + 90_000), offset)).toBe(false);
  });
  it('temporary faults are retried; a refusal, a bad file, a denied share or an unknown destination go straight to the exception queue', () => {
    const retried: AgentErrorCode[] = ['PRINTER_UNREACHABLE', 'PAPER_OUT', 'RIBBON_OUT', 'HEAD_OPEN', 'DOCUMENT_UNAVAILABLE', 'SHARE_UNREACHABLE', 'SHARE_FULL', 'AGENT_ERROR'];
    const final: AgentErrorCode[] = ['PRINTER_REJECTED', 'DOCUMENT_INTEGRITY', 'SHARE_ACCESS_DENIED', 'UNKNOWN_DESTINATION', 'EXPIRED'];
    for (const c of retried) expect(agentFailureRetriable(c, 'print.report'), c).toBe(true);
    for (const c of [...final, 'MALFORMED_ZPL', 'INVALID_GS1', 'IN_DOUBT'] as AgentErrorCode[]) expect(agentFailureRetriable(c, 'print.report'), c).toBe(false);
  });
  it('a label is never retried by itself (manual Retry only), so it cannot print twice', () => {
    for (const c of ['PRINTER_UNREACHABLE', 'PAPER_OUT', 'AGENT_ERROR'] as AgentErrorCode[]) expect(agentFailureRetriable(c, 'print.label'), c).toBe(false);
  });
});

describe('the local allow-list (set by the hospital at installation)', () => {
  const allow = { printerSubnets: ['10.20.30.0/24'], printerPorts: [9100, 515, 631, 443] };
  it('refuses a printer outside the allowed subnets or ports', () => {
    expect(printerOutsideAllowList({ host: '10.20.30.44', port: 9100 }, allow)).toBeNull();
    expect(printerOutsideAllowList({ host: '10.20.31.44', port: 9100 }, allow)).toBe('SUBNET');
    expect(printerOutsideAllowList({ host: '10.20.30.44', port: 22 }, allow)).toBe('PORT');
    expect(ipv4InCidr('10.0.0.1', '0.0.0.0/0')).toBe(true);
    expect(ipv4InCidr('10.0.0.256', '10.0.0.0/8')).toBe(false);
  });
  it('a share must sit under an allowed root, by whole folder, with no ".."', () => {
    const roots = ['\\\\fileserver\\pathology$'];
    expect(shareWithinRoots('\\\\FileServer\\Pathology$\\inbound', roots)).toBe(true);
    expect(shareWithinRoots('\\\\fileserver\\pathology$-other', roots)).toBe(false);
    expect(shareWithinRoots('\\\\fileserver\\pathology$\\..\\hr', roots)).toBe(false);
    expect(shareWithinRoots('C:\\temp', roots)).toBe(false);
  });
});

describe('file-share pickup', () => {
  const obs = (size: number, secondsAgo: number, modifiedAt = '2026-10-13T11:00:00Z') => ({ size, modifiedAt, observedAt: at(secondsAgo) });
  it('a file is handed over once per content and modified time, so a fixed-name daily file is still taken', () => {
    const f = { shareId: 's1', fileName: 'ORDERS.csv', size: 10, sha256: 'ab', modifiedAt: '2026-10-13T01:00:00Z' };
    expect(pickupIdempotencyKey(f)).toBe(pickupIdempotencyKey({ ...f, fileName: 'orders.CSV' }));
    expect(pickupIdempotencyKey({ ...f, modifiedAt: '2026-10-14T01:00:00Z' })).not.toBe(pickupIdempotencyKey(f));
  });
  it('a file is taken only once it has stopped changing for long enough', () => {
    expect(fileIsStable([obs(10, 40), obs(10, 0)], 30)).toBe(true);
    expect(fileIsStable([obs(10, 20), obs(10, 0)], 30)).toBe(false);
    expect(fileIsStable([obs(10, 40), obs(12, 0)], 30)).toBe(false);
    expect(fileIsStable([obs(10, 40), obs(10, 0, '2026-10-13T11:59:59Z')], 30)).toBe(false);
    expect(fileIsStable([obs(10, 40)], 30)).toBe(false);
  });
});

describe('updates', () => {
  it('compares dotted versions numerically', () => {
    expect(isNewerVersion('1.10.0', '1.9.3')).toBe(true);
    expect(isNewerVersion('1.2', '1.2.0')).toBe(false);
    expect(isNewerVersion('1.2.0', '1.2.1')).toBe(false);
    expect(isNewerVersion('1.3.0-rc', '1.2.0')).toBe(false);
  });
});

describe('agent status from its heartbeat', () => {
  const hb = (over: Partial<AgentHeartbeat> = {}) => ({
    receivedAt: at(20),
    heartbeat: {
      v: 1, agentVersion: '1.0.0', queuedJobs: 0, unsentResults: 0, certExpiresAt: '2027-01-01T00:00:00Z', diskFreePercent: 50,
      printers: [{ destinationId: 'p1', reachable: true, pendingJobs: 0 }], shares: [{ shareId: 's1', reachable: true, pendingJobs: 0 }], ...over,
    } as AgentHeartbeat,
  });
  it('online when recent and everything is reachable', () => expect(agentStatus(hb(), now)).toBe('online'));
  it('offline with no heartbeat for three intervals, by the server\'s clock', () => {
    expect(agentStatus(undefined, now)).toBe('offline');
    expect(agentStatus({ ...hb(), receivedAt: at(AGENT_HEALTH_LIMITS.offlineAfterSeconds + 1) }, now)).toBe('offline');
  });
  it('degraded when a printer or share is unreachable, a job waits too long, disk is low or the certificate is near expiry', () => {
    expect(agentStatus(hb({ printers: [{ destinationId: 'p1', reachable: false, pendingJobs: 1, lastErrorCode: 'PRINTER_UNREACHABLE' }] }), now)).toBe('degraded');
    expect(agentStatus(hb({ shares: [{ shareId: 's1', reachable: false, pendingJobs: 2 }] }), now)).toBe('degraded');
    expect(agentStatus(hb({ queuedJobs: 2, oldestQueuedAgeSeconds: 11 * 60 }), now)).toBe('degraded');
    expect(agentStatus(hb({ diskFreePercent: 5 }), now)).toBe('degraded');
    expect(agentStatus(hb({ certExpiresAt: '2026-10-20T00:00:00Z' }), now)).toBe('degraded');
  });
  it('a printer switched off with nothing waiting for it is not a fault', () => {
    expect(agentStatus(hb({ printers: [{ destinationId: 'p1', reachable: false, pendingJobs: 0 }] }), now)).toBe('online');
  });
});
