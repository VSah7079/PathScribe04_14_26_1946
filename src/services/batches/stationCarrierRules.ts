// src/services/batches/stationCarrierRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 726 (Lab Workflow & Batch spec, Decision 1 and sections 2, 4, 7):
// the rules that link carriers (batches) to the workstations. Pure.
//
//   - which processing steps a station or workstation page works on;
//   - which open carriers belong on a station's list (routed to it first);
//   - what a carrier scan at a station means (open, hand-off from the step
//     before, output tray, mismatch, closed, unknown, or "set a station");
//   - which step a carrier may move to next, and when it can be sealed;
//   - what an item scan means against the carrier loaded at the station;
//   - the per-item scan events a carrier scan writes (spec §7.1).
//
// A carrier keeps its batch while it moves from step to step (Decal to
// Processing, Processing to Embedding, say: Decision 9, §10.2). Items change
// batch only when they physically move to a different carrier (moveItem, a
// Microtome output tray). A carrier is optional: an item is tracked with or
// without one (Decision 8, §10.1).
// ─────────────────────────────────────────────────────────────────────────────

import type { Batch, BatchItem, BatchProcessingNode, BatchStatus, CarrierScanResult } from './IBatchService';
import { BATCH_ERRORS, type BatchErrorCode } from './IBatchService';
import { isOpenBatch } from './batchListView';
import type { NewStationScanEvent, StationScanAction } from '../stationScans/IStationScanEventService';

/** A station's workflow stage (ScanStation.workflowStage) → the processing steps it works on. */
export const STATION_STAGE_NODES: Readonly<Record<string, readonly BatchProcessingNode[]>> = {
  'Decal / Special Processing': ['Decal / Special Processing'],
  'Processing': ['Processing'],
  'Embedding': ['Embedding'],
  'Microtomy / Sectioning': ['Microtomy / Sectioning'],
  'Staining': ['Staining'],
  'Slide Distribution': ['Checkout', 'External Referral'],
  'Checkout': ['Checkout'],
  'External Referral': ['External Referral'],
  // Batch 740: the Cytology Preparation bench loads liquid-based slides into a processing carrier.
  'Cytology Preparation': ['Cytology Processing'],
  'Cytology Processing': ['Cytology Processing'],
  'Cytology Staining': ['Cytology Staining'],
  'Cytology Imaging': ['Cytology Imaging'],
};

/** The steps a station with this workflow stage works on (none for Accessioning, Grossing, archive or other). */
export function nodesForStationStage(stage: string | undefined): BatchProcessingNode[] {
  return stage ? [...(STATION_STAGE_NODES[stage] ?? [])] : [];
}

/** The steps each workstation page works on, whatever the station's own stage says. */
export const WORKSTATION_NODES = {
  embedding: ['Embedding'],
  microtomy: ['Microtomy / Sectioning'],
  slideDistribution: ['Checkout', 'External Referral'],
} as const satisfies Record<string, readonly BatchProcessingNode[]>;

/** Carriers a workstation fills with its own output (the Microtome regroups cut slides into staining trays, spec §2 row 5). */
export const WORKSTATION_OUTPUT_NODES = {
  embedding: [],
  microtomy: ['Staining'],
  slideDistribution: [],
} as const satisfies Record<keyof typeof WORKSTATION_NODES, readonly BatchProcessingNode[]>;

/**
 * The step a carrier goes to next, keeping its batch (spec Decision 9, §10.2). Steps not listed here end the
 * carrier's trip: at the Microtome slides are new items (regrouped into a staining tray or left loose), and
 * Checkout, External Referral and Cytology Imaging are the last steps.
 */
export const NEXT_NODE: Readonly<Partial<Record<BatchProcessingNode, BatchProcessingNode>>> = {
  'Decal / Special Processing': 'Processing',
  'Processing': 'Embedding',
  'Embedding': 'Microtomy / Sectioning',
  'Staining': 'Checkout',
  'Cytology Staining': 'Cytology Imaging',
};

/** Why a carrier can't move to `toNode`, or null when it can. */
export function advanceProblem(batch: Pick<Batch, 'status' | 'processingNode' | 'items'>, toNode: BatchProcessingNode): BatchErrorCode | null {
  if (batch.status !== 'active') return BATCH_ERRORS.notActive;
  if (NEXT_NODE[batch.processingNode] !== toNode) return BATCH_ERRORS.cannotAdvance;
  if (batch.items.length === 0) return BATCH_ERRORS.noItemsToTransfer;
  return null;
}

/** Why a manifest can't be sealed, or null when it can. */
export function sealProblem(batch: Pick<Batch, 'status' | 'sealedAt'>): BatchErrorCode | null {
  if (batch.status !== 'active') return BATCH_ERRORS.notActive;
  if (batch.sealedAt) return BATCH_ERRORS.alreadySealed;
  return null;
}

/** Whether items may be added to (or removed from) the manifest: active and not sealed. */
export const acceptsItems = (batch: Pick<Batch, 'status' | 'sealedAt'>): boolean => batch.status === 'active' && !batch.sealedAt;

/** The batch after sealing. */
export function sealBatch(batch: Batch, by: { id: string; name: string }, at: string): Batch {
  return { ...batch, sealedAt: at, sealedByUserId: by.id, sealedByUserName: by.name };
}

/** The batch after moving to `toNode` (sealed, with a history entry). Call advanceProblem first. */
export function advanceBatch(batch: Batch, toNode: BatchProcessingNode, by: { id: string; name: string }, at: string, stationId?: string): Batch {
  const sealed = batch.sealedAt ? batch : sealBatch(batch, by, at);
  return {
    ...sealed,
    processingNode: toNode,
    nodeHistory: [...(batch.nodeHistory ?? []), { fromNode: batch.processingNode, toNode, at, byUserId: by.id, byUserName: by.name, stationId }],
  };
}

/** Configured carrier barcode prefixes (Config > System > Print Settings). */
export interface CarrierPrefixes { disposable?: string; rack?: string }

/** Whether a scan is a carrier's master barcode (CONT-… or RACK-… by default). */
export function isCarrierBarcode(raw: string, prefixes: CarrierPrefixes = {}): boolean {
  const v = raw.trim().toUpperCase();
  const disposable = (prefixes.disposable || 'CONT').toUpperCase();
  const rack = (prefixes.rack || 'RACK').toUpperCase();
  return v.startsWith(`${disposable}-`) || v.startsWith(`${rack}-`);
}

export type CarrierScanDecision =
  | { kind: 'unknown' }
  | { kind: 'closed'; status: BatchStatus; at?: string }
  | { kind: 'noStation' }
  | { kind: 'open'; adHoc: boolean }
  | { kind: 'handoff'; toNode: BatchProcessingNode }
  | { kind: 'output' }
  | { kind: 'mismatch'; batchNode: BatchProcessingNode };

/**
 * What a carrier scan at a station means (spec Decision 1):
 *   unknown   no carrier has that barcode: say so plainly;
 *   closed    complete or aborted: say so plainly, with when;
 *   noStation this computer has no station: prompt for one, do not guess;
 *   open      the carrier is at a step this station works on (or an ad-hoc carrier with no Target Workstation);
 *             Batch 734 (Pete): an ad-hoc carrier that arrives at another station working on its step moves here silently;
 *   handoff   the carrier comes from the step just before: it moves here (spec §2 row 2);
 *   output    an active carrier for a step this station fills (a Microtome's staining tray);
 *   mismatch  a carrier for another step: a clear message and a deliberate continue.
 */
export function resolveCarrierScan(input: {
  batch: Batch | null;
  stationNodes: readonly BatchProcessingNode[];
  hasStation: boolean;
  outputNodes?: readonly BatchProcessingNode[];
}): CarrierScanDecision {
  const { batch, stationNodes, hasStation, outputNodes = [] } = input;
  if (!batch) return { kind: 'unknown' };
  if (batch.status === 'complete' || batch.status === 'aborted') {
    return { kind: 'closed', status: batch.status, at: batch.status === 'complete' ? batch.completedAt : batch.abortedAt };
  }
  if (!hasStation) return { kind: 'noStation' };
  if (stationNodes.includes(batch.processingNode)) return { kind: 'open', adHoc: false };
  if (outputNodes.includes(batch.processingNode) && batch.status === 'active') return { kind: 'output' };
  if (batch.containerType === 'Ad-Hoc Batch' && !batch.stationId) return { kind: 'open', adHoc: true };
  const next = NEXT_NODE[batch.processingNode];
  if (next && stationNodes.includes(next) && advanceProblem(batch, next) === null) return { kind: 'handoff', toNode: next };
  return { kind: 'mismatch', batchNode: batch.processingNode };
}

/** Batch 734 (Pete, Oct 30, 2026): whether opening this carrier here is a move: an ad-hoc carrier last opened at
 *  another station. The move is recorded without asking; only a step that does not fit asks (the mismatch rule). */
export function carrierMovesHere(batch: Pick<Batch, 'containerType' | 'stationId'>, stationId: string | null): boolean {
  return batch.containerType === 'Ad-Hoc Batch' && !!batch.stationId && !!stationId && batch.stationId !== stationId;
}

/**
 * The open carriers a station shows (spec §4 "Hub and default queues"): the ones routed to this station
 * (Target Workstation) and the ones at a step it works on, leaving out carriers routed to a station in another
 * facility. Routed to this station first, then STAT, then oldest.
 */
export function carriersForStation(
  batches: readonly Batch[],
  opts: { nodes: readonly BatchProcessingNode[]; stationId: string | null; stationFacilityId?: string; facilityOfStation?: ReadonlyMap<string, string> },
): Batch[] {
  const { nodes, stationId, stationFacilityId, facilityOfStation } = opts;
  const otherFacility = (b: Batch) => !!(b.stationId && stationFacilityId && facilityOfStation?.get(b.stationId) && facilityOfStation.get(b.stationId) !== stationFacilityId);
  const rank = (b: Batch) => (stationId && b.stationId === stationId ? 0 : 1);
  return batches
    .filter(b => isOpenBatch(b) && ((stationId && b.stationId === stationId) || nodes.includes(b.processingNode)) && !otherFacility(b))
    .sort((a, b) => rank(a) - rank(b) || (a.priority === 'STAT' ? 0 : 1) - (b.priority === 'STAT' ? 0 : 1) || a.createdAt.localeCompare(b.createdAt));
}

/** What an item scan means against the carrier loaded at the station. */
export type ItemScanDecision = 'not-resolved' | 'in-manifest' | 'already-matched' | 'not-in-manifest';

export function decideItemScan(batch: Pick<Batch, 'items'>, displayId: string | null): ItemScanDecision {
  if (!displayId) return 'not-resolved';
  const item = batch.items.find(i => i.displayId.toUpperCase() === displayId.toUpperCase());
  if (!item) return 'not-in-manifest';
  return item.reconciliationStatus === 'matched' ? 'already-matched' : 'in-manifest';
}

/** A carrier's unloading progress at a station. */
export function manifestProgress(batch: Pick<Batch, 'items' | 'unexpectedScans'>): { total: number; matched: number; missing: BatchItem[]; unexpected: number } {
  const missing = batch.items.filter(i => i.reconciliationStatus !== 'matched');
  return { total: batch.items.length, matched: batch.items.length - missing.length, missing, unexpected: batch.unexpectedScans.length };
}

/** One station scan event per item in the carrier, marked as inferred from the carrier scan (spec §7.1). */
export function carrierItemEvents(
  batch: Pick<Batch, 'id' | 'masterBarcode' | 'items' | 'processingNode'>,
  e: { stationId: string; userId: string; userName: string; action: StationScanAction; result?: CarrierScanResult; note?: string },
): NewStationScanEvent[] {
  return batch.items.map(i => ({
    itemId: i.displayId,
    materialType: i.materialType,
    caseAccession: i.caseAccession,
    carrierId: batch.masterBarcode,
    batchId: batch.id,
    stationId: e.stationId,
    node: batch.processingNode,
    userId: e.userId,
    userName: e.userName,
    action: e.action,
    result: e.result ?? 'ok',
    inferredFromCarrier: true,
    note: e.note,
  }));
}
