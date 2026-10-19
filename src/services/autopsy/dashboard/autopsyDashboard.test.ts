import { describe, it, expect } from 'vitest';
import type { Case } from '@/types/case/Case';
import { buildSimulatedAutopsyRecords } from './autopsyDashboardSeed';
import { buildAutopsyDashboardRecords, liveAutopsyRecords } from './buildAutopsyDashboardRecords';
import {
  consentKindOf, evaluateRecords, facilitiesIn, forFacility, groupSummaries, overdueCases, summarizeTier, withinPeriod,
} from './autopsyDashboardCalculations';
import type { AutopsyDashboardRecord } from './autopsyDashboardTypes';

const NOW = new Date('2026-10-18T12:00:00Z');

const rec = (over: Partial<Omit<AutopsyDashboardRecord, 'autopsy'>> & { autopsy?: Partial<AutopsyDashboardRecord['autopsy']> } = {}): AutopsyDashboardRecord => {
  const { autopsy, ...rest } = over;
  return {
    id: 'SIM-A-1', simulated: true, facilityId: 'f1', facilityName: 'F1', jurisdiction: 'DE', startedAt: '2026-10-10T00:00:00Z',
    autopsy: { jurisdiction: 'DE', caseAuthority: 'hospital_consented', scope: 'full', addenda: [], ancillaryHold: { active: false }, ...autopsy },
    cause: 'cardiovascular',
    ...rest,
  };
};
const signed = (tier: 'PAD' | 'FAD', iso: string) => ({ tier, frozenPayload: null, signedBy: { name: 'X', isPathologist: true }, signedAt: iso });

describe('Simulated autopsy seed', () => {
  it('is deterministic, labelled Simulated, and free of patient data', () => {
    const a = buildSimulatedAutopsyRecords(NOW);
    const b = buildSimulatedAutopsyRecords(NOW);
    expect(a).toEqual(b);
    expect(a).toHaveLength(60);
    expect(a.every(r => r.simulated && r.id.startsWith('SIM-A-') && r.facilityName.includes('Simulated'))).toBe(true);
    expect(JSON.stringify(a)).not.toMatch(/patient|mrn|dateOfBirth/i);
  });
  it('spans several facilities, jurisdictions, consent states and causes', () => {
    const all = evaluateRecords(buildSimulatedAutopsyRecords(NOW), [], NOW);
    const s = summarizeTier(all);
    expect(new Set(all.map(r => r.facilityId)).size).toBe(3);
    expect(new Set(all.map(r => r.jurisdiction)).size).toBe(2);
    expect(s.consent.active).toBeGreaterThan(0);
    expect(s.consent.not_applicable).toBeGreaterThan(0);
    expect(s.causes.length).toBeGreaterThanOrEqual(5);
    expect(s.pad.decided).toBeGreaterThan(10);
    expect(s.pad.withinPct).not.toBeNull();
  });
});

describe('summarizeTier', () => {
  // DE: PAD within 48 hours, FAD within 30 days.
  const records = evaluateRecords([
    rec({ id: 'a', autopsy: { padSnapshot: signed('PAD', '2026-10-10T20:00:00Z'), fadSnapshot: signed('FAD', '2026-10-17T00:00:00Z') } }),
    rec({ id: 'b', autopsy: { padSnapshot: signed('PAD', '2026-10-14T04:00:00Z') } }),
    rec({ id: 'c' }),
    rec({ id: 'd', startedAt: '2026-10-18T10:00:00Z' }),
  ], [], NOW);

  it('counts the turnaround outcomes of the PAD and the FAD', () => {
    const s = summarizeTier(records);
    expect(s.count).toBe(4);
    expect(s.pad).toMatchObject({ decided: 3, within: 1, withinPct: 33, overdue: 1, open: 1, medianHours: 60 });
    expect(s.fad).toMatchObject({ decided: 1, within: 1, withinPct: 100, overdue: 0, open: 3 });
    expect(s.overdueNow).toBe(1);
  });
  it('shows no percentage when nothing is decided yet', () => {
    const s = summarizeTier(evaluateRecords([rec({ startedAt: '2026-10-18T10:00:00Z' })], [], NOW));
    expect(s.pad.withinPct).toBeNull();
    expect(s.pad.medianHours).toBeNull();
  });
  it('lists the cases overdue on the report they are working towards, longest first', () => {
    const list = overdueCases(records, NOW);
    expect(list.map(x => x.record.id)).toEqual(['c']);
    expect(list[0].result.tier).toBe('PAD');
    expect(list[0].overdueHours).toBe(156); // due Oct 12 00:00, now Oct 18 12:00
  });
  it('honours an admin override of the PAD target', () => {
    const tight = evaluateRecords([rec({ id: 'x', startedAt: '2026-10-18T10:00:00Z' })], [
      { id: 't', type: 'AUTOPSY_PAD', targetHours: 1, urgency: null, facilityId: null, performingLabFacilityId: null, specimenId: null, subspecialtyId: null, roleId: null, active: true, notes: '', createdAt: '2026-10-01T00:00:00Z' },
    ], NOW);
    expect(tight[0].tat.pad.state).toBe('overdue');
    expect(tight[0].tat.pad.source).toBe('override');
  });
});

describe('consent, retention, causes', () => {
  it('maps consent from the authority and the consent record', () => {
    expect(consentKindOf(rec({ autopsy: { caseAuthority: 'statutory_judicial' } }))).toBe('not_applicable');
    expect(consentKindOf(rec())).toBe('active');
    expect(consentKindOf(rec({ autopsy: { hospitalConsent: { consentingRelativeName: 'S', consentingRelativeRelationship: 'spouse', consentGivenAt: '2026-10-01T00:00:00Z', status: 'revoked', consentScope: [], excludedOrgans: [], retentionPermitted: false } } }))).toBe('revoked');
  });
  it('tallies retention tiers (none when unset) and causes, largest first', () => {
    const rows = evaluateRecords([
      rec({ id: '1', cause: 'neoplasm', autopsy: { organRetentionTier: 'tier_1_diagnostic_tissue_only' } }),
      rec({ id: '2', cause: 'neoplasm' }),
      rec({ id: '3', cause: 'not_recorded' }),
    ], [], NOW);
    const s = summarizeTier(rows);
    expect(s.retention.tier_1_diagnostic_tissue_only).toBe(1);
    expect(s.retention.none).toBe(2);
    expect(s.causes).toEqual([{ cause: 'neoplasm', count: 2 }, { cause: 'not_recorded', count: 1 }]);
  });
});

describe('tiers', () => {
  const rows = evaluateRecords([
    rec({ id: '1', facilityId: 'f1', facilityName: 'Alpha', jurisdiction: 'DE' }),
    rec({ id: '2', facilityId: 'f1', facilityName: 'Alpha', jurisdiction: 'DE' }),
    rec({ id: '3', facilityId: 'f2', facilityName: 'Beta', jurisdiction: 'GB_EW', autopsy: { jurisdiction: 'GB_EW' } }),
  ], [], NOW);
  it('picks a department and lists the facilities present', () => {
    expect(forFacility(rows, 'f1').map(r => r.id)).toEqual(['1', '2']);
    expect(facilitiesIn(rows)).toEqual([{ id: 'f1', name: 'Alpha' }, { id: 'f2', name: 'Beta' }]);
  });
  it('groups the enterprise by facility and by jurisdiction', () => {
    expect(groupSummaries(rows, r => ({ key: r.facilityId, label: r.facilityName })).map(g => [g.label, g.summary.count])).toEqual([['Alpha', 2], ['Beta', 1]]);
    expect(groupSummaries(rows, r => ({ key: r.jurisdiction, label: r.jurisdiction })).map(g => g.key)).toEqual(['DE', 'GB_EW']);
  });
  it('filters by period on body arrival', () => {
    const old = [{ startedAt: '2026-01-01T00:00:00Z' }, { startedAt: '2026-10-10T00:00:00Z' }];
    expect(withinPeriod(old, 30, NOW)).toHaveLength(1);
    expect(withinPeriod(old, null, NOW)).toHaveLength(2);
  });
});

describe('record builder', () => {
  const live = {
    id: 'case-1', accession: { fullAccession: 'A26-4660' }, specimens: [{ receivedAt: '2026-10-17T00:00:00Z' }],
    order: { facilityId: 'c1', facilityName: 'Metro General Hospital' },
    autopsy: { jurisdiction: 'US', caseAuthority: 'hospital_consented', scope: 'full', addenda: [], ancillaryHold: { active: false } },
  } as unknown as Case;
  const notAutopsy = { id: 'case-2', specimens: [] } as unknown as Case;
  it('turns real autopsy cases into records with no recorded cause of death', () => {
    const r = liveAutopsyRecords([live, notAutopsy]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ id: 'A26-4660', simulated: false, cause: 'not_recorded', facilityName: 'Metro General Hospital' });
  });
  it('adds the Simulated cases only when asked', () => {
    expect(buildAutopsyDashboardRecords({ cases: [live], includeSimulated: false, now: NOW })).toHaveLength(1);
    expect(buildAutopsyDashboardRecords({ cases: [live], includeSimulated: true, now: NOW })).toHaveLength(61);
  });
});

import { buildAutopsyDashboardView } from './autopsyDashboardView';

describe('buildAutopsyDashboardView', () => {
  const records = buildSimulatedAutopsyRecords(NOW);
  const base = { records, tatEntries: [], period: 'all' as const, now: NOW };
  it('enterprise: every record, grouped by facility and jurisdiction', () => {
    const v = buildAutopsyDashboardView({ ...base, tier: 'enterprise' });
    expect(v.summary.count).toBe(60);
    expect(v.byFacility).toHaveLength(3);
    expect(v.byJurisdiction.map(g => g.key).sort()).toEqual(['GB_EW', 'US']);
    expect(v.simulatedCount).toBe(60);
  });
  it('department: defaults to the first facility and lists what is overdue', () => {
    const v = buildAutopsyDashboardView({ ...base, tier: 'department' });
    expect(v.selectedFacilityId).toBe(v.facilities[0].id);
    expect(v.summary.count).toBe(records.filter(r => r.facilityId === v.facilities[0].id).length);
    expect(v.overdue.every(o => o.result.state === 'overdue')).toBe(true);
    const other = buildAutopsyDashboardView({ ...base, tier: 'department', facilityId: 'sim-fac-teaching' });
    expect(other.selectedFacilityId).toBe('sim-fac-teaching');
    expect(buildAutopsyDashboardView({ ...base, tier: 'department', facilityId: 'nope' }).selectedFacilityId).toBe(v.facilities[0].id);
  });
  it('case: defaults to the newest case and can pick another', () => {
    const v = buildAutopsyDashboardView({ ...base, tier: 'case' });
    expect(v.selectedCase?.id).toBe(v.cases[0].id);
    expect(v.summary.count).toBe(1);
    const pick = v.cases[5].id;
    expect(buildAutopsyDashboardView({ ...base, tier: 'case', caseId: pick }).selectedCase?.id).toBe(pick);
  });
  it('narrows to the chosen period and copes with no data', () => {
    const month = buildAutopsyDashboardView({ ...base, tier: 'enterprise', period: '30' });
    expect(month.summary.count).toBeLessThan(60);
    const none = buildAutopsyDashboardView({ ...base, records: [], tier: 'case' });
    expect(none.selectedCase).toBeNull();
    expect(none.summary.count).toBe(0);
  });
});
