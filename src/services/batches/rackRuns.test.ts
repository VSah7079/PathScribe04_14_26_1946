// Batch 761 (Pete: reusable staining racks): which run a rack scan means, whether the last run was closed, the new run.
import { describe, it, expect } from 'vitest';
import { currentRunForBarcode, rackRunDraft, rackRunState, rackStartsNewRun } from './rackRuns';

const run = (id: string, status: 'active' | 'reconciling' | 'complete' | 'aborted', createdAt: string, extra: Record<string, unknown> = {}) =>
  ({ id, masterBarcode: 'RACK-STAIN-04', status, createdAt, ...extra });

describe('rackRuns (Batch 761)', () => {
  it('a scan means the open run, else the newest closed run, never the oldest', () => {
    const runs = [run('r1', 'complete', '2026-10-01'), run('r2', 'complete', '2026-10-20'), run('r3', 'active', '2026-11-02'), { ...run('x', 'active', '2026-11-03'), masterBarcode: 'RACK-STAIN-05' }];
    expect(currentRunForBarcode(runs, ' rack-stain-04 ')?.id).toBe('r3');
    expect(currentRunForBarcode(runs.slice(0, 2), 'RACK-STAIN-04')?.id).toBe('r2');
    expect(currentRunForBarcode(runs, 'RACK-NONE')).toBeUndefined();
  });

  it('the last run: still loading, never closed (sealed, on the stainer, being unloaded), or closed', () => {
    expect(rackRunState(null)).toBe('none');
    expect(rackRunState({ status: 'complete' })).toBe('closed');
    expect(rackRunState({ status: 'aborted' })).toBe('closed');
    expect(rackRunState({ status: 'active' })).toBe('loading');
    expect(rackRunState({ status: 'active', sealedAt: 'x' })).toBe('notClosed');
    expect(rackRunState({ status: 'active', stainingInstrumentStatus: 'Run Completed' })).toBe('notClosed');
    expect(rackRunState({ status: 'reconciling' })).toBe('notClosed');
  });

  it('only a free, registered staining rack whose last run is closed starts a new run; its details need no form', () => {
    const rack = { rackId: 'RACK-STAIN-LF-01', containerType: 'Staining Rack' as const, status: 'Available' as const, supportsLargeFormat: true };
    expect(rackStartsNewRun(rack, 'closed')).toBe(true);
    expect(rackStartsNewRun(rack, 'none')).toBe(true);
    expect(rackStartsNewRun(rack, 'notClosed')).toBe(false);
    expect(rackStartsNewRun({ ...rack, status: 'InUse' }, 'closed')).toBe(false);
    expect(rackStartsNewRun({ ...rack, containerType: 'Tissue Processor Basket' }, 'closed')).toBe(false);
    expect(rackStartsNewRun(null, 'none')).toBe(false);
    expect(rackRunDraft(rack, { stationId: 'st-1', userId: 'u', userName: 'Kevin' })).toEqual({
      processingNode: 'Staining', protocol: '', priority: 'Routine', identifierMode: 'semi_permanent', rackId: 'RACK-STAIN-LF-01',
      containerType: 'Staining Rack', stationId: 'st-1', createdByUserId: 'u', createdByUserName: 'Kevin', largeFormat: true,
    });
  });
});
