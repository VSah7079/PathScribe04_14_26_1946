// src/services/cases/caseWriteConflictAudit.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-71 (Batch 450): CaseRouter.updateCase — the path the mock case services
// sit behind — writes a distinct case.write.conflict audit event on a
// version conflict (not a generic case.write failure), and mockCaseService's
// cross-mode update forwards expectedVersion to the Orchestration service.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, vi, afterEach } from 'vitest';

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => { store.clear(); },
};
// A pathologist (not superadmin, so the support-access gate is not involved).
store.set('pathscribe-user', JSON.stringify({ id: 'PS71-USER', role: 'pathologist' }));

const { caseRouter } = await import('./CaseRouter');
const { mockAuditService } = await import('../auditlog/mockAuditService');
const { mockOrchestratorCaseService } = await import('./mockOrchestratorCaseService');
const { updateCaseAnyMode } = await import('./mockCaseService');
const { ConcurrencyConflictError } = await import('./ConcurrencyConflictError');

let counter = 0;
function makeCase(prefix: string): any {
  counter += 1;
  return {
    id: `${prefix}${counter}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'draft',
    participants: [],
    synopticReports: [],
    specimens: [],
  };
}

const flush = () => new Promise(res => setTimeout(res, 50));

async function auditFor(caseId: string) {
  const res = await mockAuditService.getAuditLogs({ search: caseId });
  expect(res.ok).toBe(true);
  if (!res.ok) throw new Error('getAuditLogs failed');
  return res.data.filter(l => l.caseId === caseId);
}

afterEach(() => { vi.restoreAllMocks(); });

describe('PS-71 CaseRouter.updateCase audits a version conflict as case.write.conflict', () => {
  it.each([
    ['LIS (CoPilot) case', 'S26-PS71-', 'LIS'],
    ['Orchestration case', 'O26-PS71-', 'ORCH'],
  ])('%s: a stale expectedVersion throws ConcurrencyConflictError, writes nothing, and records a Case Write Conflict entry for the user', async (_label, prefix, serviceId) => {
    const c = makeCase(prefix);
    await caseRouter.createCase(c);
    await caseRouter.updateCase(c.id, { status: 'in-progress' } as any, 0); // version 0 -> 1

    const err = await caseRouter.updateCase(c.id, { status: 'finalizing' } as any, 0).catch(e => e);
    expect(err).toBeInstanceOf(ConcurrencyConflictError);
    expect(err.expectedVersion).toBe(0);
    expect(err.actualVersion).toBe(1);

    await flush();
    const entries = await auditFor(c.id);
    const conflicts = entries.filter(l => l.event === 'Case Write Conflict');
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].detail).toBe(`${serviceId} — Case Write Conflict — failure`);
    expect(conflicts[0].user).toBe('PS71-USER');
    // The conflict is not also logged as a generic write failure.
    expect(entries.some(l => l.event === 'Case Write' && l.detail.endsWith('failure'))).toBe(false);
    // The earlier, matching write was a plain success.
    expect(entries.some(l => l.event === 'Case Write' && l.detail.endsWith('success'))).toBe(true);
  });

  it('a non-conflict failure is a plain Case Write failure, not a conflict', async () => {
    const c = makeCase('O26-PS71-FAIL-');
    await caseRouter.createCase(c);
    vi.spyOn(mockOrchestratorCaseService, 'updateCase').mockRejectedValueOnce(new Error('disk full'));

    await expect(caseRouter.updateCase(c.id, { status: 'in-progress' } as any, 0)).rejects.toThrow(/CaseRouter.updateCase failed/);
    await flush();
    const entries = await auditFor(c.id);
    expect(entries.some(l => l.event === 'Case Write Conflict')).toBe(false);
    expect(entries.some(l => l.event === 'Case Write' && l.detail.endsWith('failure'))).toBe(true);
  });
});

describe('PS-71 mockCaseService forwards expectedVersion on the Orchestration path', () => {
  it('passes the caller\'s expectedVersion through to mockOrchestratorCaseService.updateCase', async () => {
    const spy = vi.spyOn(mockOrchestratorCaseService, 'updateCase').mockResolvedValue(undefined);
    await updateCaseAnyMode('O26-PS71-FWD-1', { status: 'in-progress' } as any, 7);
    expect(spy).toHaveBeenCalledWith('O26-PS71-FWD-1', { status: 'in-progress' }, 7);
  });

  it('a stale version on an Orchestration case is refused through the forwarded check, and the case is unchanged', async () => {
    const c = makeCase('O26-PS71-FWD-');
    await mockOrchestratorCaseService.createCase(c);
    await updateCaseAnyMode(c.id, { status: 'in-progress' } as any, 0); // -> version 1

    await expect(updateCaseAnyMode(c.id, { status: 'finalizing' } as any, 0)).rejects.toBeInstanceOf(ConcurrencyConflictError);
    const after = await mockOrchestratorCaseService.getCase(c.id);
    expect((after as any).status).toBe('in-progress');
    expect((after as any).version).toBe(1);
  });
});
