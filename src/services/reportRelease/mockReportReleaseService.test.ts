// src/services/reportRelease/mockReportReleaseService.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real tests for Phase 1 of the Post-Sign-Out Release Buffer, per direct
// specification: the core state machine (startBuffer/recall/
// checkAndReleaseIfExpired). Uses caseRouter directly (not the underlying
// mockOrchestratorCaseService), the same real dependency
// mockReportReleaseService.ts itself has — a real, valid superadmin
// session is required for caseRouter.getCase()'s own real access-control
// check to succeed (see caseAccessControl.ts — superadmin bypasses the
// organisation/pool check entirely, matching this file's own narrow need:
// exercising the release-buffer state machine, not access control).
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => { store.clear(); },
};
store.set('pathscribe-user', JSON.stringify({ id: 'TEST-USER', role: 'superadmin' }));

const { mockReportReleaseService } = await import('./mockReportReleaseService');
const { caseRouter } = await import('../cases/CaseRouter');

let counter = 0;
function makeCaseId(): string {
  counter += 1;
  return `O26-RELEASEBUFFER-${counter}`;
}

async function seedCase(overrides: Record<string, unknown> = {}): Promise<string> {
  const id = makeCaseId();
  await caseRouter.createCase({
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'in-progress',
    participants: [],
    synopticReports: [],
    specimens: [],
    order: { priority: 'Routine' },
    ...overrides,
  } as any);
  return id;
}

describe('mockReportReleaseService — Phase 1 + Phase 2, per direct specification: Post-Sign-Out Release Buffer', () => {
  describe('resolveBufferForCase — no facility override (org default only)', () => {
    it('a real STAT case bypasses the buffer entirely, per the org default bypassForStat', async () => {
      const result = await mockReportReleaseService.resolveBufferForCase({ order: { priority: 'STAT' } } as any);
      expect(result.applies).toBe(false);
      expect(result.bypassReason).toBe('STAT priority');
    });

    it('a real, non-STAT case gets the real, current org-default buffer duration', async () => {
      const result = await mockReportReleaseService.resolveBufferForCase({ order: { priority: 'Routine' } } as any);
      expect(result.applies).toBe(true);
      expect(result.durationMinutes).toBeGreaterThan(0);
    });
  });

  describe('getOrgDefault / setOrgDefault', () => {
    it('a real, saved org config is honestly read back, not silently reverted to the fallback', async () => {
      const saved: import('./IReportReleaseService').ReportReleaseOrgConfig = { enabled: true, durationMinutes: 22, bypassForStat: false, watermarkText: 'TEST WATERMARK', restrictHardcopyPrinting: true };
      await mockReportReleaseService.setOrgDefault(saved);
      const result = await mockReportReleaseService.getOrgDefault();
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data).toEqual(saved);
    });

    it('a real, saved org config actually changes resolveBufferForCase — including a real, non-default STAT bypass setting', async () => {
      await mockReportReleaseService.setOrgDefault({ enabled: true, durationMinutes: 22, bypassForStat: false, watermarkText: 'TEST WATERMARK', restrictHardcopyPrinting: true });
      const result = await mockReportReleaseService.resolveBufferForCase({ order: { priority: 'STAT' } } as any);
      // bypassForStat is now false at the org level — a real STAT case
      // no longer bypasses, and gets the real, newly-configured duration.
      expect(result.applies).toBe(true);
      expect(result.durationMinutes).toBe(22);
    });

    it('a real, disabled org config makes the buffer never apply, for any case', async () => {
      await mockReportReleaseService.setOrgDefault({ enabled: false, durationMinutes: 10, bypassForStat: true, watermarkText: 'TEST WATERMARK', restrictHardcopyPrinting: true });
      const result = await mockReportReleaseService.resolveBufferForCase({ order: { priority: 'Routine' } } as any);
      expect(result.applies).toBe(false);
      expect(result.bypassReason).toBe('Release buffer disabled');
    });
  });

  describe('resolveBufferForCase — real facility override', () => {
    it('a real, performing facility that has genuinely opted out of inheriting uses its own, real override values', async () => {
      await mockReportReleaseService.setOrgDefault({ enabled: true, durationMinutes: 10, bypassForStat: true, watermarkText: 'TEST WATERMARK', restrictHardcopyPrinting: true });
      const facilityMod = await import('../facilities/mockFacilityService');
      const created = await facilityMod.mockFacilityService.add({
        name: 'QA Test Performing Lab', assigningAuthority: 'QATEST', address: '1 Test Way', phone: '555-0100', fax: '555-0101',
        roles: ['performing_lab'],
        releaseBufferOverride: { inheritSystemDefault: false, enabled: true, durationMinutes: 3, bypassForStat: false },
      } as any);
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const result = await mockReportReleaseService.resolveBufferForCase({ order: { priority: 'STAT' }, originHospitalId: created.data.id } as any);
      // Real facility override: bypassForStat is false here, distinct
      // from the org default (bypassForStat: true) — proves the real
      // override, not the org default, actually won.
      expect(result.applies).toBe(true);
      expect(result.durationMinutes).toBe(3);
    });

    it('a real facility explicitly inheriting the system default correctly falls through to the real org config, not its own dormant override values', async () => {
      await mockReportReleaseService.setOrgDefault({ enabled: true, durationMinutes: 17, bypassForStat: true, watermarkText: 'TEST WATERMARK', restrictHardcopyPrinting: true });
      const facilityMod = await import('../facilities/mockFacilityService');
      const created = await facilityMod.mockFacilityService.add({
        name: 'QA Test Inheriting Lab', assigningAuthority: 'QATEST2', address: '1 Test Way', phone: '555-0100', fax: '555-0101',
        roles: ['performing_lab'],
        // inheritSystemDefault: true — the other fields here are real,
        // but must be genuinely dormant/ignored.
        releaseBufferOverride: { inheritSystemDefault: true, enabled: false, durationMinutes: 99, bypassForStat: false },
      } as any);
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const result = await mockReportReleaseService.resolveBufferForCase({ order: { priority: 'Routine' }, originHospitalId: created.data.id } as any);
      expect(result.applies).toBe(true);
      expect(result.durationMinutes).toBe(17);
    });
  });

  describe('startBuffer', () => {
    it('transitions a real case to pending-release, capturing its real prior status and a real expiry', async () => {
      const caseId = await seedCase({ status: 'in-progress' });
      const result = await mockReportReleaseService.startBuffer(
        caseId, { previousStatus: 'in-progress', durationMinutes: 10 }, { userId: 'PATH-001', userName: 'Pete Nimmo' }
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const updated = await caseRouter.getCase(caseId);
      expect(updated?.status).toBe('pending-release');
      expect(updated?.preReleaseBufferStatus).toBe('in-progress');
      expect(updated?.releaseBufferDurationMinutes).toBe(10);
      expect(updated?.releaseBufferExpiresAt).toBe(result.releaseBufferExpiresAt);
      // Real, deliberate scope: this service never touches finalizedAt —
      // that stays exactly where finalizeCase() itself already sets it.
      expect(updated?.finalizedAt).toBeUndefined();
    });

    it('a real, immutable audit event is logged, including the real facility id', async () => {
      const caseId = await seedCase({ originHospitalId: 'c-fenwick-general' } as any);
      await mockReportReleaseService.startBuffer(caseId, { previousStatus: 'in-progress', durationMinutes: 10 }, { userId: 'PATH-001', userName: 'Pete Nimmo' });
      const auditMod = await import('../auditlog/mockAuditService');
      const logs = await auditMod.mockAuditService.getAuditLogs({ search: 'SIGN_OUT_BUFFERED' });
      expect(logs.ok).toBe(true);
      if (!logs.ok) return;
      const entry = logs.data.find(l => l.caseId === caseId);
      expect(entry).toBeDefined();
      // Real feature, per direct specification, Phase 5 (spec §18a —
      // audit entries need "facility IDs"). A real, genuine gap this
      // closes — the audit trail previously had nowhere to record
      // which real facility a buffered case belonged to at all.
      expect(entry?.facilityId).toBe('c-fenwick-general');
    });
  });

  describe('recall', () => {
    it('restores the real, captured prior status and clears every real buffer field', async () => {
      const caseId = await seedCase({ status: 'pathologist-review' });
      await mockReportReleaseService.startBuffer(caseId, { previousStatus: 'pathologist-review', durationMinutes: 10 }, { userId: 'PATH-001', userName: 'Pete Nimmo' });

      const result = await mockReportReleaseService.recall(caseId, { userId: 'PATH-001', userName: 'Pete Nimmo' });
      expect(result.ok).toBe(true);

      const updated = await caseRouter.getCase(caseId);
      expect(updated?.status).toBe('pathologist-review');
      expect(updated?.releaseBufferExpiresAt).toBeUndefined();
      expect(updated?.releaseBufferDurationMinutes).toBeUndefined();
      expect(updated?.preReleaseBufferStatus).toBeUndefined();
    });

    it('real feature, Phase 4, per direct specification: refuses to recall on behalf of a different user than the real, actual signer — same real protection SynopticReportPage.tsx used to be missing entirely (a genuine bug: any viewer, including a trainee, could previously recall a case they never signed out)', async () => {
      const caseId = await seedCase({ status: 'in-progress' });
      await mockReportReleaseService.startBuffer(caseId, { previousStatus: 'in-progress', durationMinutes: 10 }, { userId: 'PATH-001', userName: 'Pete Nimmo' });
      const current = await caseRouter.getCase(caseId);
      // finalizedBy is set by the real finalizeCase() flow, not
      // startBuffer() itself — set directly here to simulate that real,
      // already-signed state.
      await caseRouter.updateCase(caseId, { finalizedBy: 'PATH-001' }, current!.version);

      const result = await mockReportReleaseService.recall(caseId, { userId: 'TRAINEE-999', userName: 'A Resident' });
      expect(result.ok).toBe(false);
      expect((result as { ok: false; reason: string }).reason).toContain('Only the pathologist who signed');

      // Real, load-bearing assertion: refused, not just "reported as
      // refused" — the case must genuinely still be pending-release.
      const stillPending = await caseRouter.getCase(caseId);
      expect(stillPending?.status).toBe('pending-release');
    });

    it('the real, actual signer is genuinely still able to recall their own report', async () => {
      const caseId = await seedCase({ status: 'in-progress' });
      await mockReportReleaseService.startBuffer(caseId, { previousStatus: 'in-progress', durationMinutes: 10 }, { userId: 'PATH-001', userName: 'Pete Nimmo' });
      const current = await caseRouter.getCase(caseId);
      await caseRouter.updateCase(caseId, { finalizedBy: 'PATH-001' }, current!.version);

      const result = await mockReportReleaseService.recall(caseId, { userId: 'PATH-001', userName: 'Pete Nimmo' });
      expect(result.ok).toBe(true);
    });

    it('refuses to recall a case that is not genuinely in pending-release', async () => {
      const caseId = await seedCase({ status: 'in-progress' });
      const result = await mockReportReleaseService.recall(caseId, { userId: 'PATH-001', userName: 'Pete Nimmo' });
      expect(result.ok).toBe(false);
    });

    it('real, honest race protection: refuses to recall a case whose buffer has already expired', async () => {
      const caseId = await seedCase({ status: 'in-progress' });
      await mockReportReleaseService.startBuffer(caseId, { previousStatus: 'in-progress', durationMinutes: 10 }, { userId: 'PATH-001', userName: 'Pete Nimmo' });
      // Simulate real expiry having already passed, independent of the
      // real countdown — same technique as this session's own stale-event
      // tests elsewhere: directly manipulate the stored timestamp rather
      // than actually waiting minutes in a real test run.
      const current = await caseRouter.getCase(caseId);
      await caseRouter.updateCase(caseId, { releaseBufferExpiresAt: new Date(Date.now() - 1000).toISOString() }, current!.version);

      const result = await mockReportReleaseService.recall(caseId, { userId: 'PATH-001', userName: 'Pete Nimmo' });
      expect(result.ok).toBe(false);
      expect((result as { ok: false; reason: string }).reason).toContain('already expired');
    });

    it('a real SIGN_OUT_RECALLED audit event is logged', async () => {
      const caseId = await seedCase();
      await mockReportReleaseService.startBuffer(caseId, { previousStatus: 'in-progress', durationMinutes: 10 }, { userId: 'PATH-001', userName: 'Pete Nimmo' });
      await mockReportReleaseService.recall(caseId, { userId: 'PATH-001', userName: 'Pete Nimmo' });
      const auditMod = await import('../auditlog/mockAuditService');
      const logs = await auditMod.mockAuditService.getAuditLogs({ search: 'SIGN_OUT_RECALLED' });
      expect(logs.ok).toBe(true);
      if (!logs.ok) return;
      expect(logs.data.some(l => l.caseId === caseId)).toBe(true);
    });
  });

  describe('checkAndReleaseIfExpired', () => {
    it('a real, honest no-op for a case not in pending-release', async () => {
      const caseId = await seedCase({ status: 'in-progress' });
      const result = await mockReportReleaseService.checkAndReleaseIfExpired(caseId);
      expect(result.released).toBe(false);
    });

    it('a real, honest no-op while the buffer has not yet expired', async () => {
      const caseId = await seedCase();
      await mockReportReleaseService.startBuffer(caseId, { previousStatus: 'in-progress', durationMinutes: 10 }, { userId: 'PATH-001', userName: 'Pete Nimmo' });
      const result = await mockReportReleaseService.checkAndReleaseIfExpired(caseId);
      expect(result.released).toBe(false);
      const stillPending = await caseRouter.getCase(caseId);
      expect(stillPending?.status).toBe('pending-release');
    });

    it('releases a real, genuinely expired case — finalized, with a real releasedAt distinct from finalizedAt', async () => {
      const caseId = await seedCase({ status: 'in-progress' });
      await mockReportReleaseService.startBuffer(caseId, { previousStatus: 'in-progress', durationMinutes: 10 }, { userId: 'PATH-001', userName: 'Pete Nimmo' });
      const current = await caseRouter.getCase(caseId);
      await caseRouter.updateCase(caseId, { releaseBufferExpiresAt: new Date(Date.now() - 1000).toISOString() }, current!.version);

      const result = await mockReportReleaseService.checkAndReleaseIfExpired(caseId);
      expect(result.released).toBe(true);

      const released = await caseRouter.getCase(caseId);
      expect(released?.status).toBe('finalized');
      expect(released?.releasedAt).toBeDefined();
      // Real, deliberate scope: this service never sets finalizedAt —
      // only finalizeCase() (useSignOutWorkflow.ts) does, at real sign-out
      // time, so TAT calculations are never silently shifted by the
      // buffer duration.
      expect(released?.finalizedAt).toBeUndefined();
      expect(released?.releaseBufferExpiresAt).toBeUndefined();
      expect(released?.preReleaseBufferStatus).toBeUndefined();
    });

    it('a real RELEASE_BUFFER_EXPIRED audit event is logged', async () => {
      const caseId = await seedCase();
      await mockReportReleaseService.startBuffer(caseId, { previousStatus: 'in-progress', durationMinutes: 10 }, { userId: 'PATH-001', userName: 'Pete Nimmo' });
      const current = await caseRouter.getCase(caseId);
      await caseRouter.updateCase(caseId, { releaseBufferExpiresAt: new Date(Date.now() - 1000).toISOString() }, current!.version);
      await mockReportReleaseService.checkAndReleaseIfExpired(caseId);

      const auditMod = await import('../auditlog/mockAuditService');
      const logs = await auditMod.mockAuditService.getAuditLogs({ search: 'RELEASE_BUFFER_EXPIRED' });
      expect(logs.ok).toBe(true);
      if (!logs.ok) return;
      expect(logs.data.some(l => l.caseId === caseId)).toBe(true);
    });
  });
});
