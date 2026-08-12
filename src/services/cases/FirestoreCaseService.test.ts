// src/services/cases/FirestoreCaseService.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Covers the FirestoreCaseService.updateCase guard/transform behavior
// (dot-path flattening, order.* sub-field guard, top-level LIS_OWNED_FIELDS
// guard — unchanged in intent from before) PLUS the real transactional
// version compare-and-swap added for the Case Hydration & Optimistic
// Concurrency Control spec.
//
// The write path changed from a bare updateDoc() call to a real Firestore
// transaction (runTransaction) so the version check and the write happen
// atomically — every existing test below was rewritten to assert against
// the transaction's own update() call instead of the old updateDoc mock,
// since that's genuinely where the write happens now, not because the
// guard behavior itself changed.
//
// Written for Vitest (this is a Vite project — Vitest is the natural
// pairing and its API is close enough to Jest that this should need at
// most a find/replace on the `vi.` prefix if the project is actually on
// Jest instead).
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock the firebase/firestore SDK ─────────────────────────────────────────
// runTransaction is the one we actually exercise — it's mocked to genuinely
// invoke the callback it's given with a fake transaction object (get/update),
// the same way a real Firestore transaction would, rather than just
// resolving immediately and hiding what the service does inside it.
const docMock = vi.fn((_db: any, _collection: string, id: string) => ({ __path: `cases/${id}` }));

// Configurable per test — what the transaction's tx.get() should return.
let mockDocExists = true;
let mockDocData: Record<string, any> = { version: 3 };

const txGetMock = vi.fn(async () => ({
  exists: () => mockDocExists,
  data: () => mockDocData,
}));
const txUpdateMock = vi.fn();
const runTransactionMock = vi.fn(async (_db: any, updateFn: (tx: any) => Promise<void>) => {
  const tx = { get: txGetMock, update: txUpdateMock };
  return updateFn(tx);
});

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ __fakeDb: true })),
  collection: vi.fn(),
  doc: (db: any, collection: string, id: string) => docMock(db, collection, id),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  runTransaction: (...args: any[]) => runTransactionMock(args[0], args[1]),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  Timestamp: { now: vi.fn() },
}));

// ── Mock AuditLogger — spy on .log() without needing a real audit backend ──
const auditLogMock = vi.fn();
vi.mock('./AuditLogger', () => ({
  AuditLogger: class {
    log(event: any) { auditLogMock(event); }
  },
}));

// Imported after the mocks above so FirestoreCaseService picks up the
// mocked modules rather than the real firebase/firestore SDK.
const { firestoreCaseService } = await import('./FirestoreCaseService');
const { ConcurrencyConflictError } = await import('./ConcurrencyConflictError');

describe('FirestoreCaseService.updateCase — order-field guard', () => {
  beforeEach(() => {
    txGetMock.mockClear();
    txUpdateMock.mockClear();
    runTransactionMock.mockClear();
    auditLogMock.mockClear();
    mockDocExists = true;
    mockDocData = { version: 3 };
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('Test 1 — dot-path transformation & partial merge: order.assignedTo becomes a dot-path field, not a nested object', async () => {
    await firestoreCaseService.updateCase('C123', {
      order: { assignedTo: 'user456' } as any,
    });

    expect(txUpdateMock).toHaveBeenCalledTimes(1);
    const [, payload] = txUpdateMock.mock.calls[0];

    expect(payload).not.toHaveProperty('order');
    expect(payload['order.assignedTo']).toBe('user456');
    expect(payload.updatedAt).toEqual(expect.any(String));
  });

  it('also flattens assignedParticipationTypeId alongside assignedTo when both are present', async () => {
    await firestoreCaseService.updateCase('C123', {
      order: { assignedTo: 'user456', assignedParticipationTypeId: 'primary' } as any,
    });

    const [, payload] = txUpdateMock.mock.calls[0];
    expect(payload['order.assignedTo']).toBe('user456');
    expect(payload['order.assignedParticipationTypeId']).toBe('primary');
    expect(payload).not.toHaveProperty('order');
  });

  it('Test 2 — nested field guard: order.orderNumber is dropped, warned about, and never reaches the transaction', async () => {
    await firestoreCaseService.updateCase('C123', {
      order: { orderNumber: 'OVERWRITE_ATTEMPT' } as any,
    });

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('orderNumber')
    );
    const [, payload] = txUpdateMock.mock.calls[0];
    expect(payload).not.toHaveProperty('order');
    expect(payload).not.toHaveProperty('order.orderNumber');
    expect(JSON.stringify(payload)).not.toContain('OVERWRITE_ATTEMPT');
  });

  it('a mixed order payload keeps the allowed sub-field and drops the disallowed one in the same call', async () => {
    await firestoreCaseService.updateCase('C123', {
      order: { assignedTo: 'user456', orderNumber: 'OVERWRITE_ATTEMPT' } as any,
    });

    const [, payload] = txUpdateMock.mock.calls[0];
    expect(payload['order.assignedTo']).toBe('user456');
    expect(JSON.stringify(payload)).not.toContain('OVERWRITE_ATTEMPT');
  });

  it('Test 3 — top-level LIS_OWNED_FIELDS guard: patient is dropped and never reaches the transaction', async () => {
    await firestoreCaseService.updateCase('C123', {
      patient: { firstName: 'HACKED' } as any,
    });

    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('patient'));
    const [, payload] = txUpdateMock.mock.calls[0];
    expect(payload).not.toHaveProperty('patient');
    expect(JSON.stringify(payload)).not.toContain('HACKED');
  });

  it('every LIS_OWNED_FIELDS entry is dropped when present together', async () => {
    await firestoreCaseService.updateCase('C123', {
      patient: {} as any, specimens: [] as any, accession: {} as any,
      grossDescription: 'x', microscopicDescription: 'x', hospitalId: 'HOSP-999',
    } as any);

    const [, payload] = txUpdateMock.mock.calls[0];
    for (const field of ['patient', 'specimens', 'accession', 'grossDescription', 'microscopicDescription', 'hospitalId']) {
      expect(payload).not.toHaveProperty(field);
    }
  });

  it('records a success audit event for the write once guards have run', async () => {
    await firestoreCaseService.updateCase('C123', { order: { assignedTo: 'user456' } as any });

    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'case.write', caseId: 'C123', outcome: 'success' })
    );
  });

  it('allowed order fields pass through even when no other updates are present', async () => {
    await firestoreCaseService.updateCase('C123', {
      order: { assignedParticipationTypeId: 'primary' } as any,
    });

    const [, payload] = txUpdateMock.mock.calls[0];
    expect(payload['order.assignedParticipationTypeId']).toBe('primary');
  });
});

describe('FirestoreCaseService.updateCase — optimistic concurrency (version compare-and-swap)', () => {
  beforeEach(() => {
    txGetMock.mockClear();
    txUpdateMock.mockClear();
    runTransactionMock.mockClear();
    auditLogMock.mockClear();
    mockDocExists = true;
    mockDocData = { version: 3 };
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('no expectedVersion provided — writes unconditionally (backward compatible) and still increments version', async () => {
    mockDocData = { version: 5 };
    await firestoreCaseService.updateCase('C123', { updatedAt: 'ignored-will-be-overwritten' as any });

    expect(txUpdateMock).toHaveBeenCalledTimes(1);
    const [, payload] = txUpdateMock.mock.calls[0];
    expect(payload.version).toBe(6);
  });

  it('expectedVersion matches current version — write succeeds and version increments by exactly 1', async () => {
    mockDocData = { version: 3 };
    await firestoreCaseService.updateCase('C123', { flags: ['x'] } as any, 3);

    expect(txUpdateMock).toHaveBeenCalledTimes(1);
    const [, payload] = txUpdateMock.mock.calls[0];
    expect(payload.version).toBe(4);
  });

  it('expectedVersion does NOT match current version — throws ConcurrencyConflictError and never writes', async () => {
    mockDocData = { version: 7 };
    await expect(
      firestoreCaseService.updateCase('C123', { flags: ['x'] } as any, 3)
    ).rejects.toThrow(ConcurrencyConflictError);

    expect(txUpdateMock).not.toHaveBeenCalled();
  });

  it('a real conflict carries the expected and actual versions on the thrown error', async () => {
    mockDocData = { version: 9 };
    try {
      await firestoreCaseService.updateCase('C123', {}, 4);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConcurrencyConflictError);
      expect((err as InstanceType<typeof ConcurrencyConflictError>).expectedVersion).toBe(4);
      expect((err as InstanceType<typeof ConcurrencyConflictError>).actualVersion).toBe(9);
    }
  });

  it('a real conflict logs a distinct case.write.conflict audit event, not a generic write failure', async () => {
    mockDocData = { version: 9 };
    await expect(
      firestoreCaseService.updateCase('C123', {}, 4)
    ).rejects.toThrow(ConcurrencyConflictError);

    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'case.write.conflict', caseId: 'C123', outcome: 'failure' })
    );
    expect(auditLogMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'case.write', outcome: 'failure' })
    );
  });

  it('a case with no version field yet (legacy/pre-versioning data) is treated as version 0, not a crash', async () => {
    mockDocData = {};
    await firestoreCaseService.updateCase('C123', { flags: ['x'] } as any, 0);

    expect(txUpdateMock).toHaveBeenCalledTimes(1);
    const [, payload] = txUpdateMock.mock.calls[0];
    expect(payload.version).toBe(1);
  });

  it("a case that doesn't exist yet is treated as version 0 inside the transaction", async () => {
    mockDocExists = false;
    await firestoreCaseService.updateCase('C_NEW', { flags: ['x'] } as any, 0);

    expect(txUpdateMock).toHaveBeenCalledTimes(1);
    const [, payload] = txUpdateMock.mock.calls[0];
    expect(payload.version).toBe(1);
  });
});
