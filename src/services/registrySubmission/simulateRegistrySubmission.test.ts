import { describe, it, expect, beforeEach, vi } from 'vitest';
const store = new Map<string, string>();
vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); }, clear: () => store.clear() });

describe('simulated registry submission', () => {
  beforeEach(() => { store.clear(); vi.resetModules(); });
  it('marks queued reports sent, then awaiting an answer, with a PHI-free audit entry', async () => {
    const { mockCancerRegistryOutboundQueueService: q } = await import('../cancerRegistry/mockCancerRegistryOutboundQueueService');
    const { mockAuditService } = await import('../auditlog/mockAuditService');
    const spy = vi.spyOn(mockAuditService, 'logEvent');
    await q.enqueue({ caseId: 'C-9', registryId: 'REG-1' } as never);
    const { submitQueuedRegistryReportsSimulated, listCaseRegistryReports } = await import('./simulateRegistrySubmission');
    const r = await submitQueuedRegistryReportsSimulated('C-9');
    expect(r.submitted).toBe(1);
    const after = await listCaseRegistryReports('C-9');
    expect(after[0]).toMatchObject({ status: 'SENT', registryStatus: 'awaitingAck' });
    const ev = spy.mock.calls.map(c => c[0]).find(e => e.event === 'Simulated Registry Submission');
    expect(ev?.detail).toContain('SIMULATED');
    expect(await submitQueuedRegistryReportsSimulated('C-9')).toEqual({ submitted: 0, held: 0 });
  });
});
