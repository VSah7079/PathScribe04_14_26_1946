import { describe, it, expect } from 'vitest';
import type { TATEntry } from '@/types/quality/TatConfigEntry';
import { buildTatEntry } from './tatConfigRules';
import { resolveFrozenSectionClock } from './resolveFrozenSectionClock';
import { SYSTEM_DEFAULT_TAT_ENTRIES } from './systemDefaultTatEntries';

const fs = (over: Partial<TATEntry>): TATEntry => ({
  id: 'x', type: 'FROZEN_SECTION', targetHours: 0.5, urgency: null, facilityId: null, performingLabFacilityId: null,
  specimenId: null, subspecialtyId: null, roleId: null, active: true, notes: '', createdAt: '2026-01-01T00:00:00Z', ...over,
});

describe('resolveFrozenSectionClock', () => {
  it('reads the built-in STAT and routine targets', () => {
    expect(resolveFrozenSectionClock(SYSTEM_DEFAULT_TAT_ENTRIES, { urgency: 'STAT' })).toMatchObject({ targetMinutes: 20, warningMinutes: 5, source: 'configured' });
    expect(resolveFrozenSectionClock(SYSTEM_DEFAULT_TAT_ENTRIES, { urgency: 'ROUTINE' })).toMatchObject({ targetMinutes: 30, warningMinutes: 5 });
  });
  it('treats an unspecified urgency as STAT', () => {
    expect(resolveFrozenSectionClock(SYSTEM_DEFAULT_TAT_ENTRIES, {}).targetMinutes).toBe(20);
  });
  it('prefers a facility entry and uses its warning minutes', () => {
    const entries = [...SYSTEM_DEFAULT_TAT_ENTRIES, fs({ id: 'f1', urgency: 'STAT', facilityId: 'fac-1', targetHours: 0.25, warningMinutes: 3 })];
    expect(resolveFrozenSectionClock(entries, { facilityId: 'fac-1', urgency: 'STAT' })).toMatchObject({ targetMinutes: 15, warningMinutes: 3 });
    expect(resolveFrozenSectionClock(entries, { facilityId: 'fac-2', urgency: 'STAT' }).targetMinutes).toBe(20);
  });
  it('falls back to 20 and 5 when nothing applies', () => {
    expect(resolveFrozenSectionClock([], { urgency: 'STAT' })).toEqual({ targetMinutes: 20, warningMinutes: 5, source: 'default' });
    expect(resolveFrozenSectionClock([fs({ active: false })], { urgency: 'ROUTINE' }).source).toBe('default');
  });
  it('never lets the warning window reach the whole target', () => {
    const r = resolveFrozenSectionClock([fs({ urgency: 'STAT', targetHours: 0.05, warningMinutes: 10 })], { urgency: 'STAT' });
    expect(r.targetMinutes).toBe(3);
    expect(r.warningMinutes).toBe(2);
  });
});

describe('buildTatEntry — frozen-section warning minutes (#91)', () => {
  const ctx = { now: '2026-10-18T00:00:00Z', newId: () => 'new-1' };
  it('keeps a valid warning window on a frozen-section entry', () => {
    const r = buildTatEntry({ type: 'FROZEN_SECTION', targetHours: 0.5, warningMinutes: 8 }, 'add', undefined, [], ctx);
    expect(r.ok && r.entry.warningMinutes).toBe(8);
  });
  it('refuses a warning window that is not shorter than the target', () => {
    expect(buildTatEntry({ type: 'FROZEN_SECTION', targetHours: 0.5, warningMinutes: 30 }, 'add', undefined, [], ctx)).toMatchObject({ ok: false, error: 'warningInvalid' });
    expect(buildTatEntry({ type: 'FROZEN_SECTION', targetHours: 0.5, warningMinutes: 0 }, 'add', undefined, [], ctx)).toMatchObject({ ok: false, error: 'warningInvalid' });
    expect(buildTatEntry({ type: 'FROZEN_SECTION', targetHours: 0.5, warningMinutes: 2.5 }, 'add', undefined, [], ctx)).toMatchObject({ ok: false, error: 'warningInvalid' });
  });
  it('drops a warning window on any other type', () => {
    const r = buildTatEntry({ type: 'GROSSING', targetHours: 4, warningMinutes: 8 }, 'add', undefined, [], ctx);
    expect(r.ok && r.entry.warningMinutes).toBeUndefined();
  });
  it('leaves the warning absent when none is given', () => {
    const r = buildTatEntry({ type: 'FROZEN_SECTION', targetHours: 0.5 }, 'add', undefined, [], ctx);
    expect(r.ok && 'warningMinutes' in r.entry).toBe(false);
  });
});
