// @vitest-environment happy-dom
//
// src/pages/CytologyWorklistPage/CytologyWorklistPage.hpvResult.test.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 451 (PS-175), changed in Batch 630: the Cytology Worklist's Record Positive / Record Negative buttons (HPV Triage
// tile) open a dialog that asks for the Result Source, then call recordManualHpvResult (permission, audit and the second
// sign-off live there, tested in recordManualHpvResult.test.ts). A manual entry that would replace an interface result
// waits for a different person's approval, shown on the row. Loading and the service are mocked.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act, waitFor } from '@testing-library/react';
import type { Case } from '@/types/case/Case';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const { loadCytologyWorklist, claimPoolCase, acceptPoolCase, passPoolCase } = vi.hoisted(() => ({
  loadCytologyWorklist: vi.fn(), claimPoolCase: vi.fn(), acceptPoolCase: vi.fn(), passPoolCase: vi.fn(),
}));
vi.mock('@/services', async () => ({
  ...(await vi.importActual<typeof import('@/services/cytology/cytologyWorklist')>('@/services/cytology/cytologyWorklist')),
  loadCytologyWorklist, claimPoolCase, acceptPoolCase, passPoolCase,
}));
const { recordManualHpvResult, decideManualHpvOverride } = vi.hoisted(() => ({ recordManualHpvResult: vi.fn(), decideManualHpvOverride: vi.fn() }));
vi.mock('@/services/cytology/recordManualHpvResult', () => ({ recordManualHpvResult, decideManualHpvOverride }));

const USER = { id: 'u-cyto', name: 'Cy Tech' };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: USER }) }));
const pushCrumb = () => {};
vi.mock('@/contexts/BreadcrumbContext', () => ({ useBreadcrumb: () => ({ pushCrumb }) }));
vi.mock('@/hooks/useOpenCase', () => ({ useOpenCase: () => vi.fn() }));
vi.mock('@/pages/Synoptic/useSynopticFlags', () => ({
  useSynopticFlags: () => ({
    flagCaseData: null, flagDefinitions: [], showFlagManager: false, setShowFlagManager: () => {},
    openFlagManager: () => {}, onApplyFlags: () => {}, onRemoveFlag: () => {},
  }),
}));
vi.mock('@/components/Flags/FlagManagerModal', () => ({ default: () => null }));
vi.mock('@/utils/openComposeTo', () => ({ openComposeTo: vi.fn() }));
// Batch 572: the screening-hours panel has its own tests (ScreeningHoursPanel.test.tsx).
vi.mock('@/contexts/SystemConfigContext', () => ({ useSystemConfig: () => ({ config: { facilityTimezone: 'America/Phoenix', jurisdiction: 'US' } }) }));
vi.mock('@/hooks/useCapabilities', () => ({ useCapabilities: () => ({ loading: false, has: () => true, decide: () => ({ allowed: true }) }) }));
vi.mock('./hooks/useCytologyWorkloadSummary', () => ({ useCytologyWorkloadSummary: () => null }));
vi.mock('./hooks/useScreeningHoursSignOff', () => ({ useScreeningHoursSignOff: () => ({ today: null, yesterday: null, saving: false, signOff: vi.fn(), reload: vi.fn() }) }));

import CytologyWorklistPage from './CytologyWorklistPage';

const TRIAGE_CASE = {
  id: 'C-500', originEnterpriseId: 'ent-1',
  accession: { fullAccession: 'S26-5003-CYT-001' },
  patient: { firstName: 'Test', lastName: 'Patient', mrn: 'MRN-1' },
  specimens: [{ id: 'sp-1', label: 'A', specimenDictionaryEntryId: 'dict-thinprep' }],
} as unknown as Case;

function worklistWith(triageRows: Case[]) {
  return { rows: [], qcRows: [], triageRows, scansCompletedRows: [], recallRows: [] };
}

beforeEach(() => {
  loadCytologyWorklist.mockResolvedValue(worklistWith([TRIAGE_CASE]));
  recordManualHpvResult.mockResolvedValue({ outcome: 'recorded' });
  decideManualHpvOverride.mockResolvedValue({ outcome: 'approved' });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

async function openTriageTile() {
  render(<CytologyWorklistPage />);
  await act(async () => {});
  fireEvent.click(screen.getByText('cytologyWorklist.tiles.hpvTriage'));
}

describe('CytologyWorklistPage (PS-175, Batch 630) — Record HPV Positive / Negative by hand', () => {
  it('Record Positive asks for the Result Source, will not confirm without one, then records it with the chosen source and reloads', async () => {
    const before = JSON.parse(JSON.stringify(TRIAGE_CASE));
    await openTriageTile();
    expect(loadCytologyWorklist).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('cytologyWorklist.actions.recordHpvPositive'));
    const confirm = screen.getByText('cytologyWorklist.manualHpv.confirmDirect') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'MANUAL_PAPER_REPORT' } });
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    await waitFor(() => expect(recordManualHpvResult).toHaveBeenCalledTimes(1));
    expect(recordManualHpvResult).toHaveBeenCalledWith({
      caseId: 'C-500', specimenLetter: 'A', result: 'Positive', source: 'MANUAL_PAPER_REPORT', actor: { id: 'u-cyto', name: 'Cy Tech' },
    });
    expect(TRIAGE_CASE).toEqual(before);
    await waitFor(() => expect(loadCytologyWorklist).toHaveBeenCalledTimes(2));
    expect(loadCytologyWorklist).toHaveBeenLastCalledWith('u-cyto');
  });

  it('Record Negative records a Negative; cancelling records nothing', async () => {
    await openTriageTile();
    fireEvent.click(screen.getByText('cytologyWorklist.actions.recordHpvNegative'));
    fireEvent.click(screen.getByText('common.cancel'));
    await act(async () => {});
    expect(recordManualHpvResult).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('cytologyWorklist.actions.recordHpvNegative'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'MANUAL_DOWNTIME_OVERRIDE' } });
    fireEvent.click(screen.getByText('cytologyWorklist.manualHpv.confirmDirect'));
    await waitFor(() => expect(recordManualHpvResult).toHaveBeenCalledTimes(1));
    expect(recordManualHpvResult.mock.calls[0][0]).toMatchObject({ result: 'Negative', source: 'MANUAL_DOWNTIME_OVERRIDE' });
  });

  it('a row holding an interface result (Invalid) says an entry needs a second sign-off', async () => {
    const withInterface = { ...TRIAGE_CASE, specimens: [{ id: 'sp-1', label: 'A', specimenDictionaryEntryId: 'dict-thinprep', cytologyScreening: { hpvResult: 'Invalid' } }] } as unknown as Case;
    loadCytologyWorklist.mockResolvedValue(worklistWith([withInterface]));
    await openTriageTile();
    fireEvent.click(screen.getByText('cytologyWorklist.actions.recordHpvPositive'));
    expect(screen.getByRole('note').textContent).toContain('cytologyWorklist.manualHpv.overwriteNotice');
    expect(screen.getByText('cytologyWorklist.manualHpv.confirmPending')).toBeTruthy();
  });

  it('a waiting entry shows Approve / Reject instead of Record buttons, and Approve calls the second-sign-off service', async () => {
    const waiting = { ...TRIAGE_CASE, specimens: [{ id: 'sp-1', label: 'A', specimenDictionaryEntryId: 'dict-thinprep', cytologyScreening: {
      hpvResult: 'Invalid', hpvPendingOverride: { result: 'Positive', source: 'MANUAL_PAPER_REPORT', enteredById: 'u-1', enteredByName: 'Ann', enteredAt: 't', previousResult: 'Invalid', previousSource: 'INTERFACE' } } }] } as unknown as Case;
    loadCytologyWorklist.mockResolvedValue(worklistWith([waiting]));
    await openTriageTile();
    expect(screen.queryByText('cytologyWorklist.actions.recordHpvPositive')).toBeNull();
    expect(screen.getByText('cytologyWorklist.badges.hpvOverridePending')).toBeTruthy();
    fireEvent.click(screen.getByText('cytologyWorklist.actions.approveOverride'));
    await waitFor(() => expect(decideManualHpvOverride).toHaveBeenCalledWith({ caseId: 'C-500', specimenLetter: 'A', decision: 'approved', actor: { id: 'u-cyto', name: 'Cy Tech' } }));
  });
});
