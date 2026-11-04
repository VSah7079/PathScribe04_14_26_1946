// src/pages/benchContributionCalculations.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 488 — a dedicated bench-contribution page for the four bench roles
// (Accessioner, Histotechnologist, Cytotechnologist, Molecular Technologist),
// per Pete's direct instruction: "undo the access to the Pathologist My
// Contributions as they do not need to access it now... a dedicated
// bench-contribution page is the real next step." My Contribution's own
// calculations (contributionDashboardCalculations.ts) are built on
// case-level diagnostic/RVU/TAT data that only exists once a pathologist
// has worked a case — none of that is real for a bench role's own work.
//
// Scoped to exactly four metrics Pete confirmed are real, with a named,
// confirmed data source for each (Pete, verbatim): "1. Accessioning rate
// (per user, per hour/day) — from Case.accessionedAt. 2. Batch throughput
// & queue aging, per processing node (Embedding/Microtomy/Staining/
// Molecular) — from Batch.createdAt/completedAt/status. 3. Stage-to-stage
// TAT (e.g. accessioning → embedding, embedding → staining) — from
// BatchItem.addedAt across stages for the same specimen/block. 4.
// Molecular QC pass/fail and rerun rate — from controlsPassed/status/
// cloneAndSupersede chains." Every number below traces to one of those
// four real, already-stored fields; nothing here is estimated or
// fabricated to fill out a nicer-looking chart.
//
// Scoping decisions (reasoned, not specified verbatim by Pete, so stated
// here explicitly for review):
//   - Accessioning rate and batch throughput are scoped to the signed-in
//     user (Case.accession.accessionedBy / BatchItem.addedByUserId) — "my
//     own work," matching the page's own "bench CONTRIBUTION" framing and
//     My Contribution's own existing per-user convention.
//   - Queue aging is deliberately NOT user-scoped: a batch sitting in
//     Embedding isn't "owned" by whoever created it once other techs can
//     add items to it, and the real operational question ("what's
//     backing up right now") is shared across the whole node, not one
//     person's queue. Shown alongside per-user throughput, not merged
//     into it.
//   - Molecular QC is scoped to the signed-in user via
//     MolecularBatch.createdByUserId (the tech who set up and ran the
//     batch), matching accessioning/throughput's own per-user framing.
//   - Stage-to-stage TAT joins BatchItem.displayId across the batches a
//     specimen/block actually passed through, over a fixed, named set of
//     real stage pairs (surgical: accessioning → Embedding → Staining;
//     cytology: accessioning → Cytology Processing → Cytology Staining) —
//     not a fully generic "every pair of nodes" matrix, since most node
//     pairs are never actually adjacent in a real workflow and a generic
//     matrix would just be empty cells dressed up as data.
//   - All "my work" windows default to a trailing 30 days (the same
//     window contributionDashboardCalculations.ts already uses), bucketed
//     in facility time via src/utils/facilityTime.ts — never the viewing
//     device's own local time (same real reasoning as that file's own
//     header).
// ─────────────────────────────────────────────────────────────────────────────

import type { BatchProcessingNode, BatchStatus } from '../services/batches/IBatchService';
import { getFacilityDateParts, getFacilityDateTimeParts, getFacilityMidnightUtc, getFacilityIsoDate } from '../utils/facilityTime';

// Light, calculation-local shapes — same established convention as
// contributionDashboardCalculations.ts's own CaseForDashboardCalc:
// mirror only the real fields this file actually reads from the real
// Case/Batch/BatchItem/MolecularBatch domain types, so tests can build
// fixtures without constructing every unrelated required field on the
// full domain interfaces.
export interface CaseForBenchCalc {
  accession?: {
    accessionedAt?: string;
    accessionedBy?: string;
    fullAccession?: string;
  };
}

export interface BatchItemForBenchCalc {
  displayId: string;
  caseAccession: string;
  addedAt: string;
  addedByUserId: string;
}

export interface BatchForBenchCalc {
  processingNode: BatchProcessingNode;
  status: BatchStatus;
  createdAt: string;
  items: BatchItemForBenchCalc[];
}

export interface MolecularBatchForBenchCalc {
  createdByUserId: string;
  createdAt: string;
  controlsPassed?: boolean;
  supersededReason?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_WINDOW_DAYS = 30;

function withinWindow(iso: string | undefined, windowStartMs: number, nowMs: number): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return !isNaN(t) && t >= windowStartMs && t <= nowMs;
}

// ───────────────────────────── 1. Accessioning rate ─────────────────────────

export interface AccessioningDailyCount {
  /** 'YYYY-MM-DD' in facility time. */
  date: string;
  count: number;
}

export interface AccessioningRateSummary {
  totalAccessioned: number;
  windowDays: number;
  /** One entry per calendar day in the window, oldest first, zero-filled —
   *  so a quiet day shows as 0, not a missing bar. */
  daily: AccessioningDailyCount[];
  /** total ÷ distinct (date, hour) buckets that actually had at least one
   *  accessioning event — a real "per active hour" rate, not total ÷ a
   *  fixed 24 or 8-hour shift length nobody confirmed this user works. */
  perActiveHour: number | null;
}

export interface DailyBar {
  date: string;
  count: number;
  /** 0 to 100, scaled to the busiest day; a quiet day is 0. */
  heightPercent: number;
}

/** Batch 660: the bars of the daily accessioning chart. A day with any cases is at least 4% tall so it is visible beside a busy day. */
export function dailyAccessioningBars(daily: readonly AccessioningDailyCount[]): DailyBar[] {
  const max = Math.max(0, ...daily.map(d => d.count));
  return daily.map(d => ({
    date: d.date,
    count: d.count,
    heightPercent: max === 0 || d.count === 0 ? 0 : Math.max(4, Math.round((d.count / max) * 100)),
  }));
}

/** Real per-user accessioning throughput from Case.accession.accessionedAt/
 *  accessionedBy — the only two fields this metric is allowed to use. */
export function computeAccessioningRate(
  cases: CaseForBenchCalc[],
  userId: string,
  timezone: string,
  now: Date = new Date(),
  windowDays: number = DEFAULT_WINDOW_DAYS,
): AccessioningRateSummary {
  const nowMs = now.getTime();
  const windowStartMs = nowMs - windowDays * DAY_MS;

  const mine = cases.filter(c => c.accession?.accessionedBy === userId && withinWindow(c.accession?.accessionedAt, windowStartMs, nowMs));

  const byDate = new Map<string, number>();
  const activeHourBuckets = new Set<string>();
  for (const c of mine) {
    const iso = c.accession!.accessionedAt!;
    const dateKey = getFacilityIsoDate(iso, timezone);
    byDate.set(dateKey, (byDate.get(dateKey) ?? 0) + 1);
    const { hour } = getFacilityDateTimeParts(iso, timezone);
    activeHourBuckets.add(`${dateKey}T${hour}`);
  }

  const { year: todayYear, month: todayMonth, day: todayDay } = getFacilityDateParts(now, timezone);
  const daily: AccessioningDailyCount[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const dayStart = getFacilityMidnightUtc(todayYear, todayMonth, todayDay - i, timezone);
    const dateKey = getFacilityIsoDate(dayStart, timezone);
    daily.push({ date: dateKey, count: byDate.get(dateKey) ?? 0 });
  }

  return {
    totalAccessioned: mine.length,
    windowDays,
    daily,
    perActiveHour: activeHourBuckets.size > 0 ? mine.length / activeHourBuckets.size : null,
  };
}

// ───────────────────────── 2. Batch throughput & queue aging ────────────────

export interface NodeThroughput {
  processingNode: BatchProcessingNode;
  /** Count of BatchItems this user personally added, in-window, to a
   *  batch at this node — BatchItem.addedByUserId/addedAt, never the
   *  batch's own createdByUserId (a batch is often created by whoever
   *  started it, then other techs add items to it). */
  itemsAdded: number;
}

export interface NodeQueueAging {
  processingNode: BatchProcessingNode;
  /** Batches currently open (status 'active' or 'reconciling') at this
   *  node — the real, shared "what's backing up right now" view, not
   *  scoped to any one user. */
  openBatchCount: number;
  /** Age in hours of the single oldest open batch at this node, from
   *  Batch.createdAt to now — real, not a guess at expected TAT. */
  oldestOpenBatchAgeHours: number | null;
  /** Mean age in hours across every currently-open batch at this node. */
  meanOpenBatchAgeHours: number | null;
}

export interface BatchThroughputAndAging {
  windowDays: number;
  throughputByNode: NodeThroughput[];
  queueAgingByNode: NodeQueueAging[];
}

const OPEN_BATCH_STATUSES: BatchStatus[] = ['active', 'reconciling'];

/** Real per-user item-add throughput plus real, unscoped queue aging, both
 *  per BatchProcessingNode, from Batch.createdAt/completedAt/status and
 *  BatchItem.addedAt/addedByUserId — the fields Pete named. */
export function computeBatchThroughputAndAging(
  batches: BatchForBenchCalc[],
  userId: string,
  now: Date = new Date(),
  windowDays: number = DEFAULT_WINDOW_DAYS,
): BatchThroughputAndAging {
  const nowMs = now.getTime();
  const windowStartMs = nowMs - windowDays * DAY_MS;

  const throughputMap = new Map<BatchProcessingNode, number>();
  const openBatchesByNode = new Map<BatchProcessingNode, BatchForBenchCalc[]>();

  for (const b of batches) {
    for (const item of b.items) {
      if (item.addedByUserId === userId && withinWindow(item.addedAt, windowStartMs, nowMs)) {
        throughputMap.set(b.processingNode, (throughputMap.get(b.processingNode) ?? 0) + 1);
      }
    }
    if (OPEN_BATCH_STATUSES.includes(b.status)) {
      const list = openBatchesByNode.get(b.processingNode) ?? [];
      list.push(b);
      openBatchesByNode.set(b.processingNode, list);
    }
  }

  const nodes = new Set<BatchProcessingNode>([...throughputMap.keys(), ...openBatchesByNode.keys()]);

  const throughputByNode: NodeThroughput[] = Array.from(nodes).map(processingNode => ({
    processingNode,
    itemsAdded: throughputMap.get(processingNode) ?? 0,
  }));

  const queueAgingByNode: NodeQueueAging[] = Array.from(nodes).map(processingNode => {
    const open = openBatchesByNode.get(processingNode) ?? [];
    if (open.length === 0) {
      return { processingNode, openBatchCount: 0, oldestOpenBatchAgeHours: null, meanOpenBatchAgeHours: null };
    }
    const ageHours = open.map(b => (nowMs - new Date(b.createdAt).getTime()) / (60 * 60 * 1000));
    return {
      processingNode,
      openBatchCount: open.length,
      oldestOpenBatchAgeHours: Math.max(...ageHours),
      meanOpenBatchAgeHours: ageHours.reduce((a, v) => a + v, 0) / ageHours.length,
    };
  });

  return { windowDays, throughputByNode, queueAgingByNode };
}

// ───────────────────────────── 3. Stage-to-stage TAT ─────────────────────────

export interface StageTatPair {
  fromStage: string;
  toStage: string;
  /** Hours between fromStage's and toStage's own real timestamp, one
   *  entry per specimen/block that actually passed through both stages
   *  in-window. */
  samples: number;
  meanHours: number | null;
  medianHours: number | null;
}

export interface StageToStageTat {
  windowDays: number;
  surgical: StageTatPair[];
  cytology: StageTatPair[];
}

/** Real, named stage sequences — not every pair of BatchProcessingNodes,
 *  since most pairs never actually follow one another in a real
 *  workflow. Each sequence's first stage is "Accessioning" (Case.accession.
 *  accessionedAt), matched to BatchItem.caseAccession === Case.accession.
 *  fullAccession; the remaining stages are real BatchProcessingNode
 *  values, matched by BatchItem.displayId (the same cassette/slide moving
 *  from node to node). */
const SURGICAL_STAGE_SEQUENCE: BatchProcessingNode[] = ['Embedding', 'Staining'];
const CYTOLOGY_STAGE_SEQUENCE: BatchProcessingNode[] = ['Cytology Processing', 'Cytology Staining'];

interface StageEvent {
  stage: string;
  at: number; // ms epoch
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function summarizePair(fromStage: string, toStage: string, deltasHours: number[]): StageTatPair {
  return {
    fromStage,
    toStage,
    samples: deltasHours.length,
    meanHours: deltasHours.length > 0 ? deltasHours.reduce((a, v) => a + v, 0) / deltasHours.length : null,
    medianHours: median(deltasHours),
  };
}

/** Builds, per displayId (cassette/slide), the earliest real event at each
 *  named stage in-window: 'Accessioning' from the owning case's own
 *  accessionedAt, and each BatchProcessingNode in sequence from the
 *  earliest BatchItem.addedAt recorded for that displayId at a batch of
 *  that node. */
function buildStageEventsByDisplayId(
  batches: BatchForBenchCalc[],
  cases: CaseForBenchCalc[],
  sequence: BatchProcessingNode[],
  windowStartMs: number,
  nowMs: number,
): Map<string, StageEvent[]> {
  const caseByAccession = new Map<string, CaseForBenchCalc>();
  for (const c of cases) {
    if (c.accession?.fullAccession) caseByAccession.set(c.accession.fullAccession, c);
  }

  const events = new Map<string, StageEvent[]>();
  const nodeSet = new Set(sequence);

  function record(displayId: string, stage: string, atMs: number) {
    const list = events.get(displayId) ?? [];
    const existing = list.find(e => e.stage === stage);
    if (existing) {
      if (atMs < existing.at) existing.at = atMs;
    } else {
      list.push({ stage, at: atMs });
    }
    events.set(displayId, list);
  }

  for (const b of batches) {
    if (!nodeSet.has(b.processingNode)) continue;
    for (const item of b.items) {
      if (!withinWindow(item.addedAt, windowStartMs, nowMs)) continue;
      const atMs = new Date(item.addedAt).getTime();
      record(item.displayId, b.processingNode, atMs);
      const owningCase = caseByAccession.get(item.caseAccession);
      if (owningCase?.accession?.accessionedAt) {
        const accessionedAtMs = new Date(owningCase.accession.accessionedAt).getTime();
        if (!isNaN(accessionedAtMs) && withinWindow(owningCase.accession.accessionedAt, windowStartMs, nowMs)) {
          record(item.displayId, 'Accessioning', accessionedAtMs);
        }
      }
    }
  }
  return events;
}

function computeSequenceTat(
  batches: BatchForBenchCalc[],
  cases: CaseForBenchCalc[],
  sequence: BatchProcessingNode[],
  windowStartMs: number,
  nowMs: number,
): StageTatPair[] {
  const eventsByDisplayId = buildStageEventsByDisplayId(batches, cases, sequence, windowStartMs, nowMs);
  const fullSequence: string[] = ['Accessioning', ...sequence];
  const pairs: StageTatPair[] = [];

  for (let i = 0; i < fullSequence.length - 1; i++) {
    const fromStage = fullSequence[i];
    const toStage = fullSequence[i + 1];
    const deltasHours: number[] = [];
    for (const list of eventsByDisplayId.values()) {
      const fromEvent = list.find(e => e.stage === fromStage);
      const toEvent = list.find(e => e.stage === toStage);
      if (fromEvent && toEvent && toEvent.at >= fromEvent.at) {
        deltasHours.push((toEvent.at - fromEvent.at) / (60 * 60 * 1000));
      }
    }
    pairs.push(summarizePair(fromStage, toStage, deltasHours));
  }
  return pairs;
}

/** Real stage-to-stage turnaround time, per Pete's own named example
 *  ("accessioning → embedding, embedding → staining"), joined via
 *  BatchItem.displayId across stages and Case.accession.accessionedAt
 *  for the first, accessioning-to-first-stage pair — not scoped to any
 *  one user, since a specimen's own stage-to-stage time is a real,
 *  shared operational fact, not one tech's personal metric. */
export function computeStageToStageTat(
  batches: BatchForBenchCalc[],
  cases: CaseForBenchCalc[],
  now: Date = new Date(),
  windowDays: number = DEFAULT_WINDOW_DAYS,
): StageToStageTat {
  const nowMs = now.getTime();
  const windowStartMs = nowMs - windowDays * DAY_MS;
  return {
    windowDays,
    surgical: computeSequenceTat(batches, cases, SURGICAL_STAGE_SEQUENCE, windowStartMs, nowMs),
    cytology: computeSequenceTat(batches, cases, CYTOLOGY_STAGE_SEQUENCE, windowStartMs, nowMs),
  };
}

// ───────────────────────────── 4. Molecular QC ───────────────────────────────

export interface MolecularQcSummary {
  windowDays: number;
  totalBatches: number;
  /** Only batches with a real, recorded controlsPassed value count toward
   *  pass/fail — a batch still awaiting results has controlsPassed
   *  undefined and is excluded, never counted as a fail. */
  controlsEvaluated: number;
  controlsPassed: number;
  controlsFailed: number;
  passRate: number | null;
  /** A rerun is a real MolecularBatch.cloneAndSupersede chain — this
   *  batch's own supersededReason is set once it's been cloned into a
   *  replacement run. */
  rerunCount: number;
  rerunRate: number | null;
}

/** Real per-user molecular QC outcome and rerun rate, from
 *  MolecularBatch.createdByUserId/createdAt/controlsPassed/
 *  supersededReason — the fields Pete named. */
export function computeMolecularQcSummary(
  molecularBatches: MolecularBatchForBenchCalc[],
  userId: string,
  now: Date = new Date(),
  windowDays: number = DEFAULT_WINDOW_DAYS,
): MolecularQcSummary {
  const nowMs = now.getTime();
  const windowStartMs = nowMs - windowDays * DAY_MS;

  const mine = molecularBatches.filter(b => b.createdByUserId === userId && withinWindow(b.createdAt, windowStartMs, nowMs));
  const evaluated = mine.filter(b => typeof b.controlsPassed === 'boolean');
  const passed = evaluated.filter(b => b.controlsPassed === true);
  const failed = evaluated.filter(b => b.controlsPassed === false);
  const reruns = mine.filter(b => !!b.supersededReason);

  return {
    windowDays,
    totalBatches: mine.length,
    controlsEvaluated: evaluated.length,
    controlsPassed: passed.length,
    controlsFailed: failed.length,
    passRate: evaluated.length > 0 ? passed.length / evaluated.length : null,
    rerunCount: reruns.length,
    rerunRate: mine.length > 0 ? reruns.length / mine.length : null,
  };
}

