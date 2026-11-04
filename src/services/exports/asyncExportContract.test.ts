// src/services/exports/asyncExportContract.test.ts
// Batch 542 (PS-539 phase 2c, D7): the asynchronous export contract's rules.
import { describe, it, expect } from 'vitest';
import { canTransition, downloadRefusal, EXPORT_KINDS, EXPORT_LIMITS, exportExpiresAt, exportKindFor, type ExportStatus } from './asyncExportContract';

describe('asyncExportContract', () => {
  it('each kind is named after its capability (domain:object:export → domain.object)', () => {
    for (const [kind, def] of Object.entries(EXPORT_KINDS)) {
      const [domain, object, verb] = def.capability.split(':');
      expect(verb, kind).toBe('export');
      expect(kind).toBe(`${domain}.${object}`);
      expect(exportKindFor(def.capability)).toBe(kind);
    }
    expect(exportKindFor('qa:deficiencies:view')).toBeUndefined();
  });

  it('statuses only move forward; finished states are final', () => {
    expect(canTransition('queued', 'running')).toBe(true);
    expect(canTransition('running', 'ready')).toBe(true);
    expect(canTransition('ready', 'expired')).toBe(true);
    const final: ExportStatus[] = ['failed', 'cancelled', 'expired'];
    for (const f of final) for (const to of ['queued', 'running', 'ready'] as ExportStatus[]) expect(canTransition(f, to)).toBe(false);
    expect(canTransition('ready', 'running')).toBe(false);
  });

  it('a file is kept 7 days by default, at least 1 and at most 30', () => {
    expect(exportExpiresAt('2026-10-13T00:00:00.000Z')).toBe('2026-10-20T00:00:00.000Z');
    expect(exportExpiresAt('2026-10-13T00:00:00.000Z', 0)).toBe('2026-10-14T00:00:00.000Z');
    expect(exportExpiresAt('2026-10-13T00:00:00.000Z', 90)).toBe(new Date(Date.parse('2026-10-13T00:00:00.000Z') + EXPORT_LIMITS.maxRetentionDays * 86_400_000).toISOString());
  });

  it('only the requester downloads, only when ready and not expired', () => {
    const job = { status: 'ready' as const, expiresAt: '2026-10-20T00:00:00.000Z', requestedBy: { userId: 'u1', userName: 'A' } };
    const now = new Date('2026-10-14T00:00:00.000Z');
    expect(downloadRefusal(job, 'u1', now)).toBeNull();
    expect(downloadRefusal(job, 'u2', now)).toBe('notRequester');
    expect(downloadRefusal(job, 'u1', new Date('2026-10-21T00:00:00.000Z'))).toBe('expired');
    expect(downloadRefusal({ ...job, status: 'running' }, 'u1', now)).toBe('notReady');
  });
});
