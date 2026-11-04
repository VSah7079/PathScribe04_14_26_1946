// src/services/followUp/mockFollowUpService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 454, moved here in Batch 616: follow-up tracking in the demo. Same
// commands as the server version (IFollowUpService), but the status is worked
// out here from the cases, the browser store and the settings. Received-or-not
// is decided over every case (a resection may be at another facility the
// viewer can't open); a screen is only given the follow-ups on cases the
// viewer can open (caseRouter's access rules). The alert sweep sees them all.
// ─────────────────────────────────────────────────────────────────────────────
import { caseRouter } from '../cases/CaseRouter';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { mockAuditService } from '../auditlog/mockAuditService';
import { specimenDictionaryService as mockSpecimenDictionaryService } from '../specimenDictionary/specimenDictionaryServiceInstance';
import { sendEmail } from '../communications/notificationService';
import { getEffectiveBiopsyResectionRule } from '../quality/biopsyResectionCorrelationSettings';
import { followUpStore, type IFollowUpStore } from './followUpStore';
import { getEffectiveFollowUpSettings, type EffectiveFollowUpSettings } from './followUpSettings';
import { resolveFollowUpItems, toFollowUpCaseInfo, type FollowUpCaseInfo } from './followUpTracking';
import { markFollowUpExpected, recordFollowUpDisposition, reopenFollowUp, type FollowUpActionDeps } from './followUpActions';
import { emailOrderingClinician, type ClinicianEmailDeps } from './followUpClinicianEmail';
import type { IFollowUpService, LoadedFollowUps } from './IFollowUpService';

export const followUpActionDeps = (store: IFollowUpStore = followUpStore): FollowUpActionDeps => ({
  enforce: (capability, context) => authorizationService.enforce(capability as any, (context ?? {}) as any),
  store,
  now: () => new Date(),
  logAudit: event => mockAuditService.logEvent(event as any),
});

const clinicianDeps = (): ClinicianEmailDeps => ({
  ...followUpActionDeps(),
  sendEmail: payload => sendEmail(payload),
  getSettings: facilityId => getEffectiveFollowUpSettings(facilityId),
});

/** True for a specimen that is not cytology (the anchor of a surgical follow-up). */
export async function surgicalTest(): Promise<(specimen: any) => boolean> {
  const dict = await mockSpecimenDictionaryService.getAll();
  const byId = new Map((dict.ok ? dict.data : []).map((e: any) => [e.id, e]));
  return (s: any) => {
    const entry: any = s?.specimenDictionaryEntryId ? byId.get(s.specimenDictionaryEntryId) : undefined;
    return !(entry && (entry.type === 'Cytology' || entry.type === 'FNA'));
  };
}

async function settingsByFacility(facilityIds: (string | undefined)[]): Promise<Map<string, EffectiveFollowUpSettings>> {
  const ids = [...new Set(facilityIds.map(f => f ?? ''))];
  const entries = await Promise.all(ids.map(async id => [id, await getEffectiveFollowUpSettings(id || undefined)] as const));
  return new Map(entries);
}

async function markFor(caseId: string, user: { id: string; name: string }, afterSignOut: boolean) {
  const found: any = await caseRouter.getCase(caseId);
  if (!found) return { ok: false as const, reason: 'caseNotFound' };
  const caseInfo = toFollowUpCaseInfo(found, await surgicalTest());
  const rule = await getEffectiveBiopsyResectionRule(caseInfo.facilityId);
  return markFollowUpExpected(
    { caseInfo, signedOutAt: found.finalizedAt ?? new Date().toISOString(), rule, user, ...(afterSignOut ? { afterSignOut: true } : {}) },
    followUpActionDeps(),
  );
}

export const mockFollowUpService: IFollowUpService = {
  async loadItems(opts = {}): Promise<LoadedFollowUps> {
    const [everything, visible, isSurgical, expectations, records] = await Promise.all([
      caseRouter.getAll(undefined, { includeOrchestration: true, bypassAccessControl: true }),
      opts.allCases ? Promise.resolve(null) : caseRouter.getAll(undefined, { includeOrchestration: true }),
      surgicalTest(),
      followUpStore.getExpectations(),
      followUpStore.getRecords(),
    ]);
    const cases: FollowUpCaseInfo[] = (everything.ok ? everything.data : []).map(c => toFollowUpCaseInfo(c, isSurgical));
    const settings = await settingsByFacility(cases.map(c => c.facilityId));
    const settingsFor = (facilityId: string | undefined) => settings.get(facilityId ?? '') ?? settings.get('')!;
    const items = resolveFollowUpItems({
      cases, expectations, records, now: opts.now ?? new Date(),
      warningDaysFor: f => (settings.get(f ?? '') ?? settings.get(''))?.warningDays ?? 0,
    });
    if (visible === null) return { items, settingsFor };
    const visibleIds = new Set((visible.ok ? visible.data : []).map(c => c.id));
    return { items: items.filter(i => visibleIds.has(i.caseId)), settingsFor };
  },

  async getExpectation(caseId) {
    return (await followUpStore.getExpectations()).find(e => e.caseId === caseId) ?? null;
  },

  markExpected: (caseId, opts, actor) => markFor(caseId, actor, opts.afterSignOut === true),

  recordDisposition: (ref, value, note, actor) =>
    recordFollowUpDisposition({ key: ref.key, caseId: ref.caseId, accession: ref.accession, facilityId: ref.facilityId, value, note, user: actor }, followUpActionDeps()),

  reopen: (ref, actor) =>
    reopenFollowUp({ key: ref.key, caseId: ref.caseId, accession: ref.accession, facilityId: ref.facilityId, user: actor }, followUpActionDeps()),

  /** The follow-up is read again first, so the checks use its status and facility now, not the screen's copy. */
  async emailClinician(ref, draft, actor) {
    const fresh = (await mockFollowUpService.loadItems()).items.find(i => i.key === ref.key);
    if (!fresh) return { ok: false, reason: 'notOpen' };
    return emailOrderingClinician({ item: fresh, ...draft, user: actor }, clinicianDeps());
  },
};
