// @vitest-environment happy-dom
//
// src/pages/CytologyWorklistPage/CytologyWorklistPage.hpvResult.test.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 451 (PS-175): the Cytology Worklist's Record Positive / Record
// Negative buttons (HPV Triage tile) don't edit the specimen: they build the
// HPV result event an interface engine would deliver
// (services/cytology/cytologyWorklist.ts simulatedHpvResultEvent, run for
// real here) and send it through processInboundHpvResultEvent, the same
// processor a real delivery uses, then reload the worklist. Loading and the
// processor are mocked.
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
const { processInboundHpvResultEvent } = vi.hoisted(() => ({ processInboundHpvResultEvent: vi.fn() }));
vi.mock('@/services/hl7/processInboundHpvResultEvent', () => ({ processInboundHpvResultEvent }));

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
  processInboundHpvResultEvent.mockResolvedValue({ outcome: 'applied' });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

async function openTriageTile() {
  render(<CytologyWorklistPage />);
  await act(async () => {});
  fireEvent.click(screen.getByText('cytologyWorklist.tiles.hpvTriage'));
}

describe('CytologyWorklistPage (PS-175) — Record HPV Positive / Negative', () => {
  it('Record Positive sends the interface-engine HPV result event through processInboundHpvResultEvent, leaves the case untouched, and reloads', async () => {
    const before = JSON.parse(JSON.stringify(TRIAGE_CASE));
    await openTriageTile();
    expect(loadCytologyWorklist).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('cytologyWorklist.actions.recordHpvPositive'));
    await waitFor(() => expect(processInboundHpvResultEvent).toHaveBeenCalledTimes(1));
    const event = processInboundHpvResultEvent.mock.calls[0][0];
    expect(event).toEqual({
      messageId: expect.any(String), timestamp: expect.any(String),
      organisationId: 'ent-1', internalCaseId: 'C-500', accessionNumber: 'S26-5003-CYT-001',
      specimenLetter: 'A', hrHpvResult: 'Positive', abnormalFlag: 'A',
    });
    expect(Number.isNaN(Date.parse(event.timestamp))).toBe(false);
    expect(TRIAGE_CASE).toEqual(before);
    await waitFor(() => expect(loadCytologyWorklist).toHaveBeenCalledTimes(2));
    expect(loadCytologyWorklist).toHaveBeenLastCalledWith('u-cyto');
  });

  it('Record Negative sends a Negative, normal-flag event; each delivery gets its own message id', async () => {
    await openTriageTile();
    fireEvent.click(screen.getByText('cytologyWorklist.actions.recordHpvNegative'));
    await waitFor(() => expect(processInboundHpvResultEvent).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByText('cytologyWorklist.actions.recordHpvNegative'));
    await waitFor(() => expect(processInboundHpvResultEvent).toHaveBeenCalledTimes(2));
    const [[first], [second]] = processInboundHpvResultEvent.mock.calls;
    expect(first).toMatchObject({ internalCaseId: 'C-500', hrHpvResult: 'Negative', abnormalFlag: 'N' });
    expect(first.messageId).not.toBe(second.messageId);
  });

  it('a case with no dictionary specimen sends nothing', async () => {
    loadCytologyWorklist.mockResolvedValue(worklistWith([{ ...TRIAGE_CASE, specimens: [{ id: 'sp-1', label: 'A' }] } as unknown as Case]));
    await openTriageTile();
    fireEvent.click(screen.getByText('cytologyWorklist.actions.recordHpvPositive'));
    await act(async () => {});
    expect(processInboundHpvResultEvent).not.toHaveBeenCalled();
  });
});
