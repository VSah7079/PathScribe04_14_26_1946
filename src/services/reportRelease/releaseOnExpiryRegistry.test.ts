// src/services/reportRelease/releaseOnExpiryRegistry.test.ts
// Batch 649 (sign-out audit): when a held surgical sign-out's release delay runs out, the FINAL and its cancer
// registry submission go together (surgicalSignOut/releaseSurgicalFinal), never at the signature.
import { describe, it, expect, vi } from 'vitest';

vi.mock('../surgicalSignOut/releaseSurgicalFinal', () => ({ releaseSurgicalFinal: vi.fn(async () => {}), surgicalFinalReleaseDeps: { publish: vi.fn(), dispatchRegistry: vi.fn() } }));

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
const { caseVersionOf } = await import('../cases/caseWrite');
const { releaseSurgicalFinal } = await import('../surgicalSignOut/releaseSurgicalFinal');

describe('checkAndReleaseIfExpired: the registry follows the release', () => {
  it('releases the expired sign-out through releaseSurgicalFinal with the case (FINAL, its facility)', async () => {
    const id = 'O26-RELEASE-REGISTRY-1';
    await caseRouter.createCase({ id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), status: 'in-progress', participants: [], synopticReports: [], specimens: [], order: { priority: 'Routine', facilityId: 'F1' } } as any);
    expect(releaseSurgicalFinal).not.toHaveBeenCalled();
    await mockReportReleaseService.startBuffer(id, { previousStatus: 'in-progress', durationMinutes: 10 }, { userId: 'PATH-001', userName: 'Dr P' });
    const current = await caseRouter.getCase(id);
    await caseRouter.updateCase(id, { releaseBufferExpiresAt: new Date(Date.now() - 1000).toISOString() }, caseVersionOf(current));
    expect((await mockReportReleaseService.checkAndReleaseIfExpired(id)).released).toBe(true);
    expect(releaseSurgicalFinal).toHaveBeenCalledWith(expect.objectContaining({ id }), expect.objectContaining({ caseId: id, reportType: 'FINAL', performingFacilityId: 'F1' }), expect.anything());
  });
});
