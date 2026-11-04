// src/services/quality/qaActivityBoard.test.ts
// Batch 518 (PS-120): the generic QA activity board.
import { describe, it, expect } from 'vitest';
import { activityTypeSources, countersignSource, activityTatTargetHours, qaBoardTile, orderedSources, fieldValueText } from './qaActivityBoard';
import type { QaActivityType } from '@/types/quality/QaActivityType';
import type { QaActivityRecord } from '@/types/quality/QaActivityRecord';
import type { CountersignRecord } from '@/types/case/CountersignRecord';
import type { TATEntry } from '@/types/quality/TatConfigEntry';

const NOW = Date.parse('2026-10-10T12:00:00Z');
const daysAgo = (d: number, h = 0) => new Date(NOW - d * 86_400_000 - h * 3_600_000).toISOString();

const type = (id: string, tabScope: 'standard' | 'custom', over: Partial<QaActivityType> = {}): QaActivityType => ({
  id, name: id.toUpperCase(), tabScope, active: true, teachingOnboardingEnabled: false, createdAt: '', createdBy: '',
  fields: [
    { id: 'grade', label: 'Grade', type: 'dropdown', required: true, options: [{ id: 'g1', label: 'Agree' }, { id: 'g2', label: 'Disagree' }] },
    { id: 'tags', label: 'Tags', type: 'checkboxes', required: false, options: [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }] },
    { id: 'note', label: 'Note', type: 'text', required: false, options: [] },
  ],
  ...over,
});
const record = (id: string, activityTypeId: string, outcome: 'concordant' | 'discordant', at: string): QaActivityRecord => ({
  id, activityTypeId, caseId: `S26-${id}`, caseType: 'surgical', outcome, recordedAt: at,
  recordedBy: { userId: 'u', userName: 'Dr Lee' }, fieldValues: { grade: 'g2', tags: ['a', 'b'], note: 'ok' },
});

describe('QA activity board (Batch 518, PS-120)', () => {
  it('one source per active activity type; columns come from its fields, values show option labels', () => {
    const sources = activityTypeSources([type('peer', 'standard'), type('mine', 'custom'), type('old', 'custom', { active: false })], [record('1', 'peer', 'discordant', daysAgo(1))]);
    expect(sources.map(s => [s.id, s.scope])).toEqual([['peer', 'standard'], ['mine', 'custom']]);
    expect(sources[0].columns.map(c => c.label)).toEqual(['Grade', 'Tags', 'Note']);
    expect(sources[0].rows[0].values).toEqual({ grade: 'Disagree', tags: 'Alpha, Beta', note: 'ok' });
    expect(sources[0].pending).toBeNull();
    expect(fieldValueText(type('x', 'custom').fields[0], undefined)).toBe('');
  });

  it('countersign comes through the adapter, with its pending queue and turnaround', () => {
    const cs = [
      { id: 'a', caseId: 'S26-1', residentId: 'r', residentName: 'Res', releasedAt: daysAgo(2, 30), countersignedAt: daysAgo(2, 6), status: 'countersigned', changedFieldCount: 0 },
      { id: 'b', caseId: 'S26-2', residentId: 'r', residentName: 'Res', releasedAt: daysAgo(3, 10), returnedAt: daysAgo(3), status: 'returned' },
      { id: 'c', caseId: 'S26-3', residentId: 'r', residentName: 'Res', releasedAt: daysAgo(0, 2), status: 'pending' },
    ] as unknown as CountersignRecord[];
    const src = countersignSource(cs);
    expect(src.pending).toBe(1);
    const tile = qaBoardTile(src, 12, NOW);
    expect(tile).toEqual({ sourceId: 'countersign', pending: 1, completed: 2, tatCompliance: 50, discrepancyRate: 50 });
    expect(qaBoardTile(src, null, NOW).tatCompliance).toBeNull();
  });

  it('a tile counts only the period, and says "unknown" rather than 0', () => {
    const [src] = activityTypeSources([type('peer', 'standard')], [
      record('1', 'peer', 'discordant', daysAgo(1)), record('2', 'peer', 'concordant', daysAgo(2)),
      record('3', 'peer', 'concordant', daysAgo(3)), record('4', 'peer', 'discordant', daysAgo(45)),
    ]);
    expect(qaBoardTile(src, 48, NOW)).toEqual({ sourceId: 'peer', pending: null, completed: 3, tatCompliance: null, discrepancyRate: 33.3 });
    const [empty] = activityTypeSources([type('none', 'custom')], []);
    expect(qaBoardTile(empty, null, NOW)).toMatchObject({ completed: 0, discrepancyRate: null });
  });

  it('the TAT target is the activity\'s own entry, the most general one', () => {
    const e = (over: Partial<TATEntry>): TATEntry => ({ id: 'x', type: 'peer', targetHours: 48, urgency: null, facilityId: null, performingLabFacilityId: null, specimenId: null, subspecialtyId: null, roleId: null, active: true, notes: '', createdAt: '', ...over });
    expect(activityTatTargetHours([e({ facilityId: 'f1', targetHours: 24 }), e({ targetHours: 72 })], 'peer')).toBe(72);
    expect(activityTatTargetHours([e({ active: false })], 'peer')).toBeNull();
    expect(activityTatTargetHours([e({})], 'other')).toBeNull();
  });

  it('orders Standard, then Custom, by name, then workflow adapters', () => {
    const ordered = orderedSources([countersignSource([]), ...activityTypeSources([type('zeta', 'custom'), type('beta', 'standard'), type('alpha', 'custom')], [])]);
    expect(ordered.map(s => s.id)).toEqual(['beta', 'alpha', 'zeta', 'countersign']);
  });
});
