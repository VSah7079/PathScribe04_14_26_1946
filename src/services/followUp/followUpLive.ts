// src/services/followUp/followUpLive.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 454: follow-up tracking wired to the real services, so screens call
// these (through @/services) and never a mock.
//
// Received-or-not is decided over every case (a resection may be at another
// facility the viewer can't open), but a screen is only given the follow-ups
// on cases the viewer can open (caseRouter's access rules). The alert sweep is
// a system task and sees them all.
// ─────────────────────────────────────────────────────────────────────────────

import i18n from '@/i18n/config';
import { formatDate } from '@/utils/formatDate';
import { caseRouter } from '../cases/CaseRouter';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { mockAuditService } from '../auditlog/mockAuditService';
import { mockSpecimenDictionaryService } from '../specimenDictionary/mockSpecimenDictionaryService';
import { mockMessageService } from '../messages/mockMessageService';
import { mockUserService } from '../users/mockUserService';
import { mockPhysicianService } from '../physicians/mockPhysicianService';
import { mockFacilityService } from '../facilities/mockFacilityService';
import { sendEmail } from '../communications/notificationService';
import { getEffectiveBiopsyResectionRule } from '../quality/biopsyResectionCorrelationSettings';
import { followUpStore, type IFollowUpStore } from './followUpStore';
import { FOLLOW_UP_PLACEHOLDERS_AS_WRITTEN, getEffectiveFollowUpSettings, type EffectiveFollowUpSettings } from './followUpSettings';
import { followUpCaseIdsForUser, resolveFollowUpItems, toFollowUpCaseInfo, type FollowUpCaseInfo } from './followUpTracking';
import {
  markFollowUpExpected, noteFollowUpAlertSent, recordFollowUpDisposition, reopenFollowUp, followUpMarkOffer,
  type FollowUpActionDeps, type FollowUpActionResult, type FollowUpUser, type FollowUpMarkOffer,
} from './followUpActions';
import { draftFollowUpClinicianEmail, emailOrderingClinician, type ClinicianEmailDeps, type FollowUpEmailDraft } from './followUpClinicianEmail';
import { followUpAlertRecipients, followUpAlertsDue } from './followUpAlerts';
import type { FollowUpDisposition, FollowUpExpectation, FollowUpItem, FollowUpRecord } from './followUpTypes';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** i18next would otherwise empty the template's {{placeholders}}. */
const KEEP_PLACEHOLDERS = FOLLOW_UP_PLACEHOLDERS_AS_WRITTEN;

const actionDeps = (store: IFollowUpStore = followUpStore): FollowUpActionDeps => ({
  enforce: (capability, context) => authorizationService.enforce(capability as any, (context ?? {}) as any),
  store,
  now: () => new Date(),
  logAudit: event => mockAuditService.logEvent(event as any),
});

const clinicianDeps = (): ClinicianEmailDeps => ({
  ...actionDeps(),
  sendEmail: payload => sendEmail(payload),
  getSettings: facilityId => getEffectiveFollowUpSettings(facilityId),
});

async function surgicalTest(): Promise<(specimen: any) => boolean> {
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

export interface LoadedFollowUps {
  items: FollowUpItem[];
  /** The settings that apply to each item's facility ('' = none). */
  settingsFor: (facilityId: string | undefined) => EffectiveFollowUpSettings;
}

/** Every follow-up, with its status today. `allCases` is for system tasks only. */
export async function loadFollowUpItems(opts: { allCases?: boolean; now?: Date } = {}): Promise<LoadedFollowUps> {
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
}

/** One sweep at a time: the worklists and the Follow-up tab each start one
 *  when they load, and two overlapping sweeps would both send. */
let sweepInFlight: Promise<number> | null = null;

/** Sends the internal alerts that are due, once each. Returns how many follow-ups were alerted. */
export function sendFollowUpAlertsLive(now: Date = new Date()): Promise<number> {
  if (!sweepInFlight) sweepInFlight = runFollowUpAlertSweep(now).finally(() => { sweepInFlight = null; });
  return sweepInFlight;
}

async function runFollowUpAlertSweep(now: Date): Promise<number> {
  const { items } = await loadFollowUpItems({ allCases: true, now });
  const due = followUpAlertsDue(items);
  if (!due.length) return 0;
  const users = await mockUserService.getAll();
  const staff = users.ok ? users.data : [];
  const date = (iso: string) => formatDate(iso, i18n.language);
  for (const { item, level } of due) {
    // Claimed before sending, so a later sweep never repeats it. A message
    // the inbox refuses is not retried (the Follow-up tab still lists it).
    await noteFollowUpAlertSent(item.key, level, now, followUpStore);
    const recipients = followUpAlertRecipients(item, staff as any);
    const vars = { accession: item.accession, days: item.daysOverdue ?? item.daysRemaining ?? 0, dueDate: date(item.dueAt) };
    const kindLabel = i18n.t(`followUp.kind.${item.kind}`);
    await Promise.all(recipients.map(u => mockMessageService.send({
      senderId: 'system',
      senderName: i18n.t('followUp.alert.sender'),
      recipientId: u.id,
      recipientName: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
      subject: i18n.t(`followUp.alert.${level}Subject`, { ...vars, kind: kindLabel }),
      body: i18n.t(`followUp.alert.${level}Body`, { ...vars, kind: kindLabel, count: vars.days }),
      caseNumber: item.accession,
      timestamp: now,
      isUrgent: level === 'overdue',
    }).catch(() => undefined)));
  }
  return due.length;
}

/** The pathologist worklist's Follow-up tile: their signed-out cases with a
 *  follow-up due soon or overdue. Also sends any internal alerts now due
 *  (once each), in the background. */
export async function loadFollowUpCaseIdsForUser(userId: string | undefined): Promise<Set<string>> {
  void sendFollowUpAlertsLive().catch(() => undefined);
  const { items } = await loadFollowUpItems();
  return followUpCaseIdsForUser(items, userId);
}

/** At surgical sign-out: marks the case "follow-up expected" with its facility's window. */
export async function markFollowUpExpectedLive(caseId: string, user: FollowUpUser): Promise<FollowUpActionResult<FollowUpExpectation>> {
  const found = await caseRouter.getCase(caseId);
  if (!found) return { ok: false, reason: 'caseNotFound' };
  const c: any = found;
  const caseInfo = toFollowUpCaseInfo(c, await surgicalTest());
  const rule = await getEffectiveBiopsyResectionRule(caseInfo.facilityId);
  return markFollowUpExpected({ caseInfo, signedOutAt: c.finalizedAt ?? new Date().toISOString(), rule, user }, actionDeps());
}

/** Batch 459: what the report page offers for this case (mark after sign-out, or the existing mark). */
export async function loadFollowUpMarkOffer(caseId: string): Promise<FollowUpMarkOffer> {
  const found: any = await caseRouter.getCase(caseId);
  if (!found) return { kind: 'none' };
  const expectation = (await followUpStore.getExpectations()).find(e => e.caseId === caseId) ?? null;
  return followUpMarkOffer({ status: found.status, caseInfo: toFollowUpCaseInfo(found, await surgicalTest()), expectation });
}

/** Batch 459: "Follow-up expected" marked from the report page after sign-out (case:follow-up:expect). */
export async function markFollowUpExpectedAfterSignOutLive(caseId: string, user: FollowUpUser): Promise<FollowUpActionResult<FollowUpExpectation>> {
  const found: any = await caseRouter.getCase(caseId);
  if (!found) return { ok: false, reason: 'caseNotFound' };
  const caseInfo = toFollowUpCaseInfo(found, await surgicalTest());
  const rule = await getEffectiveBiopsyResectionRule(caseInfo.facilityId);
  return markFollowUpExpected({ caseInfo, signedOutAt: found.finalizedAt ?? new Date().toISOString(), rule, user, afterSignOut: true }, actionDeps());
}

export const recordFollowUpDispositionLive = (
  item: FollowUpItem, value: FollowUpDisposition, note: string | undefined, user: FollowUpUser,
): Promise<FollowUpActionResult<FollowUpRecord>> =>
  recordFollowUpDisposition({ key: item.key, caseId: item.caseId, accession: item.accession, facilityId: item.facilityId, value, note, user }, actionDeps());

export const reopenFollowUpLive = (item: FollowUpItem, user: FollowUpUser): Promise<FollowUpActionResult<FollowUpRecord>> =>
  reopenFollowUp({ key: item.key, caseId: item.caseId, accession: item.accession, facilityId: item.facilityId, user }, actionDeps());

/** The clinician email as first shown: the lab's template (or the built-in
 *  wording in the user's language), filled in. */
export async function draftFollowUpClinicianEmailLive(
  item: FollowUpItem, senderName: string, formatDateFor: (iso: string) => string,
): Promise<FollowUpEmailDraft> {
  const [physician, facility, settings] = await Promise.all([
    item.orderingPhysicianId ? mockPhysicianService.getById(item.orderingPhysicianId) : Promise.resolve(null),
    item.facilityId ? mockFacilityService.getById(item.facilityId) : Promise.resolve(null),
    getEffectiveFollowUpSettings(item.facilityId),
  ]);
  return draftFollowUpClinicianEmail({
    item,
    clinician: physician && (physician as any).ok ? (physician as any).data : null,
    settings,
    // The built-in wording keeps its placeholders for draftFollowUpClinicianEmail to fill.
    defaults: { subject: i18n.t('followUp.email.defaultSubject', KEEP_PLACEHOLDERS), body: i18n.t('followUp.email.defaultBody', KEEP_PLACEHOLDERS) },
    labName: facility && (facility as any).ok ? (facility as any).data?.name ?? '' : '',
    senderName,
    formatDate: formatDateFor,
  });
}

/** Sends the reviewed email. The follow-up is read again first, so the
 *  checks use its status and facility now, not the screen's copy. */
export async function emailOrderingClinicianLive(
  item: FollowUpItem, draft: { to: string; subject: string; body: string }, user: FollowUpUser,
): Promise<FollowUpActionResult<FollowUpRecord>> {
  const fresh = (await loadFollowUpItems()).items.find(i => i.key === item.key);
  if (!fresh) return { ok: false, reason: 'notOpen' };
  return emailOrderingClinician({ item: fresh, ...draft, user }, clinicianDeps());
}
