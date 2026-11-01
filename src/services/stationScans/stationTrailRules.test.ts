// Batch 729 (Lab Workflow & Batch spec §7.3, §7.4, §7.5, §10.1): the scan trail, stopped work, loose items, wrong case.
import { describe, it, expect } from 'vitest';
import { scanTrail, staleItems, looseItemsByNode, isFinishedScan, lastOwnScanByItem } from './stationTrailRules';
import { wrongCaseScan, wrongCaseScanEvent, wrongCaseAuditDetail } from './wrongCaseScan';
import type { StationScanEvent } from './IStationScanEventService';

const NOW = Date.parse('2026-10-30T12:00:00Z');
const at = (minsAgo: number) => new Date(NOW - minsAgo * 60_000).toISOString();
let n = 0;
const ev = (over: Partial<StationScanEvent>): StationScanEvent => ({
  id: `e${++n}`, at: at(10), itemId: 'S26-1-A1', materialType: 'block', caseAccession: 'S26-1', stationId: 's', stationName: 'Embedding 1',
  stationWorkflowStage: 'Embedding', facilityId: 'f1', node: 'Embedding', userId: 'u', userName: 'Tech', action: 'received', result: 'ok', ...over,
});

describe('station scan trail (§7.4)', () => {
  it('a case\'s scans, newest first; one item\'s alone when asked', () => {
    const events = [ev({ at: at(30) }), ev({ at: at(5), itemId: 'S26-1-A2' }), ev({ at: at(1), caseAccession: 'S26-2', itemId: 'S26-2-A1' })];
    expect(scanTrail(events, { caseAccession: 's26-1' }).map(e => e.itemId)).toEqual(['S26-1-A2', 'S26-1-A1']);
    expect(scanTrail(events, { caseAccession: 'S26-1', itemId: 'S26-1-A1' })).toHaveLength(1);
  });
});

describe('work that has stopped (§7.5) and loose items (§10.1)', () => {
  it('the last own scan counts; a carrier-wide scan does not keep an item "seen"', () => {
    const events = [ev({ at: at(300) }), ev({ at: at(5), inferredFromCarrier: true, carrierId: 'CONT-1' })];
    expect(lastOwnScanByItem(events).get('S26-1-A1')!.at).toBe(at(300));
    expect(staleItems(events, { limitMinutes: 240, now: NOW }).map(s => [s.itemId, s.minutes])).toEqual([['S26-1-A1', 300]]);
  });

  it('finished work is not stale: a block completed at the Microtome, a slide completed at Slide Distribution', () => {
    expect(isFinishedScan({ action: 'completed', materialType: 'block', node: 'Microtomy / Sectioning' })).toBe(true);
    expect(isFinishedScan({ action: 'completed', materialType: 'block', node: 'Embedding' })).toBe(false);
    expect(isFinishedScan({ action: 'completed', materialType: 'slide', stationWorkflowStage: 'Slide Distribution' })).toBe(true);
    const events = [
      ev({ at: at(500), action: 'completed', node: 'Microtomy / Sectioning' }),
      ev({ at: at(500), itemId: 'S26-1-A2', action: 'completed', node: 'Embedding' }),
    ];
    expect(staleItems(events, { limitMinutes: 240, now: NOW }).map(s => s.itemId)).toEqual(['S26-1-A2']);
  });

  it('facility filter; unresolved scans and carriers are not items', () => {
    const events = [ev({ at: at(500), facilityId: 'f2' }), ev({ at: at(500), itemId: 'CONT-1', materialType: 'carrier' }), ev({ at: at(500), itemId: 'junk', materialType: 'unknown', result: 'not-found' })];
    expect(staleItems(events, { limitMinutes: 240, now: NOW, facilityId: 'f1' })).toEqual([]);
  });

  it('items at a step with no carrier, not yet completed there, counted per step', () => {
    const events = [
      ev({}), ev({ itemId: 'S26-1-A2' }), ev({ itemId: 'S26-1-A3', carrierId: 'CONT-1' }),
      ev({ itemId: 'S26-1-A4', action: 'completed' }), ev({ itemId: 'S26-1-A5', node: 'Microtomy / Sectioning' }),
    ];
    expect(Object.fromEntries(looseItemsByNode(events))).toEqual({ Embedding: 2, 'Microtomy / Sectioning': 1 });
  });
});

describe('wrong case at grossing (§7.3)', () => {
  it('flags an item from another case, never one from the open case or an unresolved scan', () => {
    expect(wrongCaseScan({ itemId: 'S26-2-A1', materialType: 'block', itemAccession: 'S26-2' }, 'S26-1')).toMatchObject({ itemAccession: 'S26-2', openAccession: 'S26-1' });
    expect(wrongCaseScan({ itemId: 'S26-1-A1', materialType: 'block', itemAccession: 's26-1' }, 'S26-1')).toBeNull();
    expect(wrongCaseScan({ itemId: 'x', materialType: 'unknown' }, 'S26-1')).toBeNull();
  });
  it('records the choice as a wrong-item scan, and the audit text says which case', () => {
    const flag = wrongCaseScan({ itemId: 'S26-2-A1', materialType: 'block', itemAccession: 'S26-2' }, 'S26-1')!;
    expect(wrongCaseScanEvent(flag, 'continued', { stationId: 's', userId: 'u', userName: 'Tech' })).toMatchObject({ result: 'wrong-item', action: 'received', caseAccession: 'S26-2' });
    expect(wrongCaseAuditDetail(flag, 'continued')).toBe('S26-2-A1 belongs to case S26-2, not S26-1 (open at grossing). Continued anyway.');
  });
});

describe('the Stations view summary from the demo log (Batch 729)', () => {
  it('activitySummary reads without a user permission (the wall is authorised by its token) and counts stale and loose items', async () => {
    const { mockStationScanEventService: svc } = await import('./mockStationScanEventService');
    const { storageSet } = await import('../mockStorage');
    storageSet('stationScanEvents', [ev({ at: new Date(Date.now() - 600 * 60_000).toISOString() }), ev({ itemId: 'S26-1-A2', at: new Date().toISOString() })]);
    const r = await svc.activitySummary({ staleMinutes: 240 });
    expect(r.ok).toBe(true);
    if (r.ok === true) {
      expect(r.data.stale.map(s => s.itemId)).toEqual(['S26-1-A1']);
      expect(r.data.looseByNode).toEqual({ Embedding: 2 });
    }
  });
});
