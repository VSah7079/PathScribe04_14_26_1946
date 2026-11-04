import { describe, it, expect } from 'vitest';
import { resolveFieldRequirements } from '../fieldRequirements/fieldRequirementRules';
import { preAnalyticGateMissing, buildPreAnalyticResolutions, emptyPreAnalyticRow, type PreAnalyticRowState } from './preAnalyticGate';

const reqs = resolveFieldRequirements('report');
const spec = (id: string, missingCollectedAt: boolean, missingReceivedAt: boolean) => ({ specimenId: id, label: id, description: 'd', missingCollectedAt, missingReceivedAt });
const row = (over: Partial<PreAnalyticRowState>): PreAnalyticRowState => ({ ...emptyPreAnalyticRow(), ...over });

describe('collection/receipt date gate (Batch 383)', () => {
  it('only the dates a specimen is missing are asked for', () => {
    const specimens = [spec('s1', true, false)];
    expect(preAnalyticGateMissing(specimens, { s1: row({}) }, reqs)).toEqual(['preAnalyticCollectedAt']);
    expect(preAnalyticGateMissing(specimens, { s1: row({ collected: { mode: 'time', value: '2026-09-01T07:00' } }) }, reqs)).toEqual([]);
  });
  it('lists each missing field once, in catalog order, across specimens', () => {
    const specimens = [spec('s1', true, true), spec('s2', false, true)];
    expect(preAnalyticGateMissing(specimens, {}, reqs)).toEqual(['preAnalyticCollectedAt', 'preAnalyticReceivedAt']);
  });
  it('an override needs its justification', () => {
    const specimens = [spec('s1', true, true)];
    const r = row({ collected: { mode: 'override' }, received: { mode: 'time', value: '2026-09-01T09:00' } });
    expect(preAnalyticGateMissing(specimens, { s1: r }, reqs)).toEqual(['preAnalyticOverrideComment']);
    expect(preAnalyticGateMissing(specimens, { s1: { ...r, comment: '  ' } }, reqs)).toEqual(['preAnalyticOverrideComment']);
    expect(preAnalyticGateMissing(specimens, { s1: { ...r, comment: 'Lost in transit' } }, reqs)).toEqual([]);
  });
  it('none of the three can be switched off', () => {
    const tried = resolveFieldRequirements('report', { preAnalyticCollectedAt: false, preAnalyticReceivedAt: false, preAnalyticOverrideComment: false });
    expect(preAnalyticGateMissing([spec('s1', true, true)], {}, tried)).toEqual(['preAnalyticCollectedAt', 'preAnalyticReceivedAt']);
  });
  it('builds the resolutions, flags overrides and trims the comment', () => {
    const specimens = [spec('s1', true, true), spec('s2', false, true)];
    const out = buildPreAnalyticResolutions(specimens, {
      s1: row({ collected: { mode: 'time', value: '2026-09-01T07:00' }, received: { mode: 'override' }, comment: ' Lost ' }),
      s2: row({ received: { mode: 'time', value: '2026-09-01T09:00' } }),
    });
    expect(out[0]).toEqual({ specimenId: 's1', collectedAt: new Date('2026-09-01T07:00').toISOString(), receivedAtAdministrativeOverride: true, overrideComment: 'Lost' });
    expect(out[1]).toEqual({ specimenId: 's2', receivedAt: new Date('2026-09-01T09:00').toISOString() });
  });
});
