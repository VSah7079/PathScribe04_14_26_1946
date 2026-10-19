import { describe, it, expect } from 'vitest';
import { computeRetentionHoldsQueue, filterRetentionHoldRows, retentionHoldCsvRows } from './retentionHoldsQueue';
import { exportRetentionHoldsQueue } from './exportRetentionHoldsQueue';
import type { RetentionHold } from '@/types/case/RetentionHold';

const hold = (over: Partial<RetentionHold>): RetentionHold => ({ id: 'h1', reason: 'litigation_hold', note: 'Per counsel', setAt: '2026-10-01T10:00:00Z', setByUserId: 'u1', setByUserName: 'Dr A', active: true, ...over });
const c = (id: string, holds: RetentionHold[] | undefined, facilityId?: string) => ({
  id, accession: { fullAccession: `S26-${id}` }, retentionHolds: holds, order: facilityId ? { facilityId } : undefined,
}) as never;
const label = (r: string) => ({ litigation_hold: 'Litigation Hold', research_hold: 'Research Hold', patient_requested_retention: 'Patient', other: 'Other' } as Record<string, string>)[r];

describe('computeRetentionHoldsQueue', () => {
  it('lists active holds only, oldest first, with the case and who placed them', () => {
    const rows = computeRetentionHoldsQueue([
      c('2', [hold({ id: 'h2', setAt: '2026-10-05T10:00:00Z' })], 'fac-1'),
      c('1', [hold({ id: 'h1' }), hold({ id: 'old', active: false, releasedAt: '2026-10-02T00:00:00Z' })]),
      c('3', undefined),
      c('4', [hold({ id: 'gone', active: false })]),
    ]);
    expect(rows.map(r => r.holdId)).toEqual(['h1', 'h2']);
    expect(rows[0]).toMatchObject({ accession: 'S26-1', setByUserName: 'Dr A', facilityId: null });
    expect(rows[1].facilityId).toBe('fac-1');
  });

  it('lists a case once for each active hold', () => {
    expect(computeRetentionHoldsQueue([c('1', [hold({ id: 'a' }), hold({ id: 'b', setAt: '2026-10-02T00:00:00Z' })])]).length).toBe(2);
  });
});

describe('filter and csv', () => {
  const rows = computeRetentionHoldsQueue([c('1', [hold({})]), c('2', [hold({ id: 'h2', reason: 'research_hold', note: 'Study 7', setByUserName: 'Dr B' })])]);
  it('filters by accession, reason, who or note', () => {
    expect(filterRetentionHoldRows(rows, 'research', label).map(r => r.accession)).toEqual(['S26-2']);
    expect(filterRetentionHoldRows(rows, 'dr a', label).map(r => r.accession)).toEqual(['S26-1']);
    expect(filterRetentionHoldRows(rows, '', label).length).toBe(2);
  });
  it('leaves the free-text note out of the export', () => {
    const csv = retentionHoldCsvRows(rows, label);
    expect(Object.keys(csv[0])).toEqual(['Case', 'Reason', 'Placed by', 'Placed at']);
    expect(JSON.stringify(csv)).not.toContain('Per counsel');
  });
});

describe('exportRetentionHoldsQueue', () => {
  it('refuses without the capability and delivers nothing', async () => {
    let delivered = false;
    const res = await exportRetentionHoldsQueue([{ Case: 'x' }], 'holds', { allFacilities: true }, {
      authorization: { enforce: async () => ({ allowed: false }) } as never, deliver: () => { delivered = true; },
    });
    expect(res).toEqual({ ok: false, reason: 'notPermitted' });
    expect(delivered).toBe(false);
  });
  it('delivers the file and records the export with the row count only', async () => {
    const recorded: Array<Record<string, unknown>> = [];
    const files: string[] = [];
    const res = await exportRetentionHoldsQueue([{ Case: 'x' }, { Case: 'y' }], 'holds.csv', { allFacilities: true }, {
      authorization: { enforce: async () => ({ allowed: true }) } as never,
      deliver: (name) => files.push(name),
      record: (async (e: Record<string, unknown>) => { recorded.push(e); }) as never,
    });
    expect(res).toEqual({ ok: true, rowCount: 2 });
    expect(files).toEqual(['holds.csv']);
    expect(recorded[0]).toMatchObject({ document: 'retention-holds-queue', rowCount: 2, format: 'csv' });
  });
});
