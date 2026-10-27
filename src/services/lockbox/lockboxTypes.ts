// src/services/lockbox/lockboxTypes.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 645: the records of Lockbox Drop-Off. After-hours specimens are dropped in a lockbox; a receipt is the electronic
// record between the drop and the morning accessioning.
//
//   LockboxReceipt     "Received in Lockbox". Written once and never changed (append-only). The server stamps the time
//                      and the user from the token; the browser's version of either is ignored.
//   LockboxResolution  what happened to a receipt afterwards: a placeholder was linked to its real order or accession
//                      number, or the specimen was accessioned. A resolution is a new entry; the receipt is not edited.
//
// A receipt is one of two states, decided by the server from the container barcode:
//   matchedOrder  a pending LIS or imported order carries the barcode: the receipt holds the accession number and the
//                 ordering facility. No patient name, date of birth or MRN is read, stored or shown by the kiosk.
//   placeholder   no order matches (or the barcode is unknown): a temporary placeholder record keeps the chain of
//                 custody. It follows the downtime / temporary-identity pattern (a flagged placeholder, later rebound with
//                 an audit entry) but holds no patient at all and NEVER uses a real accession number.
// ─────────────────────────────────────────────────────────────────────────────
import type { ID } from '../types';

export type LockboxState = 'matchedOrder' | 'placeholder';

/** Who did it, from the token. Staff names are not patient PHI. */
export interface LockboxActor { userId: string; userName: string }

export interface LockboxReceipt {
  id: ID;
  /** The scanned container barcode, normalised (see normalizeBarcode). One receipt per barcode. */
  barcode: string;
  state: LockboxState;
  /** Server time of the receipt. Never taken from the browser. */
  receivedAt: string;
  receivedBy: LockboxActor;
  /** An urgent drop (intraoperative or urgent): high priority, shown first in the Overnight folder. */
  urgent: boolean;
  /** Optional callback number given with an urgent drop. A staff or clinic number, not patient data. */
  callbackNumber?: string;
  // matchedOrder
  /** The order's accession number as the LIS or the import knows it. Patient identifier: shown only inside data-phi. */
  accessionNumber?: string;
  /** The pending order this matched (an opaque id, never a name). */
  orderId?: ID;
  // placeholder
  /** Placeholder id, such as LBX-PH-20261021-001. Not an accession number. */
  placeholderId?: string;
  /** The time the person says the specimen was dropped (placeholder only); receivedAt is still the server's time. */
  reportedDropAt?: string;
  /** The ordering physician picked from the dictionary, if any. */
  physicianId?: ID;
  physicianName?: string;
  /** An ordering client typed in because it is not in the list. */
  clientFreeText?: string;
  // both
  /** The ordering client picked from the dictionary (matchedOrder: from the order). */
  facilityId?: ID;
  facilityName?: string;
}

export type LockboxResolutionKind = 'placeholderResolved' | 'accessioned';

export interface LockboxResolution {
  id: ID;
  receiptId: ID;
  kind: LockboxResolutionKind;
  /** Server time of this entry. */
  at: string;
  by: LockboxActor;
  /** placeholderResolved: the real accession or order number attached. accessioned: the accession number, when known. */
  accessionNumber?: string;
  /** placeholderResolved: the pending order the number matched, when it did. */
  orderId?: ID;
  /** accessioned: the case created from this receipt (Batch 652). Absent on a manual "Mark accessioned" with no case link. */
  caseId?: ID;
}

/** What the scanner's barcode means right now. The browser never decides this; the server does. */
export type LockboxLookup =
  | { kind: 'duplicate'; receipt: LockboxReceipt }
  | { kind: 'matchedOrder'; accessionNumber: string; facilityId?: ID; facilityName?: string }
  | { kind: 'unmatched' };

/** The placeholder details asked for when no order matches. Everything is optional: a drop is never refused for lack of them. */
export interface LockboxPlaceholderInput {
  facilityId?: ID;
  clientFreeText?: string;
  physicianId?: ID;
  /** Local date and time as the person entered it, as an ISO string. Defaults to the time of the receipt. */
  reportedDropAt?: string;
}

/** Batch 652: what the Accession screen sends when a case is created from a pending order. At least one of the three finds the receipt. */
export interface LockboxCaseLinkInput {
  caseId: ID;
  /** The pending order the case was created from. */
  orderId?: ID;
  /** The order or accession number (the container barcode on the receipt). */
  accessionNumber?: string;
  /** A receipt number, when the receipt itself was scanned or chosen. */
  receiptId?: ID;
}

/** What the browser sends to receive a specimen. Time and user are not in it: the server stamps both. */
export interface LockboxReceiveInput {
  barcode: string;
  urgent?: boolean;
  callbackNumber?: string;
  placeholder?: LockboxPlaceholderInput;
}

export type LockboxFolderStatus = 'matched' | 'placeholderOpen' | 'placeholderLinked';

export interface LockboxFolderEntry {
  receipt: LockboxReceipt;
  status: LockboxFolderStatus;
  /** The placeholder's real accession or order number once linked. */
  linkedAccessionNumber?: string;
  /** Minutes since the drop (placeholder: the person's drop time when it is plausible), as of the time of the listing. */
  dwellMinutes: number;
}

/** Drop-to-accessioned figures for QA. Minutes. */
export interface LockboxTimeSummary {
  accessionedCount: number;
  medianMinutes: number | null;
  meanMinutes: number | null;
  maxMinutes: number | null;
  urgentAccessionedCount: number;
  urgentMedianMinutes: number | null;
  /** Receipts still in the folder, and the longest wait among them. */
  waitingCount: number;
  oldestWaitingMinutes: number | null;
}

export interface LockboxFolder {
  entries: LockboxFolderEntry[];
  summary: LockboxTimeSummary;
  /** Server time of the listing; dwell is measured to it. */
  asOf: string;
}

export type LockboxRefusal =
  | 'NOT_PERMITTED'    // the capability is not held
  | 'INVALID'          // empty or unusable barcode, or a bad value
  | 'CONFLICT'         // the barcode already has a receipt (409): ask lookup for the earlier one
  | 'NOT_FOUND'        // no such receipt
  | 'ALREADY_ACCESSIONED'
  | 'PLACEHOLDER_UNRESOLVED' // a placeholder cannot be accessioned until its real number is attached
  | 'NOT_A_PLACEHOLDER';
