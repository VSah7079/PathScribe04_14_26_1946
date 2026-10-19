// @vitest-environment happy-dom
// src/services/digitalPathology/aiQaReports.test.ts
// Batch 610 (#78): the stalled-result rule, its setting, and the rows behind the AI discordance tab.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  resolveStalledAiResults, validateAiStalledTimeoutHours, AI_STALLED_TIMEOUT_DEFAULT_HOURS,
} from './aiStalledResultRule';
import { buildVendorDiscordanceRows, vendorDiscordanceExportRows, stalledResultExportRows, formatDiscordancePercent } from './aiQaReportRows';
import type { AiScreeningResult } from '@/types/digitalPathology/AiScreeningResult';
import type { DpVendorEntry } from './IDpVendorService';

const { allowed } = vi.hoisted(() => ({ allowed: { current: true } }));
vi.mock('../authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: vi.fn(async (capability: string) => ({ capability, allowed: allowed.current, grantedBy: [], missingRequirements: [], context: {} })) },
}));
const { mockAiStalledResultSettingsService: settings } = await import('./mockAiStalledResultSettingsService');

const NOW = new Date('2026-10-18T12:00:00.000Z');
const result = (over: Partial<AiScreeningResult>): AiScreeningResult => ({
  id: 'r', caseId: 'S26-0001', vendorId: 'v1', status: 'completed', orderedAt: '2026-10-18T00:00:00.000Z', findings: [], ...over,
});
const vendor = (id: string, name: string, active = true): DpVendorEntry => ({ id, name, productName: `${name} product`, modality: 'x', fdaCleared: true, active, isSystem: false, sortOrder: 1 });

describe('resolveStalledAiResults', () => {
  it('lists ordered results past the timeout, the longest-waiting first, with whole hours waiting', () => {
    const stalled = resolveStalledAiResults([
      result({ id: 'a', status: 'ordered', orderedAt: '2026-10-17T06:30:00.000Z' }), // 29.5 h
      result({ id: 'b', status: 'ordered', orderedAt: '2026-10-16T12:00:00.000Z' }), // 48 h
      result({ id: 'c', status: 'ordered', orderedAt: '2026-10-18T06:00:00.000Z' }), // 6 h, not yet
      result({ id: 'd', status: 'completed', orderedAt: '2026-10-01T00:00:00.000Z' }), // answered
    ], NOW, 24);
    expect(stalled.map(s => [s.result.id, s.hoursWaiting])).toEqual([['b', 48], ['a', 29]]);
  });
  it('uses the timeout it is given; the default is 24 hours', () => {
    const r = [result({ status: 'ordered', orderedAt: '2026-10-18T06:00:00.000Z' })];
    expect(resolveStalledAiResults(r, NOW, 4)).toHaveLength(1);
    expect(resolveStalledAiResults(r, NOW, 12)).toHaveLength(0);
    expect(AI_STALLED_TIMEOUT_DEFAULT_HOURS).toBe(24);
    expect(resolveStalledAiResults([result({ status: 'ordered', orderedAt: '2026-10-17T11:00:00.000Z' })], NOW)).toHaveLength(1);
  });
});

describe('validateAiStalledTimeoutHours', () => {
  it('accepts whole hours from 1 to 720', () => {
    expect(validateAiStalledTimeoutHours(1)).toBeNull();
    expect(validateAiStalledTimeoutHours(720)).toBeNull();
    for (const bad of [0, 721, 1.5, Number.NaN, -3]) expect(validateAiStalledTimeoutHours(bad)).toBe('timeoutHoursInvalid');
  });
});

describe('mockAiStalledResultSettingsService', () => {
  beforeEach(() => { localStorage.clear(); allowed.current = true; });
  it('starts at 24 hours, saves a change, refuses a bad one', async () => {
    expect(await settings.get()).toEqual({ ok: true, data: { timeoutHours: 24 } });
    expect(await settings.update({ timeoutHours: 8 })).toEqual({ ok: true, data: { timeoutHours: 8 } });
    expect(await settings.get()).toEqual({ ok: true, data: { timeoutHours: 8 } });
    expect(await settings.update({ timeoutHours: 0 })).toEqual({ ok: false, error: 'timeoutHoursInvalid' });
    expect(await settings.get()).toEqual({ ok: true, data: { timeoutHours: 8 } });
  });
  it('needs the vendor-integrations permission to change it', async () => {
    allowed.current = false;
    const res = await settings.update({ timeoutHours: 8 });
    expect(res.ok).toBe(false);
    expect(await settings.get()).toEqual({ ok: true, data: { timeoutHours: 24 } });
  });
});

describe('buildVendorDiscordanceRows', () => {
  const vendors = [vendor('v1', 'Paige'), vendor('v2', 'PathAI'), vendor('v3', 'Idle'), vendor('v4', 'Retired', false)];
  const results = [
    result({ id: '1', vendorId: 'v1', humanConcordant: true }),
    result({ id: '2', vendorId: 'v1', humanConcordant: false }),
    result({ id: '3', vendorId: 'v2', humanConcordant: true }),
    result({ id: '4', vendorId: 'v2' }), // not reviewed
    result({ id: '5', vendorId: 'v4', humanConcordant: true }),
  ];
  const rows = buildVendorDiscordanceRows(results, vendors);

  it('gives each vendor its counts and rate; the highest discordance comes first', () => {
    expect(rows.map(r => r.vendorId)).toEqual(['v1', 'v2', 'v4', 'v3']);
    expect(rows[0]).toMatchObject({ orderedCount: 2, reviewedCount: 2, concordantCount: 1, discordantCount: 1, discordanceRate: 0.5 });
    expect(rows[1]).toMatchObject({ orderedCount: 2, reviewedCount: 1, discordanceRate: 0 });
  });
  it('an active vendor with nothing reviewed has no rate (never 0%); an inactive one without results is left out', () => {
    expect(rows.find(r => r.vendorId === 'v3')).toMatchObject({ reviewedCount: 0, discordanceRate: undefined });
    expect(buildVendorDiscordanceRows([], [vendor('v4', 'Retired', false)])).toEqual([]);
  });
  it('a result from a vendor missing from the dictionary still appears, under its id', () => {
    const r = buildVendorDiscordanceRows([result({ vendorId: 'gone', humanConcordant: true })], []);
    expect(r[0]).toMatchObject({ vendorId: 'gone', vendorName: 'gone' });
  });
});

describe('export rows', () => {
  it('format the rate to one decimal and leave it empty when there is none', () => {
    expect(formatDiscordancePercent(1 / 3)).toBe('33.3');
    expect(formatDiscordancePercent(undefined)).toBe('');
  });
  it('vendor rows use English column names and carry no patient detail', () => {
    const rows = vendorDiscordanceExportRows(buildVendorDiscordanceRows([result({ vendorId: 'v1', humanConcordant: false })], [vendor('v1', 'Paige')]));
    expect(rows).toEqual([{
      Vendor: 'Paige', Product: 'Paige product', 'Screenings ordered': 1, 'Reviewed by a pathologist': 1,
      Concordant: 0, Discordant: 1, 'Discordance rate (%)': '100.0',
    }]);
  });
  it('stalled rows carry the accession, vendor, order time and hours waiting', () => {
    const stalled = resolveStalledAiResults([result({ caseId: 'S26-77', vendorId: 'v1', status: 'ordered', orderedAt: '2026-10-17T00:00:00.000Z' })], NOW, 24);
    expect(stalledResultExportRows(stalled, [vendor('v1', 'Paige')], 24)).toEqual([
      { Accession: 'S26-77', Vendor: 'Paige', 'Ordered at': '2026-10-17T00:00:00.000Z', 'Hours waiting': 36, 'Timeout (hours)': 24 },
    ]);
  });
});
