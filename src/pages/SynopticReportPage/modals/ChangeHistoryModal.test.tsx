// @vitest-environment happy-dom
//
// src/pages/SynopticReportPage/modals/ChangeHistoryModal.test.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 451 (PS-353): the report page's "recorded saves" chip (HeaderBar)
// opens Change history, which lists saves newest first, each with its
// workstation, and filters by area. HeaderBar and the modal are wired here
// the way SynopticReportPage wires them (chip → showChangeHistory → modal).
// Real English locale. The view rules are tested in
// services/reportChangeLog/changeHistoryView.test.ts.
// ─────────────────────────────────────────────────────────────────────────────
import i18n from '@/i18n/config';
import React, { useState } from 'react';
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import type { Case } from '@/types/case/Case';
import type { ReportChangeEntry, ReportFieldChange } from '@/services';

vi.mock('react-router', async importOriginal => ({ ...(await importOriginal<typeof import('react-router')>()), useNavigate: () => vi.fn() }));
vi.mock('@/hooks/useOpenCase', () => ({ useOpenCase: () => vi.fn() }));
vi.mock('@/contexts/MessagingContext', () => ({ useMessaging: () => ({ setPortalOpen: vi.fn() }) }));
vi.mock('@/hooks/useCapabilities', () => ({ useCapabilities: () => ({ loading: false, can: () => false, has: () => false, decide: () => ({ allowed: false }) }) }));

import HeaderBar from '../components/HeaderBar';
import { ChangeHistoryModal } from './ChangeHistoryModal';

beforeAll(async () => { await i18n.changeLanguage('en'); });
afterEach(() => cleanup());

const change = (area: ReportFieldChange['area'], field: string, before: string, after: string): ReportFieldChange =>
  ({ area, path: [field], kind: 'changed', before, after } as ReportFieldChange);
// As the log returns them: oldest first.
const entries: ReportChangeEntry[] = [
  { id: 'e1', caseId: 'C1', at: '2026-10-01T09:00:00Z', userId: 'u1', userName: 'Dr Early', stationId: 'GROSS-01', changes: [change('synoptic', 'tumourSize', '12 mm', '14 mm'), change('codes', 'icd10', 'C50.1', 'C50.4')] },
  { id: 'e2', caseId: 'C1', at: '2026-10-02T09:00:00Z', userId: 'u2', userName: 'Dr Middle', stationId: null, changes: [change('narrative', 'microscopic', 'Old', 'New')] },
  { id: 'e3', caseId: 'C1', at: '2026-10-03T09:00:00Z', userId: 'u3', userName: 'Dr Latest', stationId: 'SIGNOUT-07', changes: [change('synoptic', 'margins', 'Involved', 'Clear')] },
];
const caseData = { id: 'C1', status: 'in-progress', accession: { fullAccession: 'S26-353' }, specimens: [] } as unknown as Case;

/** HeaderBar's chip and the modal, wired as SynopticReportPage wires them. */
const ReportHeaderWithHistory: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <HeaderBar caseData={caseData} onSignOut={vi.fn()} onNavigate={vi.fn()} changeCount={entries.length} onOpenChangeHistory={() => setOpen(true)} />
      {open && <ChangeHistoryModal entries={entries} exportContext={{ caseId: 'C1', facilityId: null }} onExport={vi.fn()} onClose={() => setOpen(false)} />}
    </>
  );
};

const shownSavers = () => Array.from(document.querySelectorAll('.ps-chghist-entry-header')).map(h => h.querySelector('span')?.textContent);
const filter = (name: string) => within(screen.getByRole('group', { name: 'Show changes to' })).getByRole('button', { name: new RegExp(`^${name}`) }) as HTMLButtonElement;

describe('PS-353 the report page\'s recorded-saves chip and Change history', () => {
  it('the chip counts the recorded saves and opens Change history', () => {
    render(<ReportHeaderWithHistory />);
    expect(screen.queryByText('Change history')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /3 recorded saves — click to view change history/ }));
    expect(screen.getByText(/Change history/)).toBeTruthy();
    expect(screen.getByText(/3 saves recorded for this case/)).toBeTruthy();
  });

  it('no chip when nothing has been recorded', () => {
    render(<HeaderBar caseData={caseData} onSignOut={vi.fn()} onNavigate={vi.fn()} changeCount={0} onOpenChangeHistory={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /recorded save/ })).toBeNull();
  });

  it('lists saves newest first, each with the workstation it came from (when known)', () => {
    render(<ReportHeaderWithHistory />);
    fireEvent.click(screen.getByRole('button', { name: /recorded saves/ }));
    expect(shownSavers()).toEqual(['Dr Latest', 'Dr Middle', 'Dr Early']);
    const headers = document.querySelectorAll('.ps-chghist-entry-header');
    expect(headers[0].querySelector('.ps-chghist-station')?.textContent).toBe('Workstation SIGNOUT-07');
    expect(headers[1].querySelector('.ps-chghist-station')).toBeNull();
    expect(headers[2].querySelector('.ps-chghist-station')?.textContent).toBe('Workstation GROSS-01');
  });

  it('filters by area: only saves touching that area, only their changes in it; an area with nothing is greyed out', () => {
    render(<ReportHeaderWithHistory />);
    fireEvent.click(screen.getByRole('button', { name: /recorded saves/ }));
    expect(filter('Synoptic answers').textContent).toContain('2');
    expect(filter('Case details').disabled).toBe(true);

    fireEvent.click(filter('Synoptic answers'));
    expect(shownSavers()).toEqual(['Dr Latest', 'Dr Early']);
    expect(screen.queryByText('C50.4')).toBeNull(); // Dr Early's code change is in another area
    expect(screen.getByText('14 mm')).toBeTruthy();

    fireEvent.click(filter('Codes'));
    expect(shownSavers()).toEqual(['Dr Early']);
    expect(screen.getByText('C50.4')).toBeTruthy();

    fireEvent.click(filter('All'));
    expect(shownSavers()).toEqual(['Dr Latest', 'Dr Middle', 'Dr Early']);
  });
});
