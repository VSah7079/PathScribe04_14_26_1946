// src/services/followUp/followUpTracking.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 454: which follow-ups are expected, and where each one stands. Pure:
// followUpLive.ts loads the cases, expectations, records and settings.
//
//   cytology  every specimen with a stored correlation window (an abnormal
//             sign-out, PS-156). Received when a histology case was matched
//             to it (a correlation candidate not dismissed as not relevant).
//   surgical  every case marked "follow-up expected" at sign-out. Received
//             when another case for the same patient has a surgical specimen
//             collected or received inside the window whose recorded site
//             matches (and side, when both record one). A specimen with no
//             site to compare is only a possible match for the lab to
//             confirm: stricter than correlation candidates, because here a
//             wrong match would silently close a follow-up.
// A disposition closes either kind. Without one, the status follows the
// clock: pending, then dueSoon for the facility's warning days, then overdue.
// ─────────────────────────────────────────────────────────────────────────────

import { isInCorrelationWindow, type CorrelationWindow } from '../cytology/cytologyHistologyCorrelationWindow';
import { resolveSiteMatchStatus } from '../quality/resolveSurgicalBiopsyToResectionCorrelationCandidates';
import {
  emptyFollowUpRecord, followUpKey, needsFollowUpAttention,
  type FollowUpExpectation, type FollowUpItem, type FollowUpRecord, type FollowUpStatus,
} from './followUpTypes';

const DAY = 86_400_000;

export interface FollowUpSpecimenInfo {
  id: string;
  collectedAt?: string;
  receivedAt?: string;
  /** Not cytology or FNA (the same test the correlation code uses). */
  surgical: boolean;
  bodySite?: string;
  laterality?: string;
  /** The stored cytology correlation window, when the sign-out was abnormal. */
  cytologyWindow?: CorrelationWindow;
  cytologyCandidates?: { candidateCaseId: string; dismissedAsNotRelevant?: boolean }[];
}

export interface FollowUpCaseInfo {
  id: string;
  accession: string;
  patientId?: string;
  facilityId?: string;
  finalizedBy?: string;
  orderingPhysicianId?: string;
  requestingProvider?: string;
  specimens: FollowUpSpecimenInfo[];
}

/** A case as follow-up tracking reads it. `isSurgical` decides a specimen's kind. */
export function toFollowUpCaseInfo(c: any, isSurgical: (specimen: any) => boolean): FollowUpCaseInfo {
  return {
    id: c.id,
    accession: c.accession?.fullAccession || c.accession?.accessionNumber || c.accessionNumber || c.id,
    patientId: c.patient?.id,
    facilityId: c.order?.facilityId,
    finalizedBy: c.finalizedBy ?? undefined,
    orderingPhysicianId: c.order?.orderingPhysicianId,
    requestingProvider: c.order?.requestingProvider,
    specimens: (c.specimens ?? []).map((s: any) => ({
      id: s.id,
      collectedAt: s.collectedAt,
      receivedAt: s.receivedAt,
      surgical: isSurgical(s),
      bodySite: s.collection?.bodySite,
      laterality: s.collection?.laterality,
      cytologyWindow: s.cytologyScreening?.histologyCorrelationWindow,
      cytologyCandidates: s.cytologyScreening?.histologyCorrelationCandidates,
    })),
  };
}

export interface ResolveFollowUpInput {
  cases: readonly FollowUpCaseInfo[];
  expectations: readonly FollowUpExpectation[];
  records: readonly FollowUpRecord[];
  now: Date;
  /** The warning period for a facility, in days (0 = no early warning). */
  warningDaysFor: (facilityId: string | undefined) => number;
}

/** Where an unresolved follow-up stands on the clock. */
export function clockStatus(dueAt: string, now: Date, warningDays: number): { status: FollowUpStatus; daysRemaining: number | null; daysOverdue: number | null } {
  const diff = Date.parse(dueAt) - now.getTime();
  if (diff < 0) return { status: 'overdue', daysRemaining: null, daysOverdue: Math.max(1, Math.ceil(-diff / DAY)) };
  const daysRemaining = Math.floor(diff / DAY);
  return { status: warningDays > 0 && diff <= warningDays * DAY ? 'dueSoon' : 'pending', daysRemaining, daysOverdue: null };
}

/** What arrived for a surgical follow-up inside its window.
 *  `receivedCaseId`: a surgical specimen whose recorded site (and side, when
 *  both record one) matches the anchor's. Only this closes it as received.
 *  `possibleCaseId`: one with no site to compare. Shown to the lab as a
 *  possible match to confirm with an outcome; it doesn't close anything,
 *  because an unrelated specimen that day must not silently end a follow-up. */
export function surgicalFollowUpArrivals(
  expectation: Pick<FollowUpExpectation, 'caseId' | 'specimenId' | 'window'>,
  cases: readonly FollowUpCaseInfo[],
): { receivedCaseId?: string; possibleCaseId?: string } {
  const own = cases.find(c => c.id === expectation.caseId);
  if (!own?.patientId) return {};
  const anchor = own.specimens.find(s => s.id === expectation.specimenId) ?? {};
  const hits = cases
    .filter(c => c.id !== own.id && c.patientId === own.patientId)
    .flatMap(c => c.specimens
      .filter(s => s.surgical && isInCorrelationWindow(expectation.window, [s.collectedAt, s.receivedAt]))
      .map(s => ({ caseId: c.id, site: resolveSiteMatchStatus(anchor, s), at: Date.parse(s.collectedAt ?? s.receivedAt ?? '') })))
    .sort((a, b) => a.at - b.at);
  return {
    receivedCaseId: hits.find(h => h.site === 'matched')?.caseId,
    possibleCaseId: hits.find(h => h.site === 'unknown')?.caseId,
  };
}

/** The case that brought a surgical follow-up (a site-matched specimen in the window), if any. */
export const surgicalFollowUpReceivedBy = (
  expectation: Pick<FollowUpExpectation, 'caseId' | 'specimenId' | 'window'>,
  cases: readonly FollowUpCaseInfo[],
): string | undefined => surgicalFollowUpArrivals(expectation, cases).receivedCaseId;

function buildItem(
  base: Omit<FollowUpItem, 'status' | 'daysRemaining' | 'daysOverdue' | 'record' | 'key' | 'dueAt' | 'receivedCaseId' | 'receivedAccession' | 'possibleCaseId' | 'possibleAccession'>,
  arrivals: { receivedCaseId?: string; possibleCaseId?: string },
  record: FollowUpRecord | undefined,
  input: ResolveFollowUpInput,
  accessionOf: (caseId: string | undefined) => string | undefined,
): FollowUpItem {
  const key = followUpKey(base.kind, base.caseId, base.specimenId);
  const rec = record ?? emptyFollowUpRecord(key);
  const dueAt = base.window.endsAt;
  const { receivedCaseId, possibleCaseId } = arrivals;
  const found = {
    receivedCaseId, receivedAccession: accessionOf(receivedCaseId),
    possibleCaseId: receivedCaseId ? undefined : possibleCaseId, possibleAccession: receivedCaseId ? undefined : accessionOf(possibleCaseId),
  };
  if (rec.disposition) return { ...base, ...found, key, dueAt, record: rec, status: 'closed', daysRemaining: null, daysOverdue: null };
  if (receivedCaseId) return { ...base, ...found, key, dueAt, record: rec, status: 'received', daysRemaining: null, daysOverdue: null };
  return { ...base, ...found, key, dueAt, record: rec, ...clockStatus(dueAt, input.now, input.warningDaysFor(base.facilityId)) };
}

/** Every expected follow-up and where it stands. */
export function resolveFollowUpItems(input: ResolveFollowUpInput): FollowUpItem[] {
  const recordByKey = new Map(input.records.map(r => [r.key, r]));
  const caseById = new Map(input.cases.map(c => [c.id, c]));
  const items: FollowUpItem[] = [];
  const accession = (id?: string) => (id ? caseById.get(id)?.accession ?? id : undefined);

  for (const c of input.cases) {
    for (const s of c.specimens) {
      if (!s.cytologyWindow) continue;
      const received = (s.cytologyCandidates ?? []).find(x => !x.dismissedAsNotRelevant)?.candidateCaseId;
      items.push(buildItem({
        kind: 'cytology', caseId: c.id, specimenId: s.id, accession: c.accession, patientId: c.patientId,
        facilityId: c.facilityId, signedOutBy: c.finalizedBy, orderingPhysicianId: c.orderingPhysicianId,
        requestingProvider: c.requestingProvider, window: s.cytologyWindow,
      }, { receivedCaseId: received }, recordByKey.get(followUpKey('cytology', c.id, s.id)), input, accession));
    }
  }

  for (const e of input.expectations) {
    const c = caseById.get(e.caseId);
    if (!c) continue;
    items.push(buildItem({
      kind: 'surgical', caseId: c.id, specimenId: e.specimenId, accession: c.accession, patientId: c.patientId,
      facilityId: c.facilityId, signedOutBy: c.finalizedBy ?? e.markedBy, orderingPhysicianId: c.orderingPhysicianId,
      requestingProvider: c.requestingProvider, window: e.window,
    }, surgicalFollowUpArrivals(e, input.cases), recordByKey.get(followUpKey('surgical', c.id, e.specimenId)), input, accession));
  }

  return sortFollowUpItems(items);
}

const STATUS_ORDER: Record<FollowUpStatus, number> = { overdue: 0, dueSoon: 1, pending: 2, received: 3, closed: 4 };

/** Most urgent first: overdue (longest first), due soon, pending, then the rest by due date. */
export function sortFollowUpItems(items: FollowUpItem[]): FollowUpItem[] {
  return [...items].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || Date.parse(a.dueAt) - Date.parse(b.dueAt));
}

export type FollowUpFilter = 'attention' | 'overdue' | 'dueSoon' | 'open' | 'resolved' | 'all';

export function filterFollowUpItems(items: readonly FollowUpItem[], filter: FollowUpFilter): FollowUpItem[] {
  switch (filter) {
    case 'attention': return items.filter(i => i.status === 'overdue' || i.status === 'dueSoon');
    case 'overdue': return items.filter(i => i.status === 'overdue');
    case 'dueSoon': return items.filter(i => i.status === 'dueSoon');
    case 'open': return items.filter(i => i.status === 'overdue' || i.status === 'dueSoon' || i.status === 'pending');
    case 'resolved': return items.filter(i => i.status === 'received' || i.status === 'closed');
    default: return [...items];
  }
}

export function countFollowUpItems(items: readonly FollowUpItem[]): Record<FollowUpStatus, number> {
  const counts: Record<FollowUpStatus, number> = { overdue: 0, dueSoon: 0, pending: 0, received: 0, closed: 0 };
  for (const i of items) counts[i.status]++;
  return counts;
}

/** The surgical specimen whose date anchors a case's window: the earliest
 *  collected (or received) surgical specimen. */
export function followUpAnchorSpecimen(specimens: readonly FollowUpSpecimenInfo[]): FollowUpSpecimenInfo | undefined {
  const when = (s: FollowUpSpecimenInfo) => { const t = Date.parse(s.collectedAt ?? s.receivedAt ?? ''); return Number.isNaN(t) ? Infinity : t; };
  return specimens.filter(s => s.surgical).sort((a, b) => when(a) - when(b))[0];
}

/** The cases a pathologist signed out whose follow-up is due soon or overdue
 *  (their worklist's Follow-up tile). */
export function followUpCaseIdsForUser(items: readonly FollowUpItem[], userId: string | undefined): Set<string> {
  return new Set(userId ? items.filter(i => i.signedOutBy === userId && needsFollowUpAttention(i)).map(i => i.caseId) : []);
}

/** Cases with a cytology follow-up due soon or overdue (the Cytology
 *  worklist's Follow-up due tile). */
export function cytologyFollowUpCaseIds(items: readonly FollowUpItem[]): Set<string> {
  return new Set(items.filter(i => i.kind === 'cytology' && needsFollowUpAttention(i)).map(i => i.caseId));
}

/** Which case page a follow-up opens. */
export const followUpCaseView = (item: Pick<FollowUpItem, 'kind'>): 'cytology' | 'synoptic' => (item.kind === 'cytology' ? 'cytology' : 'synoptic');

/** The CSV rows for the report (column names in English, like every QA export;
 *  no patient name and no free-text note). */
export function followUpExportRows(items: readonly FollowUpItem[]): Record<string, string | number>[] {
  return items.map(i => {
    const lastContact = i.record.clinicianContacts.slice(-1)[0];
    return {
      'Case': i.accession,
      'Kind': i.kind,
      'Status': i.status,
      'Window start': i.window.startsAt.slice(0, 10),
      'Due': i.dueAt.slice(0, 10),
      'Days overdue': i.daysOverdue ?? '',
      'Days remaining': i.daysRemaining ?? '',
      'Ordering clinician': i.requestingProvider ?? '',
      'Clinician emailed': lastContact ? lastContact.sentAt.slice(0, 10) : '',
      'Times emailed': i.record.clinicianContacts.length,
      'Received in case': i.receivedCaseId ?? '',
      'Disposition': i.record.disposition?.value ?? '',
      'Disposition recorded': i.record.disposition?.recordedAt.slice(0, 10) ?? '',
    };
  });
}

/** The outcome action a row offers: record one while it's open, reopen a
 *  closed one, none once a follow-up arrived. */
export function followUpOutcomeAction(item: Pick<FollowUpItem, 'status'>): 'record' | 'reopen' | null {
  if (item.status === 'closed') return 'reopen';
  if (item.status === 'received') return null;
  return 'record';
}
