import { describe, it, expect, vi } from 'vitest';
import { resolveQaEvidenceBinder, qaEvidenceBinderCsvRows, qaEvidenceBinderExportFilename } from './resolveQaEvidenceBinder';
import { exportQaReport } from '@/services/qualityAssurance/qaExport';
import { parseCsv } from '@/utils/csv';
import type { QaActivityRecord } from '@/types/quality/QaActivityRecord';
import type { QaActivityType } from '@/types/quality/QaActivityType';

const NOW = new Date('2026-09-20T00:00:00.000Z');

const activityTypes: QaActivityType[] = [
  {
    id: 'qa-activity-frozen-final', name: 'Frozen vs Final Correlation', tabScope: 'standard',
    jurisdictions: ['US', 'GB_EW'],
    fields: [], teachingOnboardingEnabled: false, active: true, createdAt: '2026-01-01T00:00:00.000Z', createdBy: 'seed',
    capaTriggerRule: { triggerSeverities: ['high'], deficiencyTypeId: 'def-x' },
  },
  {
    id: 'qa-activity-custom-noJurisdiction', name: 'Site-Specific Grossing QA', tabScope: 'custom',
    fields: [], teachingOnboardingEnabled: false, active: true, createdAt: '2026-01-01T00:00:00.000Z', createdBy: 'seed',
  },
];

function rec(overrides: Partial<QaActivityRecord>): QaActivityRecord {
  return {
    id: overrides.id ?? `rec-${Math.random()}`,
    activityTypeId: 'qa-activity-frozen-final',
    caseId: 'S26-0001',
    caseType: 'Test',
    fieldValues: {},
    outcome: 'concordant',
    recordedAt: NOW.toISOString(),
    recordedBy: { userId: 'user-1', userName: 'Dr. Test' },
    ...overrides,
  };
}

describe('resolveQaEvidenceBinder', () => {
  it('an empty input produces an honest, zeroed binder', () => {
    const report = resolveQaEvidenceBinder([], activityTypes, 24, NOW);
    expect(report.totalRecords).toBe(0);
    expect(report.entries).toEqual([]);
    expect(report.windowMonths).toBe(24);
  });

  it('excludes records outside the requested window', () => {
    const outsideWindow = rec({ recordedAt: new Date('2020-01-01T00:00:00.000Z').toISOString() });
    const insideWindow = rec({ recordedAt: NOW.toISOString() });
    const report = resolveQaEvidenceBinder([outsideWindow, insideWindow], activityTypes, 24, NOW);
    expect(report.totalRecords).toBe(1);
  });

  it('maps an activity type to its real, configured jurisdictions\' regulatory clauses', () => {
    const report = resolveQaEvidenceBinder([rec({})], activityTypes, 24, NOW);
    const entry = report.entries.find(e => e.activityTypeId === 'qa-activity-frozen-final');
    expect(entry?.regulatoryBasis).toEqual([
      { jurisdiction: 'US', clause: 'CAP AP Checklist / CLIA interpretive QA requirements' },
      { jurisdiction: 'GB_EW', clause: 'UKAS ISO 15189 — interpretive audits, discrepancy documentation' },
    ]);
  });

  it('a custom activity type with no configured jurisdictions honestly cites none, not a fabricated default', () => {
    const report = resolveQaEvidenceBinder(
      [rec({ activityTypeId: 'qa-activity-custom-noJurisdiction' })], activityTypes, 24, NOW,
    );
    const entry = report.entries.find(e => e.activityTypeId === 'qa-activity-custom-noJurisdiction');
    expect(entry?.regulatoryBasis).toEqual([]);
  });

  it('flags a record as meeting the CAPA threshold only when discordant and severity matches the configured trigger', () => {
    const meetsThreshold = rec({ id: 'a', outcome: 'discordant', severity: 'high' });
    const belowThreshold = rec({ id: 'b', outcome: 'discordant', severity: 'low' });
    const concordant = rec({ id: 'c', outcome: 'concordant' });
    const report = resolveQaEvidenceBinder([meetsThreshold, belowThreshold, concordant], activityTypes, 24, NOW);
    const entry = report.entries.find(e => e.activityTypeId === 'qa-activity-frozen-final')!;
    expect(entry.capaThresholdMetCount).toBe(1);
    expect(entry.records.find(r => r.recordId === 'a')?.meetsCapaThreshold).toBe(true);
    expect(entry.records.find(r => r.recordId === 'b')?.meetsCapaThreshold).toBe(false);
  });

  it('sorts entries by descending record volume', () => {
    const report = resolveQaEvidenceBinder(
      [rec({ activityTypeId: 'qa-activity-custom-noJurisdiction' }), rec({}), rec({})],
      activityTypes, 24, NOW,
    );
    expect(report.entries[0].activityTypeId).toBe('qa-activity-frozen-final');
    expect(report.entries[0].totalRecords).toBe(2);
  });
});

// PS-121 (Batch 451): the Inspection Mode tab's one-click binder export.
describe('Inspection Mode binder CSV export (PS-121)', () => {
  const binder = () => resolveQaEvidenceBinder([
    rec({ id: 'a', caseId: 'S26-0001', specimenId: 'A', outcome: 'discordant', severity: 'high', recordedAt: '2026-09-19T00:00:00.000Z', recordedBy: { userId: 'u1', userName: 'Dr. One' } }),
    rec({ id: 'b', caseId: 'S26-0002', outcome: 'concordant', recordedAt: '2026-09-18T00:00:00.000Z', recordedBy: { userId: 'u2', userName: 'Dr. Two' } }),
    rec({ id: 'c', activityTypeId: 'qa-activity-custom-noJurisdiction', caseId: 'S26-0003', outcome: 'discordant', severity: 'low', recordedAt: '2026-09-17T00:00:00.000Z' }),
  ], activityTypes, 24, NOW);

  it('one row per record across every activity type, with the regulatory basis, outcome, CAPA threshold and reviewer, in English', () => {
    expect(qaEvidenceBinderCsvRows(binder())).toEqual([
      {
        'Activity Type': 'Frozen vs Final Correlation',
        'Regulatory Basis': 'United States: CAP AP Checklist / CLIA interpretive QA requirements | England & Wales (NHS): UKAS ISO 15189 — interpretive audits, discrepancy documentation',
        Case: 'S26-0001', Specimen: 'A', Outcome: 'Discordant', Severity: 'high', 'Meets CAPA Threshold': 'Yes',
        Recorded: '2026-09-19T00:00:00.000Z', Reviewer: 'Dr. One',
      },
      {
        'Activity Type': 'Frozen vs Final Correlation',
        'Regulatory Basis': 'United States: CAP AP Checklist / CLIA interpretive QA requirements | England & Wales (NHS): UKAS ISO 15189 — interpretive audits, discrepancy documentation',
        Case: 'S26-0002', Specimen: 'Case-level', Outcome: 'Concordant', Severity: '—', 'Meets CAPA Threshold': 'No',
        Recorded: '2026-09-18T00:00:00.000Z', Reviewer: 'Dr. Two',
      },
      {
        'Activity Type': 'Site-Specific Grossing QA', 'Regulatory Basis': 'No jurisdiction configured',
        Case: 'S26-0003', Specimen: 'Case-level', Outcome: 'Discordant', Severity: 'low', 'Meets CAPA Threshold': 'No',
        Recorded: '2026-09-17T00:00:00.000Z', Reviewer: 'Dr. Test',
      },
    ]);
  });

  it('carries no patient name, MRN or date of birth column', () => {
    const columns = Object.keys(qaEvidenceBinderCsvRows(binder())[0]);
    expect(columns.some(c => /patient|mrn|birth|dob/i.test(c))).toBe(false);
  });

  it('names the file after the window and the day', () => {
    expect(qaEvidenceBinderExportFilename(24, NOW)).toBe('qa-inspection-evidence-binder-24mo-2026-09-20.csv');
  });

  it('exporting checks qa:inspection-evidence:export for all facilities and delivers every binder row as CSV', async () => {
    const enforce = vi.fn(async () => ({ allowed: true as const }));
    const deliver = vi.fn();
    const record = vi.fn(async () => undefined);
    const rows = qaEvidenceBinderCsvRows(binder());
    const res = await exportQaReport('qa:inspection-evidence:export', rows, qaEvidenceBinderExportFilename(24, NOW),
      { authorization: { enforce } as never, deliver, record }, { allFacilities: true });
    expect(res).toEqual({ ok: true, rowCount: 3 });
    expect(enforce).toHaveBeenCalledWith('qa:inspection-evidence:export', { allFacilities: true });
    const [filename, csv] = deliver.mock.calls[0] as [string, string];
    expect(filename).toBe('qa-inspection-evidence-binder-24mo-2026-09-20');
    const parsed = parseCsv(csv);
    expect(parsed.map(r => r.Case)).toEqual(['S26-0001', 'S26-0002', 'S26-0003']);
    expect(parsed[0]['Regulatory Basis']).toContain('England & Wales (NHS): UKAS ISO 15189');
  });

  it('without qa:inspection-evidence:export the export is refused and no file is made', async () => {
    const enforce = vi.fn(async () => ({ allowed: false as const, reason: 'missingCapability' }));
    const deliver = vi.fn();
    const record = vi.fn(async () => undefined);
    const res = await exportQaReport('qa:inspection-evidence:export', qaEvidenceBinderCsvRows(binder()), 'x.csv',
      { authorization: { enforce } as never, deliver, record }, { allFacilities: true });
    expect(res).toEqual({ ok: false, reason: 'notPermitted' });
    expect(deliver).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });
});
