// src/services/cytology/resolveCytologyWorkloadTrackingReport.test.ts
import { describe, it, expect } from 'vitest';
import { resolveCytologyWorkloadTrackingReport } from './resolveCytologyWorkloadTrackingReport';
import type { CytologyWorkloadLedgerEntry } from '@/types/cytology/CytologyWorkloadLedgerEntry';

let seq = 0;
const entry = (userId: string, day: string, reviewMode: CytologyWorkloadLedgerEntry['reviewMode'], scuWeight: number, activeDurationSeconds: number): CytologyWorkloadLedgerEntry => {
  seq++;
  return { id: 'l' + seq, userId, caseId: 'C' + seq, specimenId: 'SP' + seq, reviewRecordId: 'R' + seq, reviewMode, scuWeight, activeDurationSeconds, completedAt: `${day}T10:00:00.000Z` };
};

describe('resolveCytologyWorkloadTrackingReport — real, per direct guidance\'s CYT-QA-05 specification', () => {
  it('groups real ledger entries by real user and real calendar shift day, never mixing two different days together', () => {
    const entries = [
      entry('ct1', '2026-09-01', 'primary_manual', 1.0, 3600),
      entry('ct1', '2026-09-02', 'primary_manual', 1.0, 3600),
    ];
    const rows = resolveCytologyWorkloadTrackingReport(entries, {}, 100);
    expect(rows).toHaveLength(2);
    expect(rows.map(r => r.shiftDate).sort()).toEqual(['2026-09-01', '2026-09-02']);
  });

  it('correctly splits real Manual vs. Imager slide counts — only fov_assisted counts as Imager', () => {
    const entries = [
      entry('ct1', '2026-09-01', 'primary_manual', 1.0, 3600),
      entry('ct1', '2026-09-01', 'fov_assisted', 0.5, 3600),
      entry('ct1', '2026-09-01', 'fov_manual_rescreen', 1.5, 3600),
    ];
    const [row] = resolveCytologyWorkloadTrackingReport(entries, {}, 100);
    expect(row.imagerSlidesCount).toBe(1);
    expect(row.manualSlidesCount).toBe(2);
    expect(row.totalEquivSlides).toBeCloseTo(3.0, 5);
  });

  it('real, per-user effective cap overrides the given default cap, matching this module\'s own established 3-tier cascade result', () => {
    const entries = [entry('ct1', '2026-09-01', 'primary_manual', 90, 8 * 3600)];
    const rowsWithOverride = resolveCytologyWorkloadTrackingReport(entries, { ct1: 80 }, 100);
    expect(rowsWithOverride[0].maxAllowedVolume).toBe(80);
    const rowsWithDefault = resolveCytologyWorkloadTrackingReport(entries, {}, 100);
    expect(rowsWithDefault[0].maxAllowedVolume).toBe(100);
  });

  it('a real, genuine exceedance is correctly flagged, reusing the same real capacity formula the live sign-out gate already enforces', () => {
    const entries = [entry('ct1', '2026-09-01', 'primary_manual', 110, 8 * 3600)];
    const [row] = resolveCytologyWorkloadTrackingReport(entries, {}, 100);
    expect(row.exceedanceFlag).toBe(true);
  });

  it('real usage landing exactly on the cap is not flagged — the same real, strict greater-than boundary already established', () => {
    const entries = [entry('ct1', '2026-09-01', 'primary_manual', 100, 8 * 3600)];
    const [row] = resolveCytologyWorkloadTrackingReport(entries, {}, 100);
    expect(row.exceedanceFlag).toBe(false);
  });

  it('real active duration correctly sums into hours, not left in raw seconds', () => {
    const entries = [entry('ct1', '2026-09-01', 'primary_manual', 1.0, 3600), entry('ct1', '2026-09-01', 'primary_manual', 1.0, 1800)];
    const [row] = resolveCytologyWorkloadTrackingReport(entries, {}, 100);
    expect(row.hoursScreened).toBeCloseTo(1.5, 5);
  });

  it('Batch 572 (F7, option C): a sign-off sets the hours that count, beside the recorded hours, with its flag', () => {
    const rows = resolveCytologyWorkloadTrackingReport([entry('ct1', '2026-09-01', 'primary_manual', 1, 3 * 3600)], {}, 100, [
      { id: 's1', userId: 'ct1', date: '2026-09-01', recordedHours: 3, signedHours: 4, reasonId: 'microscopeOffScreen', flagged: true, signedAt: '2026-09-01T17:00:00Z' },
    ]);
    expect(rows[0]).toMatchObject({ hoursScreened: 4, recordedHours: 3, signedOffHours: 4, signOffFlagged: true, signOffStale: false, maxAllowedVolume: 50 });
    const unsigned = resolveCytologyWorkloadTrackingReport([entry('ct1', '2026-09-01', 'primary_manual', 1, 3 * 3600)], {}, 100);
    expect(unsigned[0]).toMatchObject({ hoursScreened: 3, recordedHours: 3, signedOffHours: null, signOffFlagged: false });
  });

  it('Batch 572: a correction within the tolerance that clears an exceedance is flagged; an out-of-date sign-off does not count', () => {
    // 40 SCU in 3 h recorded: limit 37.5, exceeded. Signed 3.4 h (within 0.5 h): limit 42.5, not exceeded: flagged.
    const e = entry('ct1', '2026-09-01', 'primary_manual', 40, 3 * 3600);
    const cleared = resolveCytologyWorkloadTrackingReport([e], {}, 100, [
      { id: 's1', userId: 'ct1', date: '2026-09-01', recordedHours: 3, signedHours: 3.4, reasonId: 'microscopeOffScreen', flagged: false, signedAt: '2026-09-01T17:00:00Z' },
    ]);
    expect(cleared[0]).toMatchObject({ hoursScreened: 3.4, exceedanceFlag: false, signOffFlagged: true });
    // Signed against 2 h, but 3 h are recorded now: stale, so the recorded 3 h count.
    const stale = resolveCytologyWorkloadTrackingReport([e], {}, 100, [
      { id: 's2', userId: 'ct1', date: '2026-09-01', recordedHours: 2, signedHours: 2, flagged: false, signedAt: '2026-09-01T12:00:00Z' },
    ]);
    expect(stale[0]).toMatchObject({ hoursScreened: 3, signOffStale: true, signOffFlagged: false });
  });
  it("Batch 572: days are the lab's day: 23:30 in Phoenix (06:30Z next day) counts for the Phoenix day", () => {
    const late = { ...entry('ct1', '2026-09-01', 'primary_manual', 1, 3600), completedAt: '2026-09-02T06:30:00.000Z' };
    expect(resolveCytologyWorkloadTrackingReport([late], {}, 100, [], 'America/Phoenix')[0].shiftDate).toBe('2026-09-01');
    expect(resolveCytologyWorkloadTrackingReport([late], {}, 100)[0].shiftDate).toBe('2026-09-02');
  });

  it('Batch 574: with the day starting at 6, a 22:00–05:00 night shift is one row; the correction\'s reason and note are on it', () => {
    const at = (iso: string) => ({ ...entry('ct1', '2026-09-01', 'primary_manual', 1, 3600), completedAt: iso });
    // Phoenix (UTC-7): 23:00 on the 1st and 04:00 on the 2nd, local.
    const shift = [at('2026-09-02T06:00:00.000Z'), at('2026-09-02T11:00:00.000Z')];
    expect(resolveCytologyWorkloadTrackingReport(shift, {}, 100, [], 'America/Phoenix').map(r => r.shiftDate)).toEqual(['2026-09-01', '2026-09-02']);
    const rows = resolveCytologyWorkloadTrackingReport(shift, {}, 100, [
      { id: 's', userId: 'ct1', date: '2026-09-01', recordedHours: 2, signedHours: 3, reasonId: 'other', note: 'Teaching session at the scope', flagged: true, signedAt: '2026-09-02T13:00:00Z' },
    ], 'America/Phoenix', 6);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ shiftDate: '2026-09-01', recordedHours: 2, signOffReasonId: 'other', signOffNote: 'Teaching session at the scope' });
  });
});
