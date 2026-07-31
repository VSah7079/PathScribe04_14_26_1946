// src/services/cases/mockCaseServiceConcurrency.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real tests for the version compare-and-swap logic added to both mock case
// services (mockCaseService.ts for LIS/CoPilot-mode cases,
// mockOrchestratorCaseService.ts for Orchestration-mode cases) — the same
// contract as FirestoreCaseService.ts's transactional version, verified here
// since these are the services actually exercised in local dev today.
//
// This test environment is plain Node (see vitest.config.ts —
// environment: 'node'), and both services call localStorage.getItem()
// directly at module load time, unguarded. A real, working in-memory
// localStorage stub is installed before either module is imported so they
// genuinely read/write through it rather than crashing on import.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';

// ── Real, working in-memory localStorage stub ──────────────────────────────
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => { store.clear(); },
};

// Imported after the stub above so both services' module-level
// localStorage.getItem() calls succeed instead of throwing.
const { mockCaseService } = await import('./mockCaseService');
const { mockOrchestratorCaseService } = await import('./mockOrchestratorCaseService');
const { ConcurrencyConflictError } = await import('./ConcurrencyConflictError');

// Minimal valid-enough Case fixture — real field completeness isn't the
// point of this test, only updateCase's own version-handling logic is.
function makeCase(id: string): any {
  return {
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'draft',
    participants: [],
    synopticReports: [],
    specimens: [],
  };
}

describe.each([
  ['mockCaseService (LIS/CoPilot mode)', mockCaseService, 'LIS-CONC-'],
  ['mockOrchestratorCaseService (Orchestration mode)', mockOrchestratorCaseService, 'O26-CONC-'],
])('%s — updateCase version compare-and-swap', (_label, service: any, idPrefix) => {
  let counter = 0;
  const nextId = () => `${idPrefix}${++counter}`;

  it('a newly created case starts with no version field (undefined, treated as 0)', async () => {
    const id = nextId();
    await service.createCase(makeCase(id));
    const cases = await service.getAll();
    const created = cases.data.find((c: any) => c.id === id);
    expect(created.version).toBeUndefined();
  });

  it('no expectedVersion provided — writes unconditionally (backward compatible) and sets version to 1 on first write', async () => {
    const id = nextId();
    await service.createCase(makeCase(id));
    await service.updateCase(id, { status: 'in-progress' } as any);

    const cases = await service.getAll();
    const updated = cases.data.find((c: any) => c.id === id);
    expect(updated.status).toBe('in-progress');
    expect(updated.version).toBe(1);
  });

  it('expectedVersion matches — write succeeds and version increments by exactly 1', async () => {
    const id = nextId();
    await service.createCase(makeCase(id));
    await service.updateCase(id, { status: 'in-progress' } as any); // version -> 1

    await service.updateCase(id, { status: 'finalizing' } as any, 1); // matches current version 1

    const cases = await service.getAll();
    const updated = cases.data.find((c: any) => c.id === id);
    expect(updated.status).toBe('finalizing');
    expect(updated.version).toBe(2);
  });

  it('expectedVersion does NOT match — throws ConcurrencyConflictError and the write never happens', async () => {
    const id = nextId();
    await service.createCase(makeCase(id));
    await service.updateCase(id, { status: 'in-progress' } as any); // version -> 1
    await service.updateCase(id, { status: 'finalizing' } as any); // version -> 2, someone else's save

    // This caller still thinks it's at version 1 (stale) — should conflict
    // against the real current version (2), not silently overwrite it.
    await expect(
      service.updateCase(id, { status: 'draft' } as any, 1)
    ).rejects.toThrow(ConcurrencyConflictError);

    const cases = await service.getAll();
    const stillFinalizing = cases.data.find((c: any) => c.id === id);
    expect(stillFinalizing.status).toBe('finalizing'); // unchanged — the conflicting write never landed
    expect(stillFinalizing.version).toBe(2); // unchanged
  });

  it('a real conflict carries the expected and actual versions on the thrown error', async () => {
    const id = nextId();
    await service.createCase(makeCase(id));
    await service.updateCase(id, {} as any); // version -> 1
    await service.updateCase(id, {} as any); // version -> 2

    try {
      await service.updateCase(id, {} as any, 1);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConcurrencyConflictError);
      expect((err as InstanceType<typeof ConcurrencyConflictError>).expectedVersion).toBe(1);
      expect((err as InstanceType<typeof ConcurrencyConflictError>).actualVersion).toBe(2);
    }
  });

  it('an unrelated case is unaffected by a conflict on a different case (no shared/global lock)', async () => {
    const idA = nextId();
    const idB = nextId();
    await service.createCase(makeCase(idA));
    await service.createCase(makeCase(idB));
    await service.updateCase(idA, {} as any); // A -> version 1
    await service.updateCase(idB, {} as any); // B -> version 1

    // Conflict on A (stale expectedVersion 0)
    await expect(service.updateCase(idA, {} as any, 0)).rejects.toThrow(ConcurrencyConflictError);

    // B, a completely unrelated case, should still update normally
    await service.updateCase(idB, { status: 'finalizing' } as any, 1);
    const cases = await service.getAll();
    const updatedB = cases.data.find((c: any) => c.id === idB);
    expect(updatedB.status).toBe('finalizing');
    expect(updatedB.version).toBe(2);
  });
});
