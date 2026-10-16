// @vitest-environment happy-dom
//
// Batch 451 (PS-121): the Inspection Mode tab. One click on the download
// button exports the whole binder through the QA export service under
// qa:inspection-evidence:export, and a binder record's case link opens that
// case. The rows themselves and the capability refusal are tested in
// services/quality/resolveQaEvidenceBinder.test.ts.
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const h = vi.hoisted(() => {
  const now = new Date().toISOString();
  return {
    openCase: vi.fn(async () => undefined),
    exportQaReport: vi.fn(async () => ({ ok: true, rowCount: 2 })),
    authorizationService: { enforce: vi.fn(async () => ({ allowed: true })), snapshot: vi.fn(async () => ({ subject: null, roles: [] })) },
    records: [
      { id: 'r1', activityTypeId: 'qa-type-1', caseId: 'S26-0101', specimenId: 'A', caseType: 'Surgical', fieldValues: {}, outcome: 'discordant', severity: 'high', recordedAt: now, recordedBy: { userId: 'u1', userName: 'Dr. One' } },
      { id: 'r2', activityTypeId: 'qa-type-1', caseId: 'S26-0102', caseType: 'Surgical', fieldValues: {}, outcome: 'concordant', recordedAt: now, recordedBy: { userId: 'u2', userName: 'Dr. Two' } },
    ],
    types: [
      { id: 'qa-type-1', name: 'Frozen vs Final Correlation', tabScope: 'standard', jurisdictions: ['US'], fields: [], teachingOnboardingEnabled: false, active: true, createdAt: now, createdBy: 'seed', capaTriggerRule: { triggerSeverities: ['high'], deficiencyTypeId: 'd' } },
    ],
  };
});

vi.mock('@/services', () => ({
  auditService: { logEvent: vi.fn(async () => undefined) },
  qaActivityRecordService: { getAll: vi.fn(async () => ({ ok: true, data: h.records })) },
  qaActivityTypeService: { getAll: vi.fn(async () => ({ ok: true, data: h.types })) },
  authorizationService: h.authorizationService,
  exportQaReport: h.exportQaReport,
}));
vi.mock('@/services/auth/caseAccessControl', () => ({ getSessionUser: () => null, canViewCrossTenantQaData: () => false }));
vi.mock('@/hooks/useOpenCase', () => ({ useOpenCase: () => h.openCase }));
vi.mock('@/services/cases/CaseRouter', () => ({ caseRouter: { getAll: vi.fn(async () => ({ ok: true, data: [
  { id: 'S26-0101', order: { facilityId: 'fac-north' } }, { id: 'S26-0102', order: { facilityId: 'fac-south' } },
] })) } }));
// Batch 544: the scope picker, reduced to one button that picks fac-north.
vi.mock('./QaScopeSwitcher', () => ({
  QaScopeSwitcher: ({ onChange, visibleClientIds }: { onChange: (s: unknown) => void; visibleClientIds?: string[] }) =>
    <button type="button" data-offered={(visibleClientIds ?? []).join(',')} onClick={() => onChange({ level: 'client', clientId: 'fac-north' })}>pick fac-north</button>,
}));

// The greyed-out state is CapabilityButton's own concern; here it renders a
// plain button that names the capability it was given.
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, capability }: { children: React.ReactNode; onClick: () => void; capability: string }) =>
    <button type="button" data-capability={capability} onClick={onClick}>{children}</button>,
}));

import { InspectionModeTab } from './InspectionModeTab';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('InspectionModeTab (PS-121)', () => {
  it('the one-click download is gated by qa:inspection-evidence:export and exports every binder record as CSV for all facilities', async () => {
    render(<InspectionModeTab />);
    const download = await screen.findByText('inspectionModeTab.downloadButton');
    expect(download.getAttribute('data-capability')).toBe('qa:inspection-evidence:export');

    fireEvent.click(download);
    expect(h.exportQaReport).toHaveBeenCalledTimes(1);
    const [capability, rows, filename, deps, context] = h.exportQaReport.mock.calls[0] as unknown as
      [string, Record<string, string>[], string, { authorization: unknown }, unknown];
    expect(capability).toBe('qa:inspection-evidence:export');
    expect(rows.map(r => [r.Case, r.Outcome, r['Meets CAPA Threshold']])).toEqual([
      ['S26-0101', 'Discordant', 'Yes'],
      ['S26-0102', 'Concordant', 'No'],
    ]);
    expect(filename).toMatch(/^qa-inspection-evidence-binder-24mo-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(deps.authorization).toBe(h.authorizationService);
    expect(context).toEqual({ allFacilities: true });
  });

  it('Batch 544: one facility exports only its records, checked for that facility and named for it', async () => {
    render(<InspectionModeTab />);
    const pick = await screen.findByText('pick fac-north');
    await waitFor(() => expect(pick.getAttribute('data-offered')).toBe('fac-north,fac-south'));
    fireEvent.click(pick);
    fireEvent.click(screen.getByText('inspectionModeTab.downloadButton'));
    const [, rows, filename, , context] = h.exportQaReport.mock.calls[0] as unknown as [string, Record<string, string>[], string, unknown, unknown];
    expect(rows.map(r => r.Case)).toEqual(['S26-0101']);
    expect(filename).toMatch(/^qa-inspection-evidence-binder-24mo-fac-north-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(context).toEqual({ facilityIds: ['fac-north'] });
  });

  it('drilling into a binder record opens the underlying case', async () => {
    render(<InspectionModeTab />);
    fireEvent.click(await screen.findByText('Frozen vs Final Correlation'));
    const caseLink = await screen.findByText('S26-0101');
    expect(caseLink.tagName).toBe('BUTTON');
    expect(caseLink.getAttribute('data-phi')).toBe('accession');
    fireEvent.click(caseLink);
    expect(h.openCase).toHaveBeenCalledWith('S26-0101', 'synoptic');
    fireEvent.click(within(caseLink.closest('tbody')!).getByText('S26-0102'));
    expect(h.openCase).toHaveBeenLastCalledWith('S26-0102', 'synoptic');
  });

  it('shows each activity type\'s jurisdictions by their translated names', async () => {
    render(<InspectionModeTab />);
    expect(await screen.findByText('jurisdictionNames.US')).toBeTruthy();
  });
});
