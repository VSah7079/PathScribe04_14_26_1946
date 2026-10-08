// Batch 458 (PS-71): the merge base kept with a browser draft copy is not a change.
import { describe, it, expect } from 'vitest';
import { computeDraftDiff } from './computeDraftDiff';

describe('computeDraftDiff', () => {
  it('ignores __draftBase and __draftVersion (what the draft was built from)', () => {
    expect(computeDraftDiff({ __draftBase: {}, __draftVersion: 3 }, { __draftBase: { synopticReports: [] }, __draftVersion: 2 })).toEqual([]);
  });
  it('still reports a real change', () => {
    expect(computeDraftDiff({ synopticReports: [] }, { synopticReports: [{ instanceId: 'S1' }] }).map(d => d.field)).toEqual(['synopticReports']);
  });
});
