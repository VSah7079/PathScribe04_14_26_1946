// @vitest-environment happy-dom
// src/services/tumorBoard/mockTumorBoardService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NewTumorBoardListing } from './ITumorBoardService';
import { isServiceOk } from '../types';

// Same mocking pattern as delegations/mockDelegationService.test.ts: this
// service enforces case:tumor-board:flag (Batch 489), so tests control the
// decision directly rather than depending on the real role/session wiring.
// Batch 493: `deniedCapabilities` lets a test deny one specific capability
// (e.g. only case:tumor-board:schedule) while `allowed.current` keeps
// deciding everything else — needed to test update()'s own new
// requiredTumorBoardCapabilitiesFor() split without touching every
// existing allowed.current = true/false test above.
const { allowed, deniedCapabilities, presenterRoles } = vi.hoisted(() => ({
  allowed: { current: true },
  deniedCapabilities: { current: new Set<string>() },
  // Batch 494: the real, server-side presenter-eligibility check
  // (presenterIsEligible() in mockTumorBoardService.ts) now looks the
  // presenter up via mockUserService.getById() — default every unknown
  // id to an eligible pathologist so every pre-existing test here (which
  // uses arbitrary ids like 'u2' with no real seeded user) keeps passing
  // unchanged; individual tests override this map for the new,
  // ineligible-presenter test below.
  presenterRoles: { current: new Map<string, string[]>() },
}));
vi.mock('../authorization/defaultAuthorizationService', () => ({
  authorizationService: {
    enforce: vi.fn(async (capability: string) => ({
      capability,
      allowed: allowed.current && !deniedCapabilities.current.has(capability),
      grantedBy: [], missingRequirements: [], context: {},
    })),
  },
}));
vi.mock('../users/mockUserService', () => ({
  mockUserService: {
    getById: vi.fn(async (id: string) => ({
      ok: true,
      data: { id, firstName: 'Test', lastName: 'User', roles: presenterRoles.current.get(id) ?? ['pathologist'] },
    })),
  },
}));

const { mockTumorBoardService, requiredTumorBoardCapabilitiesFor } = await import('./mockTumorBoardService');

function newListing(overrides: Partial<NewTumorBoardListing> = {}): NewTumorBoardListing {
  return {
    caseId: 'case-1',
    caseAccession: 'S26-1000',
    board: 'Breast MDT',
    createdByUserId: 'u1',
    createdByUserName: 'Dr A',
    ...overrides,
  };
}

beforeEach(async () => {
  allowed.current = true;
  deniedCapabilities.current = new Set();
  presenterRoles.current = new Map();
  const res = await mockTumorBoardService.getAll();
  if (res.ok) {
    for (const l of res.data) {
      // Clear out any listing left by a previous test (no delete() in
      // Module 1's scope; cancel instead so each test starts clean).
      await mockTumorBoardService.update(l.id, { status: 'Cancelled' }, 'test', 'test');
    }
  }
});

describe('mockTumorBoardService.create', () => {
  it('refuses to create without case:tumor-board:flag', async () => {
    allowed.current = false;
    const res = await mockTumorBoardService.create(newListing());
    expect(res).toEqual({ ok: false, error: 'notPermitted' });
  });

  it('creates a listing defaulting to Pending Presentation', async () => {
    const res = await mockTumorBoardService.create(newListing());
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.status).toBe('Pending Presentation');
      expect(res.data.board).toBe('Breast MDT');
      expect(res.data.id).toBeTruthy();
    }
  });

  it('refuses a second active listing for the same case', async () => {
    const first = await mockTumorBoardService.create(newListing({ caseId: 'case-2' }));
    expect(first.ok).toBe(true);
    const second = await mockTumorBoardService.create(newListing({ caseId: 'case-2', board: 'GI MDT' }));
    expect(second.ok).toBe(false);
    // Batch 494: was a raw, untranslated English sentence embedding the
    // case id — a real, disclosed CLAUDE.md rule 3 gap found while
    // touching this exact code path for the batching rework; now a real
    // error code, translated by FlagForMdtModal like every other error here.
    if (!isServiceOk(second)) expect(second.error).toBe('activeListingExists');
  });

  it('allows a new listing once the earlier one is Cancelled', async () => {
    const first = await mockTumorBoardService.create(newListing({ caseId: 'case-3' }));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    await mockTumorBoardService.update(first.data.id, { status: 'Cancelled' }, 'u1', 'Dr A');
    const second = await mockTumorBoardService.create(newListing({ caseId: 'case-3', board: 'GI MDT' }));
    expect(second.ok).toBe(true);
  });

  // Batch 494 (Pete, Oct 8, the MDT Self-Service Assignment & Batching
  // redesign): FlagForMdtModal now collects a meeting date at flag time —
  // a date already past the batch-lock cut-off is refused, same rule a
  // reschedule via update() is held to (see the update() describe block
  // below).
  it('refuses a meeting date that is already past the batch-lock cut-off', async () => {
    const res = await mockTumorBoardService.create(newListing({
      caseId: 'case-2a', meetingDate: '2020-01-01', meetingTime: '09:00',
    }));
    expect(res).toEqual({ ok: false, error: 'batchLocked' });
  });

  it('allows a meeting date comfortably ahead of the cut-off', async () => {
    const res = await mockTumorBoardService.create(newListing({
      caseId: 'case-2b', meetingDate: '2099-01-01', meetingTime: '09:00',
    }));
    expect(res.ok).toBe(true);
  });

  it('refuses a presenter who is not actually presenter-eligible, even at creation time', async () => {
    presenterRoles.current.set('u-bench', ['accessioner']);
    const res = await mockTumorBoardService.create(newListing({
      caseId: 'case-2c', presenterUserId: 'u-bench', presenterUserName: 'Tech X',
    }));
    expect(res).toEqual({ ok: false, error: 'presenterNotEligible' });
  });
});

describe('mockTumorBoardService.getActiveForCase', () => {
  it('returns null when the case has no listing', async () => {
    const res = await mockTumorBoardService.getActiveForCase('no-such-case');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toBeNull();
  });

  it('returns the active listing, ignoring Cancelled ones', async () => {
    const created = await mockTumorBoardService.create(newListing({ caseId: 'case-4' }));
    expect(created.ok).toBe(true);
    const res = await mockTumorBoardService.getActiveForCase('case-4');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data?.board).toBe('Breast MDT');
  });
});

describe('mockTumorBoardService.update', () => {
  it('updates status/presenter/meetingDate and the audit fields', async () => {
    const created = await mockTumorBoardService.create(newListing({ caseId: 'case-5' }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const res = await mockTumorBoardService.update(created.data.id, { status: 'Presented', presenterUserId: 'u2', presenterUserName: 'Dr B' }, 'u2', 'Dr B');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.status).toBe('Presented');
      expect(res.data.presenterUserId).toBe('u2');
      expect(res.data.updatedByUserId).toBe('u2');
    }
  });

  it('errors on an unknown id', async () => {
    const res = await mockTumorBoardService.update('no-such-id', { status: 'Deferred' }, 'u1', 'Dr A');
    expect(res.ok).toBe(false);
  });

  // Batch 491: queue management needs case:tumor-board:manage.
  it('refuses without case:tumor-board:manage', async () => {
    const created = await mockTumorBoardService.create(newListing({ caseId: 'case-5b' }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    allowed.current = false;
    const res = await mockTumorBoardService.update(created.data.id, { status: 'Deferred' }, 'u1', 'Dr A');
    expect(res).toEqual({ ok: false, error: 'notPermitted' });
  });

  // Batch 491: a status of 'Dismissed' always goes through dismiss(), never update().
  it('refuses a status of Dismissed, even with case:tumor-board:manage', async () => {
    const created = await mockTumorBoardService.create(newListing({ caseId: 'case-5c' }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const res = await mockTumorBoardService.update(created.data.id, { status: 'Dismissed' } as never, 'u1', 'Dr A');
    expect(res).toEqual({ ok: false, error: 'useDismissInstead' });
  });

  // Batch 493 (Pete, Oct 8: "a specific permission to schedule these MDT
  // so that an admin assistant can schedule them in advance"): scheduling
  // fields (board/meetingDate/meetingTime/presenter) need the new,
  // narrower case:tumor-board:schedule — a status-only change is
  // unaffected by denying it.
  it('allows a status-only change when case:tumor-board:schedule is denied but case:tumor-board:manage is granted', async () => {
    const created = await mockTumorBoardService.create(newListing({ caseId: 'case-5j' }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    deniedCapabilities.current = new Set(['case:tumor-board:schedule']);
    const res = await mockTumorBoardService.update(created.data.id, { status: 'Deferred' }, 'u1', 'Dr A');
    expect(res.ok).toBe(true);
  });

  it('refuses a scheduling-only change (presenter) when case:tumor-board:schedule is denied, even with case:tumor-board:manage granted', async () => {
    const created = await mockTumorBoardService.create(newListing({ caseId: 'case-5k' }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    deniedCapabilities.current = new Set(['case:tumor-board:schedule']);
    const res = await mockTumorBoardService.update(created.data.id, { presenterUserId: 'u2', presenterUserName: 'Dr B' }, 'u1', 'Dr A');
    expect(res).toEqual({ ok: false, error: 'notPermitted' });
  });

  it('allows a scheduling-only change (meeting date) when case:tumor-board:manage is denied but case:tumor-board:schedule is granted', async () => {
    const created = await mockTumorBoardService.create(newListing({ caseId: 'case-5l' }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    deniedCapabilities.current = new Set(['case:tumor-board:manage']);
    const res = await mockTumorBoardService.update(created.data.id, { meetingDate: '2099-01-01' }, 'u1', 'Dr A');
    expect(res.ok).toBe(true);
  });

  // Batch 494: the batch-lock rule — refuses MOVING a case's board/date/
  // time into an already-locked session, but never blocks a presenter or
  // status change on one (self-assignment is exactly what's supposed to
  // still happen on a locked, soon-to-meet batch).
  it('refuses rescheduling into an already-locked session', async () => {
    const created = await mockTumorBoardService.create(newListing({ caseId: 'case-5m' }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const res = await mockTumorBoardService.update(created.data.id, { meetingDate: '2020-01-01', meetingTime: '09:00' }, 'u1', 'Dr A');
    expect(res).toEqual({ ok: false, error: 'batchLocked' });
  });

  it('still allows claiming (presenter-only) a listing whose own session is already locked', async () => {
    const created = await mockTumorBoardService.create(newListing({ caseId: 'case-5n', meetingDate: '2099-01-01' }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    // Raise the cut-off astronomically high so this same, already-stored
    // 2099-01-01 session is now genuinely locked — a real way to reach a
    // locked, already-stored listing through the real service, since
    // neither create() nor a reschedule via update() will ever let one
    // through directly (that's the guardrail working as intended).
    const { mockTumorBoardBatchSettingsService: tumorBoardBatchSettingsService } = await import('../tumorBoardRules/mockTumorBoardRuleService');
    const originalRes = await tumorBoardBatchSettingsService.get();
    const original = originalRes.ok ? originalRes.data : undefined;
    await tumorBoardBatchSettingsService.update({ cutoffHours: 1_000_000 });
    try {
      const reschedule = await mockTumorBoardService.update(created.data.id, { meetingDate: '2099-01-01' }, 'u1', 'Dr A');
      expect(reschedule).toEqual({ ok: false, error: 'batchLocked' }); // confirms the session is genuinely locked now
      const res = await mockTumorBoardService.update(created.data.id, { presenterUserId: 'u2', presenterUserName: 'Dr B' }, 'u2', 'Dr B');
      expect(res.ok).toBe(true);
    } finally {
      if (original) await tumorBoardBatchSettingsService.update(original);
    }
  });

  it('refuses assigning a presenter who is not actually presenter-eligible', async () => {
    const created = await mockTumorBoardService.create(newListing({ caseId: 'case-5o' }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    presenterRoles.current.set('u-bench', ['histotechnologist']);
    const res = await mockTumorBoardService.update(created.data.id, { presenterUserId: 'u-bench', presenterUserName: 'Tech X' }, 'u1', 'Dr A');
    expect(res).toEqual({ ok: false, error: 'presenterNotEligible' });
  });

  // Batch 494 (Pete, Oct 8: "PathScribe logs the timestamp of when the
  // case was claimed and by whom"): presenterAssignedAt/By* stamp on a
  // real presenter change, distinct from updatedAt/updatedByUser* (which
  // move on ANY edit) — and the ACTING user (who may be claiming for
  // themselves, or an admin assigning on a physician's behalf), not
  // necessarily the presenter.
  it('stamps presenterAssignedAt/By on a presenter change, with the acting user — not just updatedAt', async () => {
    const created = await mockTumorBoardService.create(newListing({ caseId: 'case-5p' }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const res = await mockTumorBoardService.update(created.data.id, { presenterUserId: 'u2', presenterUserName: 'Dr B' }, 'u-admin', 'Admin Assist');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.presenterUserId).toBe('u2');
      expect(res.data.presenterAssignedByUserId).toBe('u-admin');
      expect(res.data.presenterAssignedByUserName).toBe('Admin Assist');
      expect(typeof res.data.presenterAssignedAt).toBe('string');
    }
  });

  it('does not re-stamp presenterAssignedAt on an unrelated (status-only) edit', async () => {
    const created = await mockTumorBoardService.create(newListing({ caseId: 'case-5q' }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const claimed = await mockTumorBoardService.update(created.data.id, { presenterUserId: 'u2', presenterUserName: 'Dr B' }, 'u2', 'Dr B');
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    const firstStamp = claimed.data.presenterAssignedAt;
    const later = await mockTumorBoardService.update(created.data.id, { status: 'Presented' }, 'u2', 'Dr B');
    expect(later.ok).toBe(true);
    if (later.ok) expect(later.data.presenterAssignedAt).toBe(firstStamp);
  });
});

describe('requiredTumorBoardCapabilitiesFor (Batch 493)', () => {
  it('requires only case:tumor-board:manage for a status-only change', () => {
    expect(requiredTumorBoardCapabilitiesFor({ status: 'Deferred' })).toEqual(['case:tumor-board:manage']);
  });

  it('requires only case:tumor-board:schedule for a board/meeting-date/meeting-time/presenter-only change', () => {
    expect(requiredTumorBoardCapabilitiesFor({ board: 'GI MDT' })).toEqual(['case:tumor-board:schedule']);
    expect(requiredTumorBoardCapabilitiesFor({ meetingDate: '2026-12-01' })).toEqual(['case:tumor-board:schedule']);
    expect(requiredTumorBoardCapabilitiesFor({ meetingTime: '09:00' })).toEqual(['case:tumor-board:schedule']);
    expect(requiredTumorBoardCapabilitiesFor({ presenterUserId: 'u2', presenterUserName: 'Dr B' })).toEqual(['case:tumor-board:schedule']);
  });

  it('requires both when a single call mixes a status change with a schedule change', () => {
    expect(requiredTumorBoardCapabilitiesFor({ status: 'Deferred', presenterUserId: 'u2' })).toEqual(['case:tumor-board:manage', 'case:tumor-board:schedule']);
  });

  it('falls back to the broader case:tumor-board:manage for an empty change set (fail-safe, not fail-open)', () => {
    expect(requiredTumorBoardCapabilitiesFor({})).toEqual(['case:tumor-board:manage']);
  });
});

describe('mockTumorBoardService.dismiss', () => {
  it('refuses without case:tumor-board:dismiss', async () => {
    const created = await mockTumorBoardService.create(newListing({ caseId: 'case-5d' }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    allowed.current = false;
    const res = await mockTumorBoardService.dismiss(created.data.id, 'Not clinically indicated', 'u1', 'Dr A');
    expect(res).toEqual({ ok: false, error: 'notPermitted' });
  });

  it('refuses an empty reason', async () => {
    const created = await mockTumorBoardService.create(newListing({ caseId: 'case-5e' }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const res = await mockTumorBoardService.dismiss(created.data.id, '   ', 'u1', 'Dr A');
    expect(res).toEqual({ ok: false, error: 'reasonRequired' });
  });

  it('sets status Dismissed with the reason and dismiss audit fields, trimmed', async () => {
    const created = await mockTumorBoardService.create(newListing({ caseId: 'case-5f' }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const res = await mockTumorBoardService.dismiss(created.data.id, '  Margin re-measured on recut, not close  ', 'u2', 'Dr B');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.status).toBe('Dismissed');
      expect(res.data.dismissReason).toBe('Margin re-measured on recut, not close');
      expect(res.data.dismissedByUserId).toBe('u2');
      expect(res.data.dismissedByUserName).toBe('Dr B');
      expect(typeof res.data.dismissedAt).toBe('string');
    }
  });

  it('errors on an unknown id', async () => {
    const res = await mockTumorBoardService.dismiss('no-such-id', 'reason', 'u1', 'Dr A');
    expect(res.ok).toBe(false);
  });

  it('a Dismissed listing no longer counts as active, same as Cancelled', async () => {
    const created = await mockTumorBoardService.create(newListing({ caseId: 'case-5g' }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    await mockTumorBoardService.dismiss(created.data.id, 'reason', 'u1', 'Dr A');
    const active = await mockTumorBoardService.getActiveForCase('case-5g');
    expect(active.ok).toBe(true);
    if (active.ok) expect(active.data).toBeNull();
    const second = await mockTumorBoardService.create(newListing({ caseId: 'case-5g', board: 'GI MDT' }));
    expect(second.ok).toBe(true);
  });
});

describe('mockTumorBoardService.create — source/triggerReason (Batch 491)', () => {
  it('defaults source to Manual when omitted', async () => {
    const res = await mockTumorBoardService.create(newListing({ caseId: 'case-5h' }));
    expect(res.ok).toBe(true);
    if (res.ok) { expect(res.data.source).toBe('Manual'); expect(res.data.triggerReason).toBeUndefined(); }
  });

  it('persists an explicit source: Rule and its triggerReason', async () => {
    const res = await mockTumorBoardService.create(newListing({
      caseId: 'case-5i', source: 'Rule', triggerReason: 'Margin: Distance to closest margin < 1mm (0.6mm)',
    }));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.source).toBe('Rule');
      expect(res.data.triggerReason).toBe('Margin: Distance to closest margin < 1mm (0.6mm)');
    }
  });
});

describe('mockTumorBoardService.list', () => {
  it('filters by board and status', async () => {
    await mockTumorBoardService.create(newListing({ caseId: 'case-6', board: 'Gyn-Onc' }));
    const res = await mockTumorBoardService.list({ board: 'Gyn-Onc', status: 'Pending Presentation' });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.every(l => l.board === 'Gyn-Onc' && l.status === 'Pending Presentation')).toBe(true);
  });
});
