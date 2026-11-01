// Batch 727 (Lab Workflow & Batch spec, Decisions 2 and 3, §6.4, §9, §10.1): add-ons on the Embedding & Microtome
// wall view, the time X, and the Stations view's figures.
import { describe, it, expect } from 'vitest';
import { listOpenAddOnOrders, isOpenAddOn, addOnWarningMinutes, DEFAULT_ADD_ON_AGE_LIMIT_MINUTES } from './openAddOnOrders';
import { summarizeStations } from './stationOverviewRules';
import { addOnAgeLimitValid } from './displayProfileRules';
import type { PathologyCase } from '../cases/ICaseService';
import type { Batch } from '../batches/IBatchService';

const NOW = Date.parse('2026-10-29T12:00:00Z');
const minsAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();
const stain = (id: string, over: Record<string, unknown> = {}) => ({
  id, stainName: 'PAS', status: 'Pending Cut', userAdded: true, orderedAt: minsAgo(30), addOnPriority: 'Routine Sign-Out',
  routedQueueLabel: 'Special Stains Bench Queue', ...over,
});
const kase = (id: string, stains: unknown[], origin = 'f1'): PathologyCase => ({
  id, originHospitalId: origin, accession: { fullAccession: id },
  specimens: [{ id: `${id}-sp`, label: 'A', blocks: [{ id: `${id}-b1`, label: '1', stains }] }],
} as unknown as PathologyCase);

describe('open add-on orders (Decisions 2-3)', () => {
  const cases = [
    kase('S26-1', [
      stain('old', { orderedAt: minsAgo(200), routedQueueLabel: 'Histology Cutting Queue', stainName: 'H&E' }),
      stain('stat', { addOnPriority: 'STAT/Urgent', orderedAt: minsAgo(10), routedQueueLabel: 'IHC/Special Histochemistry Queue', stainName: 'Ki-67' }),
      stain('warn', { orderedAt: minsAgo(100) }),
      stain('fresh', { orderedAt: minsAgo(5), routedQueueLabel: undefined }),
      stain('control', { isControlSlide: true }),
      stain('cut', { status: 'Cut & Placed' }),
      stain('routine', { orderedAt: undefined, addOnPriority: undefined }),
    ]),
    kase('S26-2', [stain('elsewhere', { performingLabFacilityId: 'f2' })]),
  ];
  const opts = { accessionToFacilityId: new Map([['S26-1', 'f1'], ['S26-2', 'f1']]), now: NOW };

  it('an add-on is open while Pending Cut; controls, cut slides and ordinary slides are not counted', () => {
    expect(isOpenAddOn({ orderedAt: 'x', addOnPriority: 'Routine Sign-Out', status: 'Pending Cut' } as never)).toBe(true);
    const keys = listOpenAddOnOrders(cases, { ...opts, facilityId: 'f1' }).map(a => a.key.split(':')[1]);
    expect(keys.sort()).toEqual(['fresh', 'old', 'stat', 'warn']);
  });

  it('facility: the order\'s performing-lab stamp first, then the case\'s facility', () => {
    expect(listOpenAddOnOrders(cases, { ...opts, facilityId: 'f2' }).map(a => a.key)).toEqual(['S26-2:elsewhere']);
  });

  it('colours against X (default 120): red past it, amber in the last 30 minutes; pins STAT and past-X to the top', () => {
    const list = listOpenAddOnOrders(cases, { ...opts, facilityId: 'f1' });
    const by = Object.fromEntries(list.map(a => [a.key.split(':')[1], a]));
    expect(DEFAULT_ADD_ON_AGE_LIMIT_MINUTES).toBe(120);
    expect(by.old).toMatchObject({ state: 'overdue', pinned: true, remainingMinutes: -80, type: 'recut' });
    expect(by.warn).toMatchObject({ state: 'warning', pinned: false, type: 'specialStain' });
    expect(by.stat).toMatchObject({ isStat: true, pinned: true, type: 'ihc' });
    expect(by.fresh).toMatchObject({ state: 'normal', pinned: false, type: 'other' });
    expect(list.map(a => a.key.split(':')[1])).toEqual(['stat', 'old', 'warn', 'fresh']);
  });

  it('a lab\'s own X changes the colours; the amber stretch is half of X when X is an hour or less', () => {
    const list = listOpenAddOnOrders(cases, { ...opts, facilityId: 'f1', limitMinutes: 60 });
    expect(list.find(a => a.key.endsWith(':warn'))!.state).toBe('overdue');
    expect(addOnWarningMinutes(60)).toBe(30);
    expect(addOnWarningMinutes(40)).toBe(20);
    expect(addOnWarningMinutes(240)).toBe(30);
  });

  it('X is whole minutes from 15 to 1440, or unset', () => {
    expect(addOnAgeLimitValid(undefined)).toBe(true);
    expect(addOnAgeLimitValid(15)).toBe(true);
    expect(addOnAgeLimitValid(1440)).toBe(true);
    expect(addOnAgeLimitValid(14)).toBe(false);
    expect(addOnAgeLimitValid(1441)).toBe(false);
    expect(addOnAgeLimitValid(30.5)).toBe(false);
  });
});

describe('the Stations view figures (§9)', () => {
  const b = (id: string, over: Partial<Batch>): Batch => ({
    id, masterBarcode: `CONT-${id}`, processingNode: 'Embedding', protocol: 'p', priority: 'Routine', status: 'active',
    items: [{ id: `${id}-i`, materialType: 'block', displayId: 'S26-1-A1', caseAccession: 'S26-1', addedAt: 'x', addedByUserId: 'u', addedByUserName: 'n' }],
    unexpectedScans: [], createdAt: minsAgo(30), createdByUserId: 'u', createdByUserName: 'n', ...over,
  });
  it('rows per step, STAT and past-X across carriers and add-ons, reconciliation exceptions, cold chain, failed runs', () => {
    const addOns = listOpenAddOnOrders([kase('S26-9', [stain('s', { addOnPriority: 'STAT/Urgent', orderedAt: minsAgo(300) })])], { accessionToFacilityId: new Map(), now: NOW });
    const o = summarizeStations([
      b('e1', { createdAt: minsAgo(200) }),
      b('e2', { priority: 'STAT' }),
      b('st', { processingNode: 'Staining', status: 'reconciling', unexpectedScans: [{ id: 'u', scannedDisplayId: 'z', at: 'x', byUserId: 'u', byUserName: 'n' }], stainingInstrumentStatus: 'Run Failed' }),
      b('ref', { processingNode: 'External Referral', coldChainExcursion: { detectedAt: 'x', readingId: 'r', temperatureCelsius: 11 } }),
      b('done', { status: 'complete', processingNode: 'Checkout' }),
    ], addOns, { limitMinutes: 120, nodes: ['Embedding', 'Staining', 'External Referral', 'Checkout'], now: NOW });
    expect(o.rows.map(r => [r.node, r.carriers, r.items])).toEqual([['Embedding', 2, 2], ['Staining', 1, 1], ['External Referral', 1, 1]]);
    expect(o.rows[0].oldestMinutes).toBe(200);
    expect(o.statWaiting).toBe(2);
    expect(o.pastLimit).toBe(2);
    expect(o.missingOrUnexpected).toBe(2);
    expect(o.reconciliationExceptions).toEqual([{ id: 'st', barcode: 'CONT-st', missing: 1, unexpected: 1 }]);
    expect(o.coldChainOpen.map(c => c.barcode)).toEqual(['CONT-ref']);
    expect(o.runFailed.map(r => r.barcode)).toEqual(['CONT-st']);
  });
});
