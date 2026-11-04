import { describe, it, expect } from 'vitest';
import { resolveFieldRequirements } from '../fieldRequirements/fieldRequirementRules';
import { fixativeGateMissing, buildFixativeResolutions, type FixativeRowState } from './fixativeGate';

const reqs = resolveFieldRequirements('report');
const specimens = [
  { specimenId: 's1', label: 'A', description: 'Breast' },
  { specimenId: 's2', label: 'B', description: 'Node' },
];
const rows = (a: FixativeRowState, b: FixativeRowState) => ({ s1: a, s2: b });
const time = (value: string, estimated = false): FixativeRowState => ({ mode: 'time', value, estimated });

describe('fixation time gate (Batch 383)', () => {
  it('every specimen needs a time or the "no time possible" confirmation', () => {
    expect(fixativeGateMissing(specimens, rows({ mode: 'unset' }, { mode: 'unset' }), reqs)).toEqual(['fixationTime']);
    expect(fixativeGateMissing(specimens, rows(time('2026-09-01T08:00'), { mode: 'unset' }), reqs)).toEqual(['fixationTime']);
    expect(fixativeGateMissing(specimens, rows(time(''), time('2026-09-01T08:00')), reqs)).toEqual(['fixationTime']);
    expect(fixativeGateMissing(specimens, rows(time('2026-09-01T08:00'), { mode: 'unrecoverable', comment: '' }), reqs)).toEqual([]);
  });
  it('the last-resort comment is optional until an organisation requires it', () => {
    const strict = resolveFieldRequirements('report', { fixationUnrecoverableComment: true });
    const r = rows(time('2026-09-01T08:00'), { mode: 'unrecoverable', comment: '  ' });
    expect(fixativeGateMissing(specimens, r, strict)).toEqual(['fixationUnrecoverableComment']);
    expect(fixativeGateMissing(specimens, rows(time('2026-09-01T08:00'), { mode: 'unrecoverable', comment: 'Not documented' }), strict)).toEqual([]);
  });
  it('the fixation time can\'t be switched off', () => {
    const tried = resolveFieldRequirements('report', { fixationTime: false });
    expect(fixativeGateMissing(specimens, rows({ mode: 'unset' }, { mode: 'unset' }), tried)).toEqual(['fixationTime']);
  });
  it('builds documented, estimated and unrecoverable resolutions', () => {
    const out = buildFixativeResolutions(specimens, rows(time('2026-09-01T08:00', true), { mode: 'unrecoverable', comment: ' Not documented ' }));
    expect(out[0]).toMatchObject({ specimenId: 's1', processedAtIsEstimated: true, resolutionTypeId: 'res-fixation-estimated' });
    expect(out[0].processedAt).toBe(new Date('2026-09-01T08:00').toISOString());
    expect(out[1]).toEqual({ specimenId: 's2', processedAtIsEstimated: false, resolutionTypeId: 'res-fixation-unrecoverable', resolutionComment: 'Not documented' });
    expect(buildFixativeResolutions(specimens, rows(time('2026-09-01T08:00'), { mode: 'unrecoverable', comment: '' }))[1].resolutionComment).toBeUndefined();
    expect(buildFixativeResolutions(specimens, rows(time('2026-09-01T08:00'), time('2026-09-01T09:00')))[0].resolutionTypeId).toBe('res-fixation-documented');
  });
});
