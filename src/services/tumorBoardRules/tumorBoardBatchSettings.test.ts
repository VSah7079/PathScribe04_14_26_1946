// @vitest-environment happy-dom
//
// src/services/tumorBoardRules/tumorBoardBatchSettings.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 494 (PS-359 follow-up — MDT Self-Service Assignment & Batching
// redesign). Covers mockTumorBoardRuleService.ts's new
// mockTumorBoardBatchSettingsService export only — the pre-existing rule/
// facility-override CRUD in this same file has no dedicated unit test file
// of its own yet (covered indirectly via tumorBoardRuleEvaluation.test.ts
// and runMarginRuleEvaluation.test.ts); not expanded here, out of scope.
//
// happy-dom is required here, unlike most mock-service test files:
// mockTumorBoardRuleService.ts's loadBatchSettings/persistBatchSettings go
// through services/mockStorage.ts's real localStorage, which silently
// no-ops under plain Node (storageSet's try/catch swallows the
// ReferenceError). update() still *returns* the right value — it merges
// in-memory and returns that object regardless of whether the write
// landed — so only a same-test get() afterwards exposes the failed
// persist. Disclosed/fixed: this file originally had no environment
// pragma at all and its "updates the cut-off" test failed for exactly
// this reason (get() read back the stale default) the first time it was
// actually run.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { allowed } = vi.hoisted(() => ({ allowed: { current: true } }));
vi.mock('../authorization/defaultAuthorizationService', () => ({
  authorizationService: {
    enforce: vi.fn(async (capability: string) => ({
      capability, allowed: allowed.current, grantedBy: [], missingRequirements: [], context: {},
    })),
  },
}));

const { mockTumorBoardBatchSettingsService } = await import('./mockTumorBoardRuleService');

beforeEach(() => { allowed.current = true; });

describe('mockTumorBoardBatchSettingsService', () => {
  it('defaults to a 48-hour cut-off', async () => {
    const res = await mockTumorBoardBatchSettingsService.get();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.cutoffHours).toBe(48);
  });

  it('updates the cut-off when permitted (config:tumor-board-rules:manage)', async () => {
    const res = await mockTumorBoardBatchSettingsService.update({ cutoffHours: 72 });
    expect(res).toEqual({ ok: true, data: { cutoffHours: 72 } });
    const after = await mockTumorBoardBatchSettingsService.get();
    if (after.ok) expect(after.data.cutoffHours).toBe(72);
    await mockTumorBoardBatchSettingsService.update({ cutoffHours: 48 }); // restore the default for later tests/files sharing storage
  });

  it('refuses to update without config:tumor-board-rules:manage', async () => {
    allowed.current = false;
    const res = await mockTumorBoardBatchSettingsService.update({ cutoffHours: 24 });
    expect(res.ok).toBe(false);
  });

  it('refuses a negative or non-finite cutoffHours', async () => {
    expect((await mockTumorBoardBatchSettingsService.update({ cutoffHours: -1 })).ok).toBe(false);
    expect((await mockTumorBoardBatchSettingsService.update({ cutoffHours: NaN })).ok).toBe(false);
  });

  it('allows a cutoffHours of 0 (lock only once the meeting itself arrives)', async () => {
    const res = await mockTumorBoardBatchSettingsService.update({ cutoffHours: 0 });
    expect(res).toEqual({ ok: true, data: { cutoffHours: 0 } });
    await mockTumorBoardBatchSettingsService.update({ cutoffHours: 48 }); // restore
  });
});
