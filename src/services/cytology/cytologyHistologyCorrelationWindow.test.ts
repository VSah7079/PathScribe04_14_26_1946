// Batch 452 (PS-156): which correlation rule applies, and the window it gives.
import { describe, expect, it } from 'vitest';
import { isInCorrelationWindow, resolveCorrelationWindow, resolveEffectiveCorrelationRule, validateCorrelationRule } from './cytologyHistologyCorrelationWindow';
import { DEFAULT_CYTOLOGY_HISTOLOGY_CORRELATION_SETTINGS } from './ICytologyHistologyCorrelationSettingsService';

const ENTERPRISE = { windowDays: 180, anchor: 'collection' as const, jurisdictionRules: { GB_EW: { windowDays: 365, anchor: 'receipt' as const } } };
const override = (o: object) => ({ id: 'o', facilityId: 'F', overrides: o, createdAt: '', updatedAt: '' });

describe('resolveEffectiveCorrelationRule (enterprise → jurisdiction → facility)', () => {
  it('the built-in default is 180 days from collection', () => {
    expect(DEFAULT_CYTOLOGY_HISTOLOGY_CORRELATION_SETTINGS).toMatchObject({ windowDays: 180, anchor: 'collection' });
    expect(resolveEffectiveCorrelationRule(null, null, null)).toEqual({ windowDays: 180, anchor: 'collection', source: 'enterprise' });
  });
  it('a jurisdiction with its own rule uses it; others use the enterprise rule', () => {
    expect(resolveEffectiveCorrelationRule(ENTERPRISE, 'GB_EW', null)).toEqual({ windowDays: 365, anchor: 'receipt', source: 'jurisdiction' });
    expect(resolveEffectiveCorrelationRule(ENTERPRISE, 'US', null)).toEqual({ windowDays: 180, anchor: 'collection', source: 'enterprise' });
  });
  it('a facility override wins, field by field', () => {
    expect(resolveEffectiveCorrelationRule(ENTERPRISE, 'GB_EW', override({ windowDays: 270 }))).toEqual({ windowDays: 270, anchor: 'receipt', source: 'facility' });
    expect(resolveEffectiveCorrelationRule(ENTERPRISE, 'US', override({ anchor: 'signOut' }))).toEqual({ windowDays: 180, anchor: 'signOut', source: 'facility' });
    expect(resolveEffectiveCorrelationRule(ENTERPRISE, 'US', override({}))).toMatchObject({ source: 'enterprise' });
  });
});

describe('resolveCorrelationWindow', () => {
  const rule = (anchor: 'collection' | 'receipt' | 'signOut', windowDays = 180) => ({ windowDays, anchor, source: 'enterprise' as const });
  const sp = { collectedAt: '2026-01-01T00:00:00.000Z', receivedAt: '2026-01-05T00:00:00.000Z' };
  const signOut = '2026-01-20T00:00:00.000Z';

  it('starts at the configured anchor and runs windowDays', () => {
    expect(resolveCorrelationWindow(sp, signOut, rule('collection'))).toMatchObject({ anchorUsed: 'collection', startsAt: sp.collectedAt, endsAt: '2026-06-30T00:00:00.000Z' });
    expect(resolveCorrelationWindow(sp, signOut, rule('receipt'))).toMatchObject({ anchorUsed: 'receipt', startsAt: sp.receivedAt });
    expect(resolveCorrelationWindow(sp, signOut, rule('signOut', 30))).toMatchObject({ anchorUsed: 'signOut', startsAt: signOut, endsAt: '2026-02-19T00:00:00.000Z' });
  });
  it('falls back collection → receipt → sign-out when a date is missing, and says which it used', () => {
    expect(resolveCorrelationWindow({ receivedAt: sp.receivedAt }, signOut, rule('collection'))).toMatchObject({ anchor: 'collection', anchorUsed: 'receipt' });
    expect(resolveCorrelationWindow({ collectedAt: 'garbage' }, signOut, rule('collection'))).toMatchObject({ anchorUsed: 'signOut' });
    expect(resolveCorrelationWindow({ collectedAt: sp.collectedAt }, signOut, rule('receipt'))).toMatchObject({ anchor: 'receipt', anchorUsed: 'collection' });
    expect(resolveCorrelationWindow({}, 'bad', rule('collection'))).toBeNull();
  });
  it('isInCorrelationWindow includes both ends and ignores missing or bad dates', () => {
    const w = { startsAt: '2026-01-01T00:00:00.000Z', endsAt: '2026-01-31T00:00:00.000Z' };
    expect(isInCorrelationWindow(w, [w.startsAt])).toBe(true);
    expect(isInCorrelationWindow(w, [w.endsAt])).toBe(true);
    expect(isInCorrelationWindow(w, ['2026-02-01T00:00:00.000Z', undefined, 'x'])).toBe(false);
  });
});

describe('validateCorrelationRule', () => {
  it('accepts 1 to 1825 whole days and the three anchors', () => {
    expect(validateCorrelationRule({ windowDays: 1, anchor: 'receipt' })).toEqual([]);
    expect(validateCorrelationRule({ windowDays: 1825 })).toEqual([]);
    expect(validateCorrelationRule({})).toEqual([]);
  });
  it('refuses 0, negative, fractional or very long windows, and unknown anchors', () => {
    for (const d of [0, -5, 90.5, 1826, NaN]) expect(validateCorrelationRule({ windowDays: d })).toEqual(['windowDaysInvalid']);
    expect(validateCorrelationRule({ anchor: 'accession' as never })).toEqual(['anchorInvalid']);
  });
});
