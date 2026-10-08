// @vitest-environment happy-dom
// Batch 454: follow-up tracking against the real (mock) services. A surgical
// case marked "follow-up expected" becomes overdue once its window passes,
// the internal alert goes out once, and a recorded outcome closes it.
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>(), snapshot: async () => ({ subject: null, roles: [] }) },
}));
// The signer is signed in when this runs; here, a session that can open the case.
vi.mock('@/services/auth/caseAccessControl', async importOriginal => ({
  ...(await importOriginal<typeof import('@/services/auth/caseAccessControl')>()),
  getSessionUser: () => ({ id: 'u-path', role: 'pathologist' }),
  canAccessCaseWithPools: () => true,
}));
import { caseRouter } from '../cases/CaseRouter';
import { mockMessageService } from '../messages/mockMessageService';
import { loadFollowUpItems, markFollowUpExpectedLive, recordFollowUpDispositionLive, sendFollowUpAlertsLive } from './followUpLive';

beforeEach(() => localStorage.clear());

describe('follow-up tracking, live wiring', () => {
  it('mark → overdue → one alert → closed', async () => {
    const all = await caseRouter.getAll(undefined, { includeOrchestration: true, bypassAccessControl: true });
    expect(all.ok).toBe(true);
    // A case with a dated specimen and someone who signed it out.
    const cases = all.ok ? all.data : [];
    const casesOf = (patientId?: string) => cases.filter(c => c.patient?.id === patientId).length;
    // Only case for its patient, so nothing else can satisfy the follow-up.
    // Batch 458: a surgical case only (the demo baseline added autopsy and
    // more cytology cases, which can't be marked; the case list's order isn't
    // fixed, so the first match sometimes was one).
    const surgical = (c: any) => !c.autopsy && !String(c.id).includes('-CYT-') && (c.specimens ?? []).every((s: any) => s.specimenDictionaryEntryId !== 'sp-cyto-pap');
    const target = cases.find(c => surgical(c) && (c.specimens ?? []).some(s => s.collectedAt || s.receivedAt) && c.patient?.id && casesOf(c.patient.id) === 1);
    expect(target).toBeTruthy();
    const marked = await markFollowUpExpectedLive(target!.id, { id: 'u-path', name: 'Dr Path' });
    expect(marked).toMatchObject({ ok: true });

    const later = new Date(Date.parse(marked.ok ? marked.data.window.endsAt : '') + 5 * 86_400_000);
    const { items } = await loadFollowUpItems({ allCases: true, now: later });
    const item = items.find(i => i.kind === 'surgical' && i.caseId === target!.id)!;
    expect(item).toBeTruthy();
    {
      expect(item).toMatchObject({ status: 'overdue', daysOverdue: 5, signedOutBy: target!.finalizedBy ?? 'u-path' });
      const send = vi.spyOn(mockMessageService, 'send');
      expect(await sendFollowUpAlertsLive(later)).toBeGreaterThanOrEqual(1);
      expect(send.mock.calls.some(([m]) => m.caseNumber === item.accession && m.isUrgent)).toBe(true);
      send.mockClear();
      const again = await loadFollowUpItems({ allCases: true, now: later });
      expect(again.items.find(i => i.key === item.key)!.record.alertsSent.overdue).toBeTruthy();
      await sendFollowUpAlertsLive(later);
      expect(send.mock.calls.some(([m]) => m.caseNumber === item.accession)).toBe(false);
      send.mockRestore();

      const closed = await recordFollowUpDispositionLive(item, 'patientDeclined', undefined, { id: 'u-qa', name: 'Pat QA' });
      expect(closed.ok).toBe(true);
      const after = await loadFollowUpItems({ allCases: true, now: later });
      expect(after.items.find(i => i.key === item.key)!.status).toBe('closed');
    }
  });
});
