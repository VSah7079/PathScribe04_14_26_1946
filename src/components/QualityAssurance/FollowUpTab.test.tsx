// @vitest-environment happy-dom
//
// Batch 454: Quality Assurance → Operations → Follow-up not received.
//   • it lists the follow-ups that need attention first;
//   • "Email ordering clinician" appears only where the facility turned it
//     on, opens a draft the user can edit, and nothing is sent until Send;
//   • recording an outcome needs a choice;
//   • the download goes through the QA export under qa:follow-up:export.
// The decisions themselves are tested in services/followUp/.
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }) }));

const h = vi.hoisted(() => {
  const window = (start: string, end: string) => ({ anchor: 'collection', anchorUsed: 'collection', startsAt: start, endsAt: end, windowDays: 180, ruleSource: 'enterprise' });
  const record = (key: string) => ({ key, clinicianContacts: [], alertsSent: {} });
  const items = [
    { key: 'cytology:c1:s1', kind: 'cytology', caseId: 'c1', specimenId: 's1', accession: 'CY26-0001', facilityId: 'F-ON', requestingProvider: 'Dr Order',
      window: window('2026-01-01T00:00:00Z', '2026-06-30T00:00:00Z'), dueAt: '2026-06-30T00:00:00Z', status: 'overdue', daysRemaining: null, daysOverdue: 96, record: record('cytology:c1:s1') },
    { key: 'surgical:c2:s1', kind: 'surgical', caseId: 'c2', specimenId: 's1', accession: 'S26-0002', facilityId: 'F-OFF',
      window: window('2026-05-01T00:00:00Z', '2026-10-20T00:00:00Z'), dueAt: '2026-10-20T00:00:00Z', status: 'dueSoon', daysRemaining: 16, daysOverdue: null, record: record('surgical:c2:s1') },
    { key: 'surgical:c3:s1', kind: 'surgical', caseId: 'c3', specimenId: 's1', accession: 'S26-0003', facilityId: 'F-ON',
      window: window('2026-09-01T00:00:00Z', '2027-02-28T00:00:00Z'), dueAt: '2027-02-28T00:00:00Z', status: 'pending', daysRemaining: 147, daysOverdue: null, record: record('surgical:c3:s1') },
  ];
  return {
    items,
    loadFollowUpItems: vi.fn(async () => ({ items, settingsFor: (f?: string) => ({ warningDays: 30, clinicianEmailEnabled: f === 'F-ON', emailSubject: '', emailBody: '', source: 'enterprise' }) })),
    draft: vi.fn(async () => ({ to: 'ann.lee@clinic.org', subject: 'Follow-up specimen requested: CY26-0001', body: 'Dear Dr Ann Lee,\nPlease send it.', clinicianName: 'Dr Ann Lee' })),
    sendEmail: vi.fn(async () => ({ ok: true, data: {} })),
    recordDisposition: vi.fn(async () => ({ ok: true, data: {} })),
    exportQaReport: vi.fn(async () => ({ ok: true, rowCount: 1 })),
  };
});

vi.mock('@/services', async () => {
  const tracking = await import('@/services/followUp/followUpTracking');
  const email = await import('@/services/followUp/followUpClinicianEmail');
  const actions = await import('@/services/followUp/followUpActions');
  const types = await import('@/services/followUp/followUpTypes');
  const settings = await import('@/services/followUp/followUpSettings');
  return {
    loadFollowUpItems: h.loadFollowUpItems,
    sendFollowUpAlertsLive: vi.fn(async () => 0),
    recordFollowUpDispositionLive: h.recordDisposition,
    reopenFollowUpLive: vi.fn(async () => ({ ok: true, data: {} })),
    draftFollowUpClinicianEmailLive: h.draft,
    emailOrderingClinicianLive: h.sendEmail,
    filterFollowUpItems: tracking.filterFollowUpItems,
    countFollowUpItems: tracking.countFollowUpItems,
    followUpCaseView: tracking.followUpCaseView,
    followUpExportRows: tracking.followUpExportRows,
    followUpOutcomeAction: tracking.followUpOutcomeAction,
    canOfferClinicianEmail: email.canOfferClinicianEmail,
    clinicianEmailProblem: email.clinicianEmailProblem,
    dispositionProblem: actions.dispositionProblem,
    MAX_FOLLOW_UP_NOTE: actions.MAX_FOLLOW_UP_NOTE,
    FOLLOW_UP_DISPOSITIONS: types.FOLLOW_UP_DISPOSITIONS,
    MAX_FOLLOW_UP_EMAIL_SUBJECT: settings.MAX_FOLLOW_UP_EMAIL_SUBJECT,
    MAX_FOLLOW_UP_EMAIL_BODY: settings.MAX_FOLLOW_UP_EMAIL_BODY,
    authorizationService: { enforce: vi.fn(async () => ({ allowed: true })), snapshot: vi.fn(async () => ({ subject: null, roles: [] })) },
    auditService: { logEvent: vi.fn(async () => undefined) },
    exportQaReport: h.exportQaReport,
  };
});
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u-qa', name: 'Pat QA' } }) }));
vi.mock('@/hooks/useOpenCase', () => ({ useOpenCase: () => vi.fn() }));
vi.mock('@/services/cases/CaseRouter', () => ({ caseRouter: { getAll: vi.fn(async () => ({ ok: true, data: [] })) } }));
vi.mock('@/services/auth/caseAccessControl', () => ({ getSessionUser: () => null, canViewCrossTenantQaData: () => false }));
// Batch 544: the scope picker, reduced to one button that picks F-ON.
vi.mock('./QaScopeSwitcher', () => ({
  QaScopeSwitcher: ({ onChange, visibleClientIds }: { onChange: (s: unknown) => void; visibleClientIds?: string[] }) =>
    <button type="button" data-offered={(visibleClientIds ?? []).join(',')} onClick={() => onChange({ level: 'client', clientId: 'F-ON' })}>pick F-ON</button>,
}));

vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, capability }: { children: React.ReactNode; onClick: () => void; capability: string }) =>
    <button type="button" data-capability={capability} onClick={onClick}>{children}</button>,
}));

import { FollowUpTab } from './FollowUpTab';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const rowOf = (accession: string) => screen.getByText(accession).closest('tr') as HTMLElement;

describe('FollowUpTab (Batch 454)', () => {
  it('shows the follow-ups needing attention, and reports how many', async () => {
    const onCount = vi.fn();
    render(<FollowUpTab onAttentionCountChange={onCount} />);
    await screen.findByText('CY26-0001');
    expect(screen.getByText('S26-0002')).toBeTruthy();
    expect(screen.queryByText('S26-0003')).toBeNull(); // pending: not in "Needs attention"
    expect(onCount).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByText('followUp.report.filters.all'));
    expect(screen.getByText('S26-0003')).toBeTruthy();
  });

  it('offers the clinician email only where the facility allows it; the draft is editable and sent only on Send', async () => {
    render(<FollowUpTab />);
    await screen.findByText('CY26-0001');
    expect(within(rowOf('S26-0002')).queryByText('followUp.report.emailClinician')).toBeNull();
    fireEvent.click(within(rowOf('CY26-0001')).getByText('followUp.report.emailClinician'));
    const to = await waitFor(() => { const el = document.getElementById('followup-email-to') as HTMLInputElement; expect(el.value).toBe('ann.lee@clinic.org'); return el; });
    expect(h.sendEmail).not.toHaveBeenCalled();
    fireEvent.change(to, { target: { value: 'office@clinic.org' } });
    fireEvent.change(document.getElementById('followup-email-body')!, { target: { value: 'Edited message' } });
    fireEvent.click(screen.getByText('followUp.report.send'));
    await waitFor(() => expect(h.sendEmail).toHaveBeenCalledTimes(1));
    expect(h.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ key: 'cytology:c1:s1' }),
      { to: 'office@clinic.org', subject: 'Follow-up specimen requested: CY26-0001', body: 'Edited message' }, { id: 'u-qa', name: 'Pat QA' });
  });

  it('refuses a bad address before anything is sent', async () => {
    render(<FollowUpTab />);
    await screen.findByText('CY26-0001');
    fireEvent.click(within(rowOf('CY26-0001')).getByText('followUp.report.emailClinician'));
    const to = await waitFor(() => { const el = document.getElementById('followup-email-to') as HTMLInputElement; expect(el.value).toBe('ann.lee@clinic.org'); return el; });
    fireEvent.change(to, { target: { value: 'nobody' } });
    fireEvent.click(screen.getByText('followUp.report.send'));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it('recording an outcome needs a choice, then saves it', async () => {
    render(<FollowUpTab />);
    await screen.findByText('S26-0002');
    fireEvent.click(within(rowOf('S26-0002')).getByText('followUp.report.recordOutcome'));
    fireEvent.click(screen.getByText('followUp.report.saveDisposition'));
    expect(await screen.findByText('followUp.errors.unknownDisposition')).toBeTruthy();
    fireEvent.change(document.getElementById('followup-disposition')!, { target: { value: 'receivedElsewhere' } });
    fireEvent.click(screen.getByText('followUp.report.saveDisposition'));
    await waitFor(() => expect(h.recordDisposition).toHaveBeenCalledWith(expect.objectContaining({ key: 'surgical:c2:s1' }), 'receivedElsewhere', '', { id: 'u-qa', name: 'Pat QA' }));
  });

  it('downloads the shown list through the QA export, with no patient name or note', async () => {
    render(<FollowUpTab />);
    await screen.findByText('CY26-0001');
    fireEvent.click(screen.getByText('common.export'));
    await waitFor(() => expect(h.exportQaReport).toHaveBeenCalledTimes(1));
    const [capability, rows] = h.exportQaReport.mock.calls[0] as unknown as [string, Record<string, unknown>[]];
    expect(capability).toBe('qa:follow-up:export');
    expect(rows.map(r => r.Case)).toEqual(['CY26-0001', 'S26-0002']);
    expect(Object.keys(rows[0])).not.toContain('Note');
  });

  it('Batch 544: one facility lists and exports only its follow-ups, checked for that facility', async () => {
    render(<FollowUpTab />);
    await screen.findByText('CY26-0001');
    const pick = screen.getByText('pick F-ON');
    expect(pick.getAttribute('data-offered')).toBe('F-OFF,F-ON');
    fireEvent.click(pick);
    await waitFor(() => expect(screen.queryByText('S26-0002')).toBeNull());
    fireEvent.click(screen.getByText('common.export'));
    await waitFor(() => expect(h.exportQaReport).toHaveBeenCalledTimes(1));
    const [, rows, filename, , context] = h.exportQaReport.mock.calls[0] as unknown as [string, Record<string, unknown>[], string, unknown, unknown];
    expect(rows.map(r => r.Case)).toEqual(['CY26-0001']);
    expect(filename).toMatch(/^follow-up-not-received-F-ON-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(context).toEqual({ facilityIds: ['F-ON'] });
  });
});
