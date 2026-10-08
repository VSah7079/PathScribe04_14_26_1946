// src/services/followUp/followUpTypes.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 454 (Pete, Oct 4): tracking whether an expected follow-up specimen
// arrived. Two kinds, both with a window that closes on a due date:
//   • cytology: an abnormal cytology sign-out (category rank 1 or more)
//     already stores a correlation window (PS-156). The follow-up is a
//     histology specimen for that patient inside the window.
//   • surgical: the signing pathologist marks the case "follow-up expected"
//     at sign-out (the diagnosis is free text, so nothing can infer it).
//     The window is the configured biopsy-to-resection window (PS-324).
// The lab is warned before the due date (configurable), told when it has
// passed, records what happened (a disposition), and may email the ordering
// clinician. Nothing is ever sent to a clinician automatically (Pete: "that
// is up to the Laboratory").
// ─────────────────────────────────────────────────────────────────────────────

import type { CorrelationWindow } from '../cytology/cytologyHistologyCorrelationWindow';

export type FollowUpKind = 'cytology' | 'surgical';

/** pending: inside the window, not yet due soon. dueSoon: inside the warning
 *  period. overdue: past the due date with nothing received. received: a
 *  follow-up specimen arrived inside the window. closed: the lab recorded a
 *  disposition. */
export type FollowUpStatus = 'pending' | 'dueSoon' | 'overdue' | 'received' | 'closed';

export const FOLLOW_UP_DISPOSITIONS = [
  'receivedElsewhere', 'patientDeclined', 'notClinicallyIndicated', 'patientDeceased', 'lostToFollowUp', 'other',
] as const;
export type FollowUpDisposition = typeof FOLLOW_UP_DISPOSITIONS[number];

/** A surgical case marked "follow-up expected" at sign-out. */
export interface FollowUpExpectation {
  id: string;
  caseId: string;
  /** The specimen whose date anchors the window (the earliest surgical one). */
  specimenId: string;
  window: CorrelationWindow;
  markedBy: string;
  markedByName: string;
  markedAt: string;
  /** Batch 459: marked after the case was signed out (from the report page), not in the sign-out box. */
  markedAfterSignOut?: true;
}

export interface FollowUpClinicianContact {
  sentAt: string;
  sentBy: string;
  sentByName: string;
  to: string;
}

/** What the lab did about one follow-up, keyed by followUpKey(). */
export interface FollowUpRecord {
  key: string;
  disposition?: {
    value: FollowUpDisposition;
    note?: string;
    recordedBy: string;
    recordedByName: string;
    recordedAt: string;
  };
  clinicianContacts: FollowUpClinicianContact[];
  /** When each internal alert went out, so each is sent once. */
  alertsSent: { dueSoon?: string; overdue?: string };
}

export interface FollowUpItem {
  key: string;
  kind: FollowUpKind;
  caseId: string;
  specimenId: string;
  accession: string;
  patientId?: string;
  facilityId?: string;
  /** Who signed it out (user id), for the internal alert. */
  signedOutBy?: string;
  orderingPhysicianId?: string;
  requestingProvider?: string;
  window: CorrelationWindow;
  dueAt: string;
  status: FollowUpStatus;
  /** Whole days left until the due date (0 on the day), when not past it. */
  daysRemaining: number | null;
  /** Whole days past the due date, when past it. */
  daysOverdue: number | null;
  /** The case that satisfied it, when received (id, and accession to show). */
  receivedCaseId?: string;
  receivedAccession?: string;
  /** Surgical only: a specimen in the window with no site to compare. Not
   *  received; the lab confirms it (or not) with an outcome. */
  possibleCaseId?: string;
  possibleAccession?: string;
  record: FollowUpRecord;
}

export const followUpKey = (kind: FollowUpKind, caseId: string, specimenId: string) => `${kind}:${caseId}:${specimenId}`;

export const emptyFollowUpRecord = (key: string): FollowUpRecord => ({ key, clinicianContacts: [], alertsSent: {} });

/** Open items: nothing received and no disposition. */
export const isOpenFollowUp = (item: Pick<FollowUpItem, 'status'>) =>
  item.status === 'pending' || item.status === 'dueSoon' || item.status === 'overdue';

/** Items the lab should act on now. */
export const needsFollowUpAttention = (item: Pick<FollowUpItem, 'status'>) =>
  item.status === 'dueSoon' || item.status === 'overdue';
