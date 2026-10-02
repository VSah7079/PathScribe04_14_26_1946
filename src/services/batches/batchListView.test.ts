// Batch 408: the Batch Management list's and Batch Detail's decisions.
import { describe, it, expect } from 'vitest';
import { openBatches, closedBatches, openCountByNode, reconciliationGate } from './batchListView';
import type { Batch } from './IBatchService';

const b = (id: string, status: Batch['status'], processingNode: Batch['processingNode']) => ({ id, status, processingNode });

describe('batch list', () => {
  const list = [b('1', 'active', 'Processing'), b('2', 'reconciling', 'Staining'), b('3', 'complete', 'Processing'), b('4', 'aborted', 'Staining'), b('5', 'active', 'Staining')];
  it('open batches (active or reconciling), narrowed by stage; closed batches; counts per stage', () => {
    expect(openBatches(list, null).map(x => x.id)).toEqual(['1', '2', '5']);
    expect(openBatches(list, 'Staining').map(x => x.id)).toEqual(['2', '5']);
    expect(closedBatches(list).map(x => x.id)).toEqual(['3', '4']);
    expect(openCountByNode(list, 'Staining')).toBe(2);
    expect(openCountByNode(list, 'Embedding')).toBe(0);
  });
});

describe('reconciliationGate', () => {
  const item = (id: string, matched: boolean) => ({ id, displayId: id, reconciliationStatus: matched ? 'matched' : 'pending' }) as never;
  const base = { status: 'reconciling' as const, items: [item('A1', true)], unexpectedScans: [], coldChainExcursion: undefined };

  it('completes only with every item scanned out, nothing unexpected and no unacknowledged excursion, in the service\'s order', () => {
    expect(reconciliationGate(base)).toMatchObject({ canComplete: true, blocker: null });
    expect(reconciliationGate({ ...base, items: [item('A1', false)], unexpectedScans: [{}] as never })).toMatchObject({ canComplete: false, blocker: 'itemsMissing' });
    expect(reconciliationGate({ ...base, unexpectedScans: [{}] as never }).blocker).toBe('unexpectedScans');
    const excursion = { temperatureCelsius: 11.4, detectedAt: 'x' } as never;
    expect(reconciliationGate({ ...base, coldChainExcursion: excursion })).toMatchObject({ canComplete: false, blocker: 'coldChainUnacknowledged', coldChainPending: true });
    expect(reconciliationGate({ ...base, coldChainExcursion: { ...(excursion as object), acknowledgedAt: 'y' } as never }).canComplete).toBe(true);
    expect(reconciliationGate({ ...base, status: 'active' }).canComplete).toBe(false);
  });
});
