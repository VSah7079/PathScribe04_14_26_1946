// Batch 441: the QA Configuration Center's CAPA Trigger column.
import { describe, it, expect } from 'vitest';
import { capaTriggerSummary } from './capaTriggerSummary';
import { withDemoClientPerformingLab } from '../facilities/mockFacilityService';

describe('capaTriggerSummary', () => {
  const defs = [{ id: 'd1', name: 'Diagnostic discordance' }];
  it('nothing when no severity recommends a CAPA', () => {
    expect(capaTriggerSummary(undefined, defs)).toBeNull();
    expect(capaTriggerSummary({ triggerSeverities: [] }, defs)).toBeNull();
  });
  it('the severities, the deficiency type by name (or its id if gone), and "after release only" (PS-148)', () => {
    expect(capaTriggerSummary({ triggerSeverities: ['high'], deficiencyTypeId: 'd1', postSignOutOnly: true }, defs))
      .toEqual({ severities: ['high'], deficiencyName: 'Diagnostic discordance', postSignOutOnly: true });
    expect(capaTriggerSummary({ triggerSeverities: ['medium', 'high'], deficiencyTypeId: 'gone' }, defs))
      .toEqual({ severities: ['medium', 'high'], deficiencyName: 'gone', postSignOutOnly: false });
  });
});

describe('Batch 441: Desert Valley\'s demo ordering clients name their performing lab', () => {
  it('fills c1–c5 when empty; keeps one an administrator set; leaves others alone', () => {
    const f = (id: string, performingLabFacilityId?: string) => ({ id, performingLabFacilityId }) as never;
    const { records, filled } = withDemoClientPerformingLab([f('c1'), f('c2', 'c-ent-mpa'), f('c9')]);
    expect(filled).toBe(true);
    expect(records.map((r: { performingLabFacilityId?: string }) => r.performingLabFacilityId)).toEqual(['c-ent-dvmc', 'c-ent-mpa', undefined]);
  });
});
