// Batch 730 (Lab Workflow & Batch spec §9, §10.1, §10.3): the built-in lab workflow reports.
import { describe, it, expect, vi } from 'vitest';
import { turnaroundReport, stepOfEvent, percentile } from './turnaroundReport';
import { stationVolume, addOnReport, reworkReport, reconciliationReport, batchDurationReport, isoWeek, timeAtStep } from './operationsReports';
import { buildLabWorkflowReport, checkReportExport } from './labWorkflowReportService';
import { reportCsvRows, exportLabWorkflowReport } from './labWorkflowCsv';
import type { StationScanEvent } from '../stationScans/IStationScanEventService';
import type { Case } from '@/types/case/Case';
import type { Batch } from '../batches/IBatchService';

const RANGE = { from: '2026-10-01T00:00:00Z', to: '2026-11-01T00:00:00Z' };
const h = (base: string, hours: number) => new Date(new Date(base).getTime() + hours * 3_600_000).toISOString();
const T0 = '2026-10-10T08:00:00Z';
let n = 0;
const ev = (over: Partial<StationScanEvent>): StationScanEvent => ({
  id: `e${++n}`, at: T0, itemId: 'S26-1-A1', materialType: 'block', caseAccession: 'S26-1', stationId: 's1', stationName: 'Embed 1',
  stationWorkflowStage: 'Embedding', facilityId: 'f1', node: 'Embedding', userId: 'u', userName: 'T', action: 'completed', result: 'ok', ...over,
});
const kase = (id: string, over: Record<string, unknown> = {}): Case => ({
  id, accession: { accessionNumber: id, fullAccession: id, accessionedAt: T0 }, order: { priority: 'Routine' }, originHospitalId: 'f1', specimens: [], ...over,
} as unknown as Case);

describe('turnaround by step (§9)', () => {
  it('a step is reached by the case\'s last own scan there; carrier-wide events do not count (§10.3)', () => {
    expect(stepOfEvent({ action: 'completed', node: 'Embedding' })).toBe('embed');
    expect(stepOfEvent({ action: 'completed', node: 'Embedding', inferredFromCarrier: true })).toBeNull();
    expect(stepOfEvent({ action: 'matched', node: 'Staining' })).toBe('stain');
    expect(stepOfEvent({ action: 'completed', stationWorkflowStage: 'Slide Distribution' })).toBe('distribute');
    expect(stepOfEvent({ action: 'received', node: 'Embedding' })).toBeNull();
  });

  it('hours from accessioning, median, 90th percentile and late against the targets', () => {
    const cases = [
      kase('S26-1', { grossCompletedAt: h(T0, 10), finalizedAt: h(T0, 80) }),
      kase('S26-2', { grossCompletedAt: h(T0, 30), finalizedAt: h(T0, 50) }),
      kase('S26-3', { accession: { fullAccession: 'S26-3', accessionedAt: '2026-09-01T00:00:00Z' }, grossCompletedAt: h(T0, 1) }),
    ];
    const events = [ev({ at: h(T0, 20) }), ev({ at: h(T0, 30), itemId: 'S26-1-A2' }), ev({ at: h(T0, 40), caseAccession: 'S26-2', itemId: 'S26-2-A1' })];
    const rows = turnaroundReport(cases, events, { range: RANGE, grouping: 'none', caseTypeOf: () => 'surgpath' });
    const by = Object.fromEntries(rows.map(r => [r.step, r]));
    expect(by.gross).toMatchObject({ cases: 2, medianHours: 10, p90Hours: 30, late: 1, latePct: 50 });
    expect(by.embed).toMatchObject({ cases: 2, medianHours: 30, late: 1 });
    expect(by.signOut).toMatchObject({ cases: 2, late: 1, targetHours: 72 });
    expect(by.cut).toMatchObject({ cases: 0, medianHours: null, latePct: null });
  });

  it('grouped by priority; STAT performance counts STAT cases only', () => {
    const cases = [kase('S26-1', { grossCompletedAt: h(T0, 2), order: { priority: 'STAT' } }), kase('S26-2', { grossCompletedAt: h(T0, 5) })];
    const grouped = turnaroundReport(cases, [], { range: RANGE, grouping: 'priority', caseTypeOf: () => 'x' });
    expect([...new Set(grouped.map(r => r.group))]).toEqual(['Routine', 'STAT']);
    const stat = turnaroundReport(cases, [], { range: RANGE, grouping: 'none', statOnly: true, caseTypeOf: () => 'x' });
    expect(stat.find(r => r.step === 'gross')).toMatchObject({ cases: 1, medianHours: 2 });
    expect(percentile([1, 2, 3, 4], 50)).toBe(2);
  });
});

describe('the other reports (§9)', () => {
  it('volume per station per day and ISO week, own scans only, carrier-less items included', () => {
    const events = [ev({}), ev({ itemId: 'S26-1-A2' }), ev({ inferredFromCarrier: true, itemId: 'S26-1-A3' }), ev({ at: '2026-10-12T09:00:00Z' })];
    expect(stationVolume(events, { range: RANGE, by: 'day', timeZone: 'UTC' })).toEqual([
      { period: '2026-10-10', stationName: 'Embed 1', stage: 'Embedding', items: 2, scans: 2 },
      { period: '2026-10-12', stationName: 'Embed 1', stage: 'Embedding', items: 1, scans: 1 },
    ]);
    expect(isoWeek('2026-10-10')).toBe('2026-W41');
    expect(stationVolume(events, { range: RANGE, by: 'week', timeZone: 'UTC' }).map(r => [r.period, r.items])).toEqual([['2026-W41', 2], ['2026-W42', 1]]);
  });

  it('add-ons by type, cut and median minutes to cut; recut and rework rates', () => {
    const slide = (over: Record<string, unknown>) => ({ id: Math.random().toString(36), stainName: 'X', status: 'Cut & Placed', ...over });
    const c = kase('S26-1', { specimens: [{ label: 'A', blocks: [{ label: '1', cassetteReprintCount: 1, stains: [
      slide({ orderedAt: h(T0, 0), addOnPriority: 'STAT/Urgent', routedQueueLabel: 'Histology Cutting Queue', printedAt: h(T0, 1) }),
      slide({ orderedAt: h(T0, 0), addOnPriority: 'Routine Sign-Out', routedQueueLabel: 'IHC/Special Histochemistry Queue', status: 'Pending Cut' }),
      slide({ printedAt: h(T0, 2), reprintCount: 1 }), slide({ printedAt: h(T0, 3) }),
    ] }] }] });
    expect(addOnReport([c], { range: RANGE })).toEqual([
      { type: 'ihc', ordered: 1, cut: 0, stat: 0, medianMinutesToCut: null },
      { type: 'recut', ordered: 1, cut: 1, stat: 1, medianMinutesToCut: 60 },
    ]);
    expect(Object.fromEntries(reworkReport([c], { range: RANGE }).map(r => [r.measure, r.value]))).toEqual({
      slidesCut: 3, recutOrders: 1, recutRatePct: 33.3, slideReprints: 1, cassetteReprints: 1, reworkRatePct: 66.7,
    });
  });

  it('reconciliation exceptions and batch time at a step against target', () => {
    const b = {
      id: 'b1', masterBarcode: 'CONT-1', processingNode: 'Processing', createdAt: h(T0, 0), completedAt: h(T0, 10), targetDurationMinutes: 120,
      nodeHistory: [{ fromNode: 'Decal / Special Processing', toNode: 'Processing', at: h(T0, 3), byUserId: 'u', byUserName: 'T' }],
      items: [{ displayId: 'S26-1-A1', caseAccession: 'S26-1', reconciliationStatus: 'missing' }],
      unexpectedScans: [{ id: 'u1', scannedDisplayId: 'S26-9-B2', at: h(T0, 9), byUserId: 'u', byUserName: 'T' }],
      override: { byUserId: 's', byUserName: 'Sup', reason: 'Block at filing', at: h(T0, 10) },
    } as unknown as Batch;
    expect(reconciliationReport([b], { range: RANGE }).map(r => [r.kind, r.item, r.caseAccession])).toEqual([
      ['unexpected', 'S26-9-B2', 'S26-9'], ['missing', 'S26-1-A1', 'S26-1'], ['override', '', ''],
    ]);
    expect(timeAtStep(b, 'Decal / Special Processing')).toEqual({ from: h(T0, 0), to: h(T0, 3) });
    expect(batchDurationReport([b], { range: RANGE })).toEqual([{ node: 'Decal / Special Processing', carrier: 'CONT-1', startedAt: h(T0, 0), finishedAt: h(T0, 3), minutes: 180, targetMinutes: 120, overTarget: true }]);
  });
});

describe('the report service: one capability per report, research cases left out, export checked', () => {
  const deps = (allowed: string[]) => ({
    enforce: vi.fn(async (k: string) => ({ allowed: allowed.includes(k) })),
    loadCases: async () => [kase('S26-1', { grossCompletedAt: h(T0, 4) }), kase('RES26-1', { grossCompletedAt: h(T0, 400) })],
    loadBatches: async () => [],
    loadEvents: async () => [],
    caseTypeOf: () => 'surgpath',
    withoutResearch: (cs: Case[]) => cs.filter(c => !c.id.startsWith('RES')),
  });
  it('refused without the view capability', async () => {
    expect(await buildLabWorkflowReport({ id: 'turnaround', range: RANGE, timeZone: 'UTC' }, deps([]))).toEqual({ ok: false, error: 'NOT_PERMITTED' });
  });
  it('builds with it, without research cases', async () => {
    const r = await buildLabWorkflowReport({ id: 'turnaround', range: RANGE, timeZone: 'UTC' }, deps(['report:workflow-turnaround:view']));
    expect(r.ok && r.data.id === 'turnaround' && r.data.rows.find(x => x.step === 'gross')).toMatchObject({ cases: 1, medianHours: 4 });
  });
  it('an event report is refused when the scan log refuses', async () => {
    const d = { ...deps(['report:station-volume:view']), loadEvents: async () => null };
    expect(await buildLabWorkflowReport({ id: 'stationVolume', range: RANGE, timeZone: 'UTC' }, d)).toEqual({ ok: false, error: 'NOT_PERMITTED' });
  });
  it('the export needs the report\'s own export capability and is recorded', async () => {
    const out = { id: 'rework' as const, rows: [{ measure: 'slidesCut' as const, value: 3 }] };
    const rows = reportCsvRows(out, c => c.toUpperCase());
    expect(rows).toEqual([{ MEASURE: 'slidesCut', VALUE: 3 }]);
    const deliver = vi.fn(); const record = vi.fn(async () => undefined);
    expect(await exportLabWorkflowReport('rework', rows, 'r.csv', { enforce: async () => ({ allowed: false }), deliver, record: record as never })).toEqual({ ok: false, reason: 'notPermitted' });
    expect(await exportLabWorkflowReport('rework', rows, 'r.csv', { enforce: async k => ({ allowed: k === 'report:recut-rework:export' }), deliver, record: record as never })).toEqual({ ok: true, rowCount: 1 });
    expect(deliver).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ document: 'lab-workflow-rework', rowCount: 1 }));
    expect((await checkReportExport('batchDuration', async k => ({ allowed: k === 'report:batch-duration:export' }))).allowed).toBe(true);
  });
});

describe('Batch 732: station volume leaves research cases out', () => {
  it('drops scans of a research case\'s items', async () => {
    const ev = (id: string, acc: string) => ({ id, at: '2026-10-14T10:00:00Z', itemId: `${acc}-A1`, materialType: 'block', caseAccession: acc, stationId: 'st1', stationName: 'Embedding', facilityId: 'f', userId: 'u', userName: 'U', action: 'completed', result: 'ok' });
    const cases = [{ id: 'c1', accession: { fullAccession: 'S26-1' } }, { id: 'c2', accession: { fullAccession: 'RES26-2' } }];
    const d = {
      enforce: async () => ({ allowed: true }), loadCases: async () => cases as never, loadBatches: async () => [],
      loadEvents: async () => [ev('1', 'S26-1'), ev('2', 'RES26-2')] as never, caseTypeOf: () => 'surgpath',
      withoutResearch: (cs: never[]) => cs.filter((c: { id: string }) => c.id !== 'c2') as never,
    };
    const r = await buildLabWorkflowReport({ id: 'stationVolume', range: { from: '2026-10-01T00:00:00Z', to: '2026-10-31T00:00:00Z' }, timeZone: 'UTC' }, d as never);
    expect(r.ok && (r.data.rows as { items: number }[]).reduce((n, x) => n + x.items, 0)).toBe(1);
  });
});
