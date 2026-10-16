// src/pages/benchContributionCalculations.test.ts
import { describe, it, expect } from 'vitest';
import {
  computeAccessioningRate,
  computeBatchThroughputAndAging,
  computeStageToStageTat,
  computeMolecularQcSummary,
  type CaseForBenchCalc,
  type BatchForBenchCalc,
  type MolecularBatchForBenchCalc,
} from './benchContributionCalculations';

const TZ = 'America/Phoenix'; // no DST, keeps the fixtures simple

describe('computeAccessioningRate — Batch 488', () => {
  const now = new Date('2026-04-15T12:00:00.000Z');

  it('counts only cases accessioned by this user, within the window', () => {
    const cases: CaseForBenchCalc[] = [
      { accession: { accessionedAt: '2026-04-10T09:00:00.000Z', accessionedBy: 'ACC-1' } },
      { accession: { accessionedAt: '2026-04-10T10:00:00.000Z', accessionedBy: 'ACC-2' } },
      { accession: { accessionedAt: '2026-01-01T09:00:00.000Z', accessionedBy: 'ACC-1' } }, // outside window
    ];
    const result = computeAccessioningRate(cases, 'ACC-1', TZ, now);
    expect(result.totalAccessioned).toBe(1);
  });

  it('zero-fills every day in the window, not just days with activity', () => {
    const cases: CaseForBenchCalc[] = [
      { accession: { accessionedAt: '2026-04-10T09:00:00.000Z', accessionedBy: 'ACC-1' } },
    ];
    const result = computeAccessioningRate(cases, 'ACC-1', TZ, now, 30);
    expect(result.daily).toHaveLength(30);
    const active = result.daily.find(d => d.date === '2026-04-10');
    expect(active?.count).toBe(1);
    const quiet = result.daily.find(d => d.date === '2026-04-11');
    expect(quiet?.count).toBe(0);
  });

  it('computes perActiveHour as total over distinct date+hour buckets, not a fixed shift length', () => {
    const cases: CaseForBenchCalc[] = [
      { accession: { accessionedAt: '2026-04-10T09:05:00.000Z', accessionedBy: 'ACC-1' } },
      { accession: { accessionedAt: '2026-04-10T09:40:00.000Z', accessionedBy: 'ACC-1' } }, // same facility hour
      { accession: { accessionedAt: '2026-04-10T14:00:00.000Z', accessionedBy: 'ACC-1' } }, // different hour
    ];
    const result = computeAccessioningRate(cases, 'ACC-1', TZ, now);
    // 3 cases over 2 distinct active hour-buckets
    expect(result.perActiveHour).toBe(1.5);
  });

  it('returns null perActiveHour when the user has no activity in-window', () => {
    const result = computeAccessioningRate([], 'ACC-1', TZ, now);
    expect(result.perActiveHour).toBeNull();
    expect(result.totalAccessioned).toBe(0);
  });
});

describe('computeBatchThroughputAndAging — Batch 488', () => {
  const now = new Date('2026-04-15T12:00:00.000Z');

  it('counts only items this user personally added, per node', () => {
    const batches: BatchForBenchCalc[] = [
      {
        processingNode: 'Embedding',
        status: 'complete',
        createdAt: '2026-04-01T00:00:00.000Z',
        items: [
          { displayId: 'S26-1-A1', caseAccession: 'S26-1', addedAt: '2026-04-10T00:00:00.000Z', addedByUserId: 'HT-1' },
          { displayId: 'S26-2-A1', caseAccession: 'S26-2', addedAt: '2026-04-10T00:00:00.000Z', addedByUserId: 'HT-2' },
        ],
      },
    ];
    const result = computeBatchThroughputAndAging(batches, 'HT-1', now);
    const embedding = result.throughputByNode.find(n => n.processingNode === 'Embedding');
    expect(embedding?.itemsAdded).toBe(1);
  });

  it('queue aging is NOT scoped to the user — counts every open batch at the node', () => {
    const batches: BatchForBenchCalc[] = [
      { processingNode: 'Staining', status: 'active', createdAt: '2026-04-13T12:00:00.000Z', items: [] }, // 2 days old
      { processingNode: 'Staining', status: 'reconciling', createdAt: '2026-04-10T12:00:00.000Z', items: [] }, // 5 days old
      { processingNode: 'Staining', status: 'complete', createdAt: '2026-04-01T12:00:00.000Z', items: [] }, // closed, excluded
    ];
    const result = computeBatchThroughputAndAging(batches, 'someone-else', now);
    const staining = result.queueAgingByNode.find(n => n.processingNode === 'Staining');
    expect(staining?.openBatchCount).toBe(2);
    expect(staining?.oldestOpenBatchAgeHours).toBeCloseTo(5 * 24, 1);
  });

  it('reports null aging for a node whose only open batch has no items', () => {
    const batches: BatchForBenchCalc[] = [
      { processingNode: 'Microtomy / Sectioning', status: 'active', createdAt: '2026-04-14T12:00:00.000Z', items: [] },
    ];
    const result = computeBatchThroughputAndAging(batches, 'HT-1', now);
    const node = result.queueAgingByNode.find(n => n.processingNode === 'Microtomy / Sectioning');
    expect(node?.openBatchCount).toBe(1);
    expect(node?.oldestOpenBatchAgeHours).toBeCloseTo(24, 1);
  });
});

describe('computeStageToStageTat — Batch 488', () => {
  const now = new Date('2026-04-15T12:00:00.000Z');

  it('joins accessioning to the first surgical stage via caseAccession', () => {
    const cases: CaseForBenchCalc[] = [
      { accession: { fullAccession: 'S26-1001', accessionedAt: '2026-04-10T08:00:00.000Z' } },
    ];
    const batches: BatchForBenchCalc[] = [
      {
        processingNode: 'Embedding',
        status: 'complete',
        createdAt: '2026-04-10T00:00:00.000Z',
        items: [{ displayId: 'S26-1001-A1', caseAccession: 'S26-1001', addedAt: '2026-04-10T14:00:00.000Z', addedByUserId: 'HT-1' }],
      },
    ];
    const result = computeStageToStageTat(batches, cases, now);
    const pair = result.surgical.find(p => p.fromStage === 'Accessioning' && p.toStage === 'Embedding');
    expect(pair?.samples).toBe(1);
    expect(pair?.meanHours).toBeCloseTo(6, 5);
  });

  it('joins Embedding to Staining via the same displayId across different batches', () => {
    const cases: CaseForBenchCalc[] = [];
    const batches: BatchForBenchCalc[] = [
      {
        processingNode: 'Embedding',
        status: 'complete',
        createdAt: '2026-04-10T00:00:00.000Z',
        items: [{ displayId: 'S26-2-A1', caseAccession: 'S26-2', addedAt: '2026-04-10T08:00:00.000Z', addedByUserId: 'HT-1' }],
      },
      {
        processingNode: 'Staining',
        status: 'complete',
        createdAt: '2026-04-11T00:00:00.000Z',
        items: [{ displayId: 'S26-2-A1', caseAccession: 'S26-2', addedAt: '2026-04-11T08:00:00.000Z', addedByUserId: 'HT-1' }],
      },
    ];
    const result = computeStageToStageTat(batches, cases, now);
    const pair = result.surgical.find(p => p.fromStage === 'Embedding' && p.toStage === 'Staining');
    expect(pair?.samples).toBe(1);
    expect(pair?.meanHours).toBeCloseTo(24, 5);
  });

  it('excludes an item seen at only one stage from any pair', () => {
    const batches: BatchForBenchCalc[] = [
      {
        processingNode: 'Embedding',
        status: 'active',
        createdAt: '2026-04-10T00:00:00.000Z',
        items: [{ displayId: 'S26-3-A1', caseAccession: 'S26-3', addedAt: '2026-04-10T08:00:00.000Z', addedByUserId: 'HT-1' }],
      },
    ];
    const result = computeStageToStageTat(batches, [], now);
    const pair = result.surgical.find(p => p.fromStage === 'Embedding' && p.toStage === 'Staining');
    expect(pair?.samples).toBe(0);
    expect(pair?.meanHours).toBeNull();
  });

  it('keeps cytology stage pairs separate from surgical ones', () => {
    const batches: BatchForBenchCalc[] = [
      {
        processingNode: 'Cytology Processing',
        status: 'complete',
        createdAt: '2026-04-10T00:00:00.000Z',
        items: [{ displayId: 'CYTO-1', caseAccession: 'S26-4', addedAt: '2026-04-10T08:00:00.000Z', addedByUserId: 'CT-1' }],
      },
      {
        processingNode: 'Cytology Staining',
        status: 'complete',
        createdAt: '2026-04-10T00:00:00.000Z',
        items: [{ displayId: 'CYTO-1', caseAccession: 'S26-4', addedAt: '2026-04-10T10:00:00.000Z', addedByUserId: 'CT-1' }],
      },
    ];
    const result = computeStageToStageTat(batches, [], now);
    const cytoPair = result.cytology.find(p => p.fromStage === 'Cytology Processing' && p.toStage === 'Cytology Staining');
    expect(cytoPair?.samples).toBe(1);
    expect(result.surgical.every(p => p.samples === 0)).toBe(true);
  });
});

describe('computeMolecularQcSummary — Batch 488', () => {
  const now = new Date('2026-04-15T12:00:00.000Z');

  it('excludes batches with no recorded controlsPassed from the pass rate', () => {
    const batches: MolecularBatchForBenchCalc[] = [
      { createdByUserId: 'MT-1', createdAt: '2026-04-10T00:00:00.000Z', controlsPassed: true },
      { createdByUserId: 'MT-1', createdAt: '2026-04-11T00:00:00.000Z' }, // awaiting results — excluded, not a fail
    ];
    const result = computeMolecularQcSummary(batches, 'MT-1', now);
    expect(result.totalBatches).toBe(2);
    expect(result.controlsEvaluated).toBe(1);
    expect(result.passRate).toBe(1);
  });

  it('counts a rerun from a real supersededReason, scoped to the user', () => {
    const batches: MolecularBatchForBenchCalc[] = [
      { createdByUserId: 'MT-1', createdAt: '2026-04-10T00:00:00.000Z', controlsPassed: false, supersededReason: 'Failed internal control' },
      { createdByUserId: 'MT-1', createdAt: '2026-04-11T00:00:00.000Z', controlsPassed: true },
      { createdByUserId: 'MT-2', createdAt: '2026-04-11T00:00:00.000Z', controlsPassed: false, supersededReason: 'Failed internal control' },
    ];
    const result = computeMolecularQcSummary(batches, 'MT-1', now);
    expect(result.totalBatches).toBe(2);
    expect(result.rerunCount).toBe(1);
    expect(result.rerunRate).toBe(0.5);
  });

  it('returns null rates when the user has no molecular batches in-window', () => {
    const result = computeMolecularQcSummary([], 'MT-1', now);
    expect(result.passRate).toBeNull();
    expect(result.rerunRate).toBeNull();
  });
});
