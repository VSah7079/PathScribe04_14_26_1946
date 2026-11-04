// src/services/reportChangeLog/changeHistoryView.test.ts
// Batch 451 (PS-353): what the report's Change history screen shows — newest
// save first, filtered by area, with per-area counts for the filter buttons.
// The screen itself is rendered in
// pages/SynopticReportPage/modals/ChangeHistoryModal.test.tsx.
import { describe, it, expect } from 'vitest';
import { changeHistoryView, CHANGE_HISTORY_AREAS } from './reportChangeRules';
import type { ReportChangeEntry, ReportFieldChange } from './IReportChangeLogService';

const change = (area: ReportFieldChange['area'], field: string): ReportFieldChange =>
  ({ area, path: [field], kind: 'changed', before: 'a', after: 'b' } as ReportFieldChange);
const entry = (id: string, at: string, changes: ReportFieldChange[]): ReportChangeEntry =>
  ({ id, caseId: 'C1', at, userId: 'u1', userName: 'Dr A', stationId: 'WS-1', changes });

// As the log returns them: oldest first.
const log = [
  entry('e1', '2026-10-01T09:00:00Z', [change('synoptic', 'tumourSize'), change('codes', 'icd10')]),
  entry('e2', '2026-10-01T10:00:00Z', [change('narrative', 'microscopic')]),
  entry('e3', '2026-10-01T11:00:00Z', [change('synoptic', 'margins')]),
];

describe('PS-353 change history view', () => {
  it('shows every save newest first when no area is chosen', () => {
    expect(changeHistoryView(log, 'all').entries.map(e => e.id)).toEqual(['e3', 'e2', 'e1']);
  });

  it('an area filter keeps only that area\'s changes, drops saves with none, and stays newest first', () => {
    const { entries } = changeHistoryView(log, 'synoptic');
    expect(entries.map(e => e.id)).toEqual(['e3', 'e1']);
    expect(entries[1].changes.map(c => c.path[0])).toEqual(['tumourSize']);
    expect(changeHistoryView(log, 'codes').entries.map(e => e.id)).toEqual(['e1']);
    expect(changeHistoryView(log, 'case').entries).toEqual([]);
  });

  it('counts changed fields per area across all saves, whatever the filter (0 for an area with none)', () => {
    const expected = { synoptic: 2, narrative: 1, codes: 1, specimens: 0, case: 0 };
    expect(changeHistoryView(log, 'all').counts).toEqual(expected);
    expect(changeHistoryView(log, 'narrative').counts).toEqual(expected);
    expect(Object.keys(expected)).toEqual([...CHANGE_HISTORY_AREAS]);
  });

  it('does not reorder the log it was given', () => {
    changeHistoryView(log, 'all');
    expect(log.map(e => e.id)).toEqual(['e1', 'e2', 'e3']);
  });
});
