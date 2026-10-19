import { describe, it, expect } from 'vitest';
import type { AutopsyCaseDetails } from '@/types/autopsy/AutopsyCaseDetails';
import type { TatEntryForResolution } from '@/services/tatConfig/tatTargetResolution';
import {
  addWorkingDays,
  ancillaryHoldMs,
  currentAutopsyTatTier,
  resolveAutopsyClockStart,
  resolveAutopsyTatForTier,
  resolveAutopsyTatSummary,
} from './resolveAutopsyTatStatus';

const caseOf = (over: Partial<AutopsyCaseDetails> = {}): AutopsyCaseDetails => ({
  jurisdiction: 'DE', caseAuthority: 'hospital_consented', scope: 'full', addenda: [], ancillaryHold: { active: false }, ...over,
});
const at = (iso: string) => new Date(iso);
const signed = (iso: string, tier: 'PAD' | 'FAD') => ({ tier, frozenPayload: null, signedBy: { name: 'X', isPathologist: true }, signedAt: iso });
const entry = (over: Partial<TatEntryForResolution>): TatEntryForResolution => ({
  type: 'AUTOPSY_PAD', targetHours: 12, urgency: null, facilityId: null, performingLabFacilityId: null,
  specimenId: null, subspecialtyId: null, roleId: null, active: true, ...over,
});

describe('resolveAutopsyClockStart', () => {
  it('uses the earliest specimen receipt, then the order, then creation', () => {
    expect(resolveAutopsyClockStart({ specimens: [{ receivedAt: '2026-10-02T08:00:00Z' }, { receivedAt: '2026-10-01T08:00:00Z' }], order: { receivedDate: '2026-09-30T00:00:00Z' } })).toBe('2026-10-01T08:00:00Z');
    expect(resolveAutopsyClockStart({ specimens: [{}], order: { receivedDate: '2026-09-30T00:00:00Z' } })).toBe('2026-09-30T00:00:00Z');
    expect(resolveAutopsyClockStart({ createdAt: '2026-09-29T00:00:00Z' })).toBe('2026-09-29T00:00:00Z');
    expect(resolveAutopsyClockStart({})).toBeNull();
  });
});

describe('addWorkingDays', () => {
  it('skips Saturdays and Sundays', () => {
    // Friday 2026-10-16 + 1 working day = Monday 2026-10-19
    expect(addWorkingDays(at('2026-10-16T09:00:00Z'), 1).toISOString()).toBe('2026-10-19T09:00:00.000Z');
    expect(addWorkingDays(at('2026-10-14T09:00:00Z'), 5).toISOString()).toBe('2026-10-21T09:00:00.000Z');
  });
});

describe('ancillaryHoldMs', () => {
  it('counts a closed hold, an open hold up to now, and nothing without a start', () => {
    const now = at('2026-10-10T00:00:00Z');
    expect(ancillaryHoldMs({ active: false, startedAt: '2026-10-01T00:00:00Z', endedAt: '2026-10-02T00:00:00Z' }, now)).toBe(24 * 3_600_000);
    expect(ancillaryHoldMs({ active: true, startedAt: '2026-10-09T00:00:00Z' }, now)).toBe(24 * 3_600_000);
    expect(ancillaryHoldMs({ active: true }, now)).toBe(0);
    expect(ancillaryHoldMs(undefined, now)).toBe(0);
  });
});

describe('resolveAutopsyTatForTier — jurisdiction target', () => {
  // DE: PAD within 48 hours; FAD within 30 days.
  const startedAt = '2026-10-01T00:00:00Z';
  it('is on track early in the window', () => {
    const r = resolveAutopsyTatForTier('PAD', { autopsy: caseOf(), startedAt, now: at('2026-10-01T10:00:00Z') });
    expect(r).toMatchObject({ state: 'on_track', source: 'jurisdiction', elapsedHours: 10, targetHours: 48, remainingHours: 38 });
  });
  it('is due soon in the last 20% of the window', () => {
    const r = resolveAutopsyTatForTier('PAD', { autopsy: caseOf(), startedAt, now: at('2026-10-02T16:00:00Z') });
    expect(r.state).toBe('due_soon');
  });
  it('is overdue after the deadline', () => {
    const r = resolveAutopsyTatForTier('PAD', { autopsy: caseOf(), startedAt, now: at('2026-10-03T01:00:00Z') });
    expect(r).toMatchObject({ state: 'overdue', remainingHours: 0 });
  });
  it('is met when signed in time and met late when signed after', () => {
    const inTime = caseOf({ padSnapshot: signed('2026-10-02T20:00:00Z', 'PAD') });
    const late = caseOf({ padSnapshot: signed('2026-10-04T00:00:00Z', 'PAD') });
    expect(resolveAutopsyTatForTier('PAD', { autopsy: inTime, startedAt, now: at('2026-10-20T00:00:00Z') })).toMatchObject({ state: 'met', elapsedHours: 44 });
    expect(resolveAutopsyTatForTier('PAD', { autopsy: late, startedAt, now: at('2026-10-20T00:00:00Z') }).state).toBe('met_late');
  });
  it('counts a range to its upper bound and working days over weekends', () => {
    // GB_EW FAD: 14-21 working days. Start Mon 2026-10-05; 21 working days = Tue 2026-11-03.
    const gb = caseOf({ jurisdiction: 'GB_EW' });
    const r = resolveAutopsyTatForTier('FAD', { autopsy: gb, startedAt: '2026-10-05T09:00:00Z', now: at('2026-10-30T09:00:00Z') });
    expect(r.deadline).toBe('2026-11-03T09:00:00.000Z');
    expect(r.state).toBe('due_soon');
    expect(resolveAutopsyTatForTier('FAD', { autopsy: gb, startedAt: '2026-10-05T09:00:00Z', now: at('2026-11-03T10:00:00Z') }).state).toBe('overdue');
  });
  it('does not count ancillary hold time', () => {
    const held = caseOf({ ancillaryHold: { active: false, startedAt: '2026-10-01T12:00:00Z', endedAt: '2026-10-03T12:00:00Z' } });
    const r = resolveAutopsyTatForTier('PAD', { autopsy: held, startedAt, now: at('2026-10-04T00:00:00Z') });
    expect(r.holdHours).toBe(48);
    expect(r.state).toBe('on_track');
    expect(r.deadline).toBe('2026-10-05T00:00:00.000Z');
  });
});

describe('resolveAutopsyTatForTier — admin override', () => {
  const startedAt = '2026-10-01T00:00:00Z';
  it('uses an active override instead of the jurisdiction figure', () => {
    const r = resolveAutopsyTatForTier('PAD', { autopsy: caseOf(), startedAt, tatEntries: [entry({ targetHours: 12 })], now: at('2026-10-01T13:00:00Z') });
    expect(r).toMatchObject({ source: 'override', state: 'overdue', targetHours: 12 });
  });
  it('ignores inactive overrides and other tiers', () => {
    const r = resolveAutopsyTatForTier('PAD', { autopsy: caseOf(), startedAt, tatEntries: [entry({ active: false }), entry({ type: 'AUTOPSY_FAD', targetHours: 1 })], now: at('2026-10-01T10:00:00Z') });
    expect(r.source).toBe('jurisdiction');
  });
  it('prefers the entry for the case facility over the all-facility one', () => {
    const entries = [entry({ targetHours: 100 }), entry({ targetHours: 6, facilityId: 'fac-1' })];
    expect(resolveAutopsyTatForTier('PAD', { autopsy: caseOf(), startedAt, facilityId: 'fac-1', tatEntries: entries, now: at('2026-10-01T01:00:00Z') }).targetHours).toBe(6);
    expect(resolveAutopsyTatForTier('PAD', { autopsy: caseOf(), startedAt, facilityId: 'fac-2', tatEntries: entries, now: at('2026-10-01T01:00:00Z') }).targetHours).toBe(100);
  });
});

describe('summary', () => {
  it('works towards the PAD, then the FAD once the PAD is signed', () => {
    expect(currentAutopsyTatTier(caseOf())).toBe('PAD');
    const afterPad = caseOf({ padSnapshot: signed('2026-10-02T00:00:00Z', 'PAD') });
    expect(currentAutopsyTatTier(afterPad)).toBe('FAD');
    const s = resolveAutopsyTatSummary({ autopsy: afterPad, startedAt: '2026-10-01T00:00:00Z', now: at('2026-10-05T00:00:00Z') });
    expect(s.current.tier).toBe('FAD');
    expect(s.pad.state).toBe('met');
  });
});
