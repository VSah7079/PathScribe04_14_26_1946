// src/services/followUp/followUpLive.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 454: follow-up tracking wired to the real services, so screens call
// these (through @/services) and never a mock. Batch 616: the commands go to
// followUpService (the demo's, or the API server's, command-based); this file
// keeps what only the browser does (the demo alert sweep, the email draft).
//
// Received-or-not is decided over every case (a resection may be at another
// facility the viewer can't open), but a screen is only given the follow-ups
// on cases the viewer can open (caseRouter's access rules). The alert sweep is
// a system task and sees them all.
// ─────────────────────────────────────────────────────────────────────────────

import { browserRunsServerJob } from '../serverJobs/browserStandIns';
import i18n from '@/i18n/config';
import { formatDate } from '@/utils/formatDate';
import { caseRouter } from '../cases/CaseRouter';
import { mockMessageService } from '../messages/mockMessageService';
import { mockUserService } from '../users/mockUserService';
import { mockPhysicianService } from '../physicians/mockPhysicianService';
import { mockFacilityService } from '../facilities/mockFacilityService';
import { followUpStore } from './followUpStore';
import { FOLLOW_UP_PLACEHOLDERS_AS_WRITTEN, getEffectiveFollowUpSettings } from './followUpSettings';
import { followUpCaseIdsForUser, toFollowUpCaseInfo } from './followUpTracking';
import { noteFollowUpAlertSent, followUpMarkOffer, type FollowUpActionResult, type FollowUpUser, type FollowUpMarkOffer } from './followUpActions';
import { draftFollowUpClinicianEmail, type FollowUpEmailDraft } from './followUpClinicianEmail';
import { followUpAlertRecipients, followUpAlertsDue } from './followUpAlerts';
import type { FollowUpDisposition, FollowUpExpectation, FollowUpItem, FollowUpRecord } from './followUpTypes';
import { followUpService } from './followUpServiceInstance';
import { surgicalTest } from './mockFollowUpService';
import type { LoadedFollowUps } from './IFollowUpService';

/** i18next would otherwise empty the template's {{placeholders}}. */
const KEEP_PLACEHOLDERS = FOLLOW_UP_PLACEHOLDERS_AS_WRITTEN;

export type { LoadedFollowUps };

/** Every follow-up, with its status today. `allCases` is for system tasks only (the demo's alert sweep); the server limits the list to cases the caller can open. */
export const loadFollowUpItems = (opts: { allCases?: boolean; now?: Date } = {}): Promise<LoadedFollowUps> => followUpService.loadItems(opts);

/** One sweep at a time: the worklists and the Follow-up tab each start one
 *  when they load, and two overlapping sweeps would both send. */
let sweepInFlight: Promise<number> | null = null;

/** Sends the internal alerts that are due, once each. Returns how many follow-ups were alerted. */
export function sendFollowUpAlertsLive(now: Date = new Date()): Promise<number> {
  // Batch 555: once the API server runs followUp.dailyAlerts (VITE_SERVER_JOBS), it sends them.
  if (!browserRunsServerJob('followUp.dailyAlerts')) return Promise.resolve(0);
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

/** At surgical sign-out: marks the case "follow-up expected" with its facility's window (the window is worked out by whoever runs the service: the server, or the demo). */
export const markFollowUpExpectedLive = (caseId: string, user: FollowUpUser): Promise<FollowUpActionResult<FollowUpExpectation>> =>
  followUpService.markExpected(caseId, {}, user);

/** Batch 459: what the report page offers for this case (mark after sign-out, or the existing mark). */
export async function loadFollowUpMarkOffer(caseId: string): Promise<FollowUpMarkOffer> {
  const found: any = await caseRouter.getCase(caseId);
  if (!found) return { kind: 'none' };
  const expectation = await followUpService.getExpectation(caseId);
  return followUpMarkOffer({ status: found.status, caseInfo: toFollowUpCaseInfo(found, await surgicalTest()), expectation });
}

/** Batch 459: "Follow-up expected" marked from the report page after sign-out (case:follow-up:expect). */
export const markFollowUpExpectedAfterSignOutLive = (caseId: string, user: FollowUpUser): Promise<FollowUpActionResult<FollowUpExpectation>> =>
  followUpService.markExpected(caseId, { afterSignOut: true }, user);

export const recordFollowUpDispositionLive = (
  item: FollowUpItem, value: FollowUpDisposition, note: string | undefined, user: FollowUpUser,
): Promise<FollowUpActionResult<FollowUpRecord>> => followUpService.recordDisposition(item, value, note, user);

export const reopenFollowUpLive = (item: FollowUpItem, user: FollowUpUser): Promise<FollowUpActionResult<FollowUpRecord>> =>
  followUpService.reopen(item, user);

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

/** Sends the reviewed email. The follow-up is read again first (by the service), so the checks use its status and facility now, not the screen's copy. */
export const emailOrderingClinicianLive = (
  item: FollowUpItem, draft: { to: string; subject: string; body: string }, user: FollowUpUser,
): Promise<FollowUpActionResult<FollowUpRecord>> => followUpService.emailClinician(item, draft, user);
