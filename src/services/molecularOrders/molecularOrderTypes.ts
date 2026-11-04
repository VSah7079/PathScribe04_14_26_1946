// src/services/molecularOrders/molecularOrderTypes.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 467 (Pete's spec "In-House Molecular Order Queue & Plate Binding
// Engine", v1.1.0): the in-house molecular order and the words the engine
// and its API speak. The screens never decide an order's status or what may
// be done with it — they render the engine's view (MolecularQueueView) and
// send it actions (MolecularOrderAction). See
// docs/architecture/MOLECULAR_ORDERS_API.md for the server contract.
// ─────────────────────────────────────────────────────────────────────────────

/** Spec `OrderStatus`. ORDERED: placed, not yet routed; QUEUED: waiting (in-house: for a plate; send-out: for the
 *  reference lab); PLATE_ASSIGNED: bound to a well of a draft plate; IN_RUN: the plate's worklist was dispatched;
 *  RESULTED: the run's result for its well arrived; CANCELLED. */
export const MOLECULAR_ORDER_STATUSES = ['ORDERED', 'QUEUED', 'PLATE_ASSIGNED', 'IN_RUN', 'RESULTED', 'CANCELLED'] as const;
export type MolecularOrderStatus = typeof MOLECULAR_ORDER_STATUSES[number];

/** Spec `ExecutionRouting`. */
export const EXECUTION_ROUTINGS = ['IN_HOUSE', 'SEND_OUT'] as const;
export type ExecutionRouting = typeof EXECUTION_ROUTINGS[number];

/** Spec audit events, emitted by the engine (never by a screen). */
export const MOLECULAR_ORDER_AUDIT_EVENTS = [
  'MOLECULAR_ORDER_CREATED', 'MOLECULAR_ORDER_QUEUED', 'PLATE_ASSIGNED', 'WORKLIST_DISPATCHED', 'RUN_RESULTS_RECEIVED', 'REPORT_FIELD_HYDRATED',
] as const;
export type MolecularOrderAuditEvent = typeof MOLECULAR_ORDER_AUDIT_EVENTS[number];

/** What happened to the report when the result arrived. */
export type HydrationOutcome =
  | 'hydrated'          // the bound synoptic question was empty (or already said the same) and now holds the result
  | 'suggested'         // the question already held another answer: kept; the result shows beside it to accept
  | 'notBound'          // no synoptic question on the case is bound to this assay
  | 'notReportable'     // the run's call can't be reported (invalid, indeterminate, flagged, or controls failed)
  | 'addendumQueued'    // the case or its synoptic is signed out: the report isn't changed; an addendum draft is
                        // opened for the case's pathologist (Pete: late results go to the addendum queue)
  | 'addendumNotOpened' // signed out, report unchanged, but no addendum draft could be opened (no assigned
                        // pathologist, or the draft failed): someone must add it by hand
  | 'reportOnly'        // Batch 467b: the reference lab sent a report with no coded result: the answer is entered from it
  | 'resultMismatch';   // the run's result for the order's well names another specimen (or the well no longer holds
                        // the order): nothing is applied and the order stays running

/** Spec `queueItemSchema`, plus what the engine keeps to run the order. */
export interface MolecularOrder {
  orderId: string;
  caseId: string;
  accession: string;
  specimenId: string;
  specimenLabel: string;
  blockId: string;
  blockLabel: string;
  /** The test (Diagnostic Catalog StainType.id, category Molecular). */
  assayTarget: string;
  assayName: string;
  routing: ExecutionRouting;
  /** SEND_OUT: the reference lab. */
  sendOutLabId?: string;
  sendOutLabName?: string;
  /** The performing lab the order was placed for (the in-house lab when IN_HOUSE). */
  performingLabFacilityId?: string;
  /** The add-on StainOrder on the block it came from. */
  stainOrderId?: string;
  orderedBy: string;
  orderedByName: string;
  orderedAt: string;
  status: MolecularOrderStatus;
  /** PLATE_ASSIGNED onwards. */
  plate?: { batchId: string; batchUuid: string; plateBarcode: string; wellPosition: string };
  /** SEND_OUT, sent (Batch 467b): the referral batch that took it to the reference lab. */
  referral?: { batchId: string; labId: string; sentAt: string };
  /** RESULTED: from an in-house plate (batchUuid) or a reference lab's referral batch (referralBatchId). */
  result?: { interpretation: string; flag: string; controlsPassed: boolean; receivedAt: string; batchUuid?: string; referralBatchId?: string };
  hydration?: { outcome: HydrationOutcome; instanceId?: string; fieldId?: string; addendumId?: string; at: string };
  cancelledAt?: string;
  cancelledBy?: string;
}

/** What the engine takes in when an order is placed (spec ingestion endpoint). */
export interface MolecularOrderIngest {
  caseId: string;
  accession: string;
  specimenId: string;
  specimenLabel: string;
  blockId: string;
  blockLabel: string;
  assayTarget: string;
  /** The routing the pathologist chose; the engine checks it against the test and lab. */
  routing?: ExecutionRouting;
  sendOutLabId?: string;
  sendOutLabName?: string;
  performingLabFacilityId?: string;
  stainOrderId?: string;
  orderedBy: string;
  orderedByName: string;
}

/** Spec `uiContracts.actionDispatch`: the actions a screen sends. */
export type MolecularOrderAction =
  | { type: 'ASSIGN_TO_PLATE'; orderIds: string[]; batchId: string }
  | { type: 'REMOVE_FROM_PLATE'; orderId: string }
  | { type: 'CANCEL'; orderId: string }
  /** Batch 467 (Pete): the lab no longer runs the test in-house — send the queued order out instead. */
  | { type: 'REROUTE_TO_SEND_OUT'; orderId: string }
  /** Batch 467b: choose (or change) a queued send-out order's reference lab. */
  | { type: 'SET_SEND_OUT_LAB'; orderId: string; labId: string };
export type MolecularOrderActionType = MolecularOrderAction['type'];

/** Why the engine refused an action (a locale key under molecularOrders.errors). */
export type MolecularOrderRefusal =
  | 'notPermitted' | 'orderNotFound' | 'wrongStatus' | 'sendOut' | 'plateNotFound' | 'plateNotDraft'
  | 'assayMismatch' | 'plateFull' | 'routingNotAvailable' | 'testNotFound' | 'labNotAllowed';

/** Spec `uiContracts.viewStateQuery`: one row, already decided — the screen only shows it. */
export interface MolecularQueueRow {
  orderId: string;
  caseId: string;
  accession: string;
  specimenBlock: string;
  assayTarget: string;
  assayName: string;
  routing: ExecutionRouting;
  sendOutLabName?: string;
  status: MolecularOrderStatus;
  /** What the status reads as: a send-out order at its reference lab reads "At the reference lab" (Batch 467b). */
  statusLabel: MolecularOrderStatus | 'SENT_OUT';
  orderedByName: string;
  orderedAt: string;
  /** Batch 467b, a queued send-out order: the labs it may go to, the one chosen, and whether one is still needed. */
  labChoices?: { id: string; name: string }[];
  sendOutLabId?: string;
  needsLab?: boolean;
  /** Batch 467b: the referral batch that took it to the reference lab. */
  referralBatchId?: string;
  /** Batch 467b: where its result will come from — an instrument (on a plate or running) or a reference lab (a
   *  send-out order not yet resulted). Absent: no result is awaited. */
  awaitingResultFrom?: 'instrument' | 'referenceLab';
  /** On a plate: its barcode and the order's well (the screen joins them). */
  plateBarcode?: string;
  wellPosition?: string;
  plateBatchId?: string;
  interpretation?: string;
  hydration?: HydrationOutcome;
  /** An in-house order whose lab no longer runs the test in-house: it can't go on a plate until re-routed
   *  ('reroute': queued, send it out or cancel; 'removeFirst': on a plate, take it off first). */
  needsReroute?: 'reroute' | 'removeFirst';
  /** The actions this row offers now (empty: none). */
  actions: MolecularOrderActionType[];
}
/** A draft plate an in-house order of this assay can go on. */
export interface MolecularPlateOption { batchId: string; plateBarcode: string; instrument: string; assayTarget: string; freeWells: number }
export interface MolecularQueueView { rows: MolecularQueueRow[]; plates: MolecularPlateOption[] }

export interface MolecularOrderActionResult { ok: boolean; refused?: MolecularOrderRefusal; view?: MolecularQueueView }

/** The badge hue for each status (the screen draws it; the colour is decided here). */
export const MOLECULAR_ORDER_STATUS_HUE: Readonly<Record<MolecularOrderStatus, string>> = {
  ORDERED: '#64748b', QUEUED: '#0891b2', PLATE_ASSIGNED: '#7c3aed', IN_RUN: '#d97706', RESULTED: '#16a34a', CANCELLED: '#6b7280',
};

/** Batch 467b: a referral batch sent to its reference lab (services/batches, External Referral). */
export interface ReferralDispatchInput {
  batchId: string;
  labId: string;
  items: { caseAccession: string; specimenLabel?: string }[];
  /** The batch's requested test as entered (free text): an order is carried when it is the test's catalog name or id. */
  testRequested?: string;
  /** The tests the batch was sent for (catalog ids), when known exactly. */
  assayCodes?: string[];
}

/** Batch 467b: one coded result a reference lab sent for a referral batch. */
export interface SendOutOrderResult {
  /** PathScribe's order id, when the reference lab echoes it (the manifest carries it). */
  orderId?: string;
  caseAccession: string;
  /** The test (catalog id), when the lab reports it. */
  assayCode?: string;
  interpretation: 'POSITIVE' | 'NEGATIVE' | 'INDETERMINATE' | 'INVALID';
  flag?: 'NONE' | 'INHIBITED' | 'LOW_SIGNAL' | 'REPEAT_REQUIRED';
}
export interface SendOutResultInput {
  batchId: string;
  results?: SendOutOrderResult[];
  /** The message is the reference lab's final report (a PDF) with no coded results. An interim or free-text message
   *  is not. */
  reportOnly?: boolean;
}
