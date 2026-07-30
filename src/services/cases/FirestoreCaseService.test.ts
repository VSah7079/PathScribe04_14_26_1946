// src/services/cases/FirestoreCaseService.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Covers the three scenarios from the FirestoreCaseService.updateCase order-
// field guard review: dot-path flattening + partial merge, the nested
// order.* sub-field guard, and the pre-existing top-level LIS_OWNED_FIELDS
// guard. All three exist specifically to prevent silent data loss / LIS
// metadata corruption in a clinical system, so they're tested directly
// against the real function rather than just verified by inspection.
//
// Written for Vitest (this is a Vite project — Vitest is the natural
// pairing and its API is close enough to Jest that this should need at
// most a find/replace on the `vi.` prefix if the project is actually on
// Jest instead).
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock the firebase/firestore SDK ─────────────────────────────────────────
// updateDoc is the one call we actually assert against; the rest are
// stubbed just so the module imports without throwing (FirestoreCaseService
// pulls in collection/getDoc/getDocs/setDoc/query/where/orderBy/Timestamp
// even though updateCase itself only touches doc/updateDoc/getFirestore).
const updateDocMock = vi.fn().mockResolvedValue(undefined);
const docMock = vi.fn((_db: any, _collection: string, id: string) => ({ __path: `cases/${id}` }));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ __fakeDb: true })),
  collection: vi.fn(),
  doc: (db: any, collection: string, id: string) => docMock(db, collection, id),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: (...args: any[]) => updateDocMock(...args),
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

describe('FirestoreCaseService.updateCase — order-field guard', () => {
  beforeEach(() => {
    updateDocMock.mockClear();
    auditLogMock.mockClear();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('Test 1 — dot-path transformation & partial merge: order.assignedTo becomes a dot-path field, not a nested object', async () => {
    await firestoreCaseService.updateCase('C123', {
      order: { assignedTo: 'user456' } as any,
    });

    expect(updateDocMock).toHaveBeenCalledTimes(1);
    const [, payload] = updateDocMock.mock.calls[0];

    // The critical assertion: 'order' itself must NOT appear as a plain
    // nested-object key in the payload — that's exactly the shape that
    // would make Firestore replace the whole map and wipe every other
    // order field. Only the dot-path form should be present.
    expect(payload).not.toHaveProperty('order');
    expect(payload['order.assignedTo']).toBe('user456');
    expect(payload.updatedAt).toEqual(expect.any(String));
  });

  it('also flattens assignedParticipationTypeId alongside assignedTo when both are present', async () => {
    await firestoreCaseService.updateCase('C123', {
      order: { assignedTo: 'user456', assignedParticipationTypeId: 'primary' } as any,
    });

    const [, payload] = updateDocMock.mock.calls[0];
    expect(payload['order.assignedTo']).toBe('user456');
    expect(payload['order.assignedParticipationTypeId']).toBe('primary');
    expect(payload).not.toHaveProperty('order');
  });

  it('Test 2 — nested field guard: order.orderNumber is dropped, warned about, and never reaches updateDoc', async () => {
    await firestoreCaseService.updateCase('C123', {
      order: { orderNumber: 'OVERWRITE_ATTEMPT' } as any,
    });

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('orderNumber') // the warning lists bare sub-field names, e.g. "[orderNumber]", not dot-prefixed
    );
    const [, payload] = updateDocMock.mock.calls[0];
    expect(payload).not.toHaveProperty('order');
    expect(payload).not.toHaveProperty('order.orderNumber');
    expect(JSON.stringify(payload)).not.toContain('OVERWRITE_ATTEMPT');
  });

  it('a mixed order payload keeps the allowed sub-field and drops the disallowed one in the same call', async () => {
    await firestoreCaseService.updateCase('C123', {
      order: { assignedTo: 'user456', orderNumber: 'OVERWRITE_ATTEMPT' } as any,
    });

    const [, payload] = updateDocMock.mock.calls[0];
    expect(payload['order.assignedTo']).toBe('user456');
    expect(JSON.stringify(payload)).not.toContain('OVERWRITE_ATTEMPT');
  });

  it('Test 3 — top-level LIS_OWNED_FIELDS guard: patient is dropped and never reaches updateDoc', async () => {
    await firestoreCaseService.updateCase('C123', {
      patient: { firstName: 'HACKED' } as any,
    });

    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('patient'));
    const [, payload] = updateDocMock.mock.calls[0];
    expect(payload).not.toHaveProperty('patient');
    expect(JSON.stringify(payload)).not.toContain('HACKED');
  });

  it('every LIS_OWNED_FIELDS entry is dropped when present together', async () => {
    await firestoreCaseService.updateCase('C123', {
      patient: {} as any, specimens: [] as any, accession: {} as any,
      grossDescription: 'x', microscopicDescription: 'x', hospitalId: 'HOSP-999',
    } as any);

    const [, payload] = updateDocMock.mock.calls[0];
    for (const field of ['patient', 'specimens', 'accession', 'grossDescription', 'microscopicDescription', 'hospitalId']) {
      expect(payload).not.toHaveProperty(field);
    }
  });

  it('records a success audit event for the write once guards have run', async () => {
    await firestoreCaseService.updateCase('C123', { order: { assignedTo: 'user456' } as any });

    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'case.write', caseId: 'C123', outcome: 'success' })
    );
    // NOTE — precision flag, not a bug: blocked-field attempts (Test 2/
    // Test 3 above) only reach console.warn, not a distinct audit-trail
    // event. The audit.log call above fires for the overall write's
    // success/failure regardless of whether fields were stripped from
    // it — there's no separate "security block" audit entry today. If a
    // real audit-trail record of blocked-field attempts is wanted (not
    // just a console warning), that's a deliberate enhancement to
    // decide on, not something this test should assume already exists.

  });

  it('allowed order fields pass through even when no other updates are present', async () => {
    await firestoreCaseService.updateCase('C123', {
      order: { assignedParticipationTypeId: 'primary' } as any,
    });

    const [, payload] = updateDocMock.mock.calls[0];
    expect(payload['order.assignedParticipationTypeId']).toBe('primary');
  });
});
