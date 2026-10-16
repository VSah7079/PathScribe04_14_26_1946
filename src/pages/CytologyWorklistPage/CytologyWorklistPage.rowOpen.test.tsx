// @vitest-environment happy-dom
//
// src/pages/CytologyWorklistPage/CytologyWorklistPage.rowOpen.test.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 566 (PS-539 phase 2d; WCAG 4.1.2, axe nested-interactive): a screening
// row holds buttons of its own (flags, ask a colleague, claim), so the row is no
// longer a button. Its title (the patient's name, or the MRN when there is none) is the button that opens the
// case; clicking elsewhere on the row still opens it, as a mouse shortcut. A pool
// row opens nothing, so its title stays plain text. Loading is mocked.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import type { Case } from '@/types/case/Case';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const { loadCytologyWorklist, openCase } = vi.hoisted(() => ({ loadCytologyWorklist: vi.fn(), openCase: vi.fn() }));
vi.mock('@/services', async () => ({
  ...(await vi.importActual<typeof import('@/services/cytology/cytologyWorklist')>('@/services/cytology/cytologyWorklist')),
  loadCytologyWorklist, claimPoolCase: vi.fn(), acceptPoolCase: vi.fn(), passPoolCase: vi.fn(),
}));
vi.mock('@/services/hl7/processInboundHpvResultEvent', () => ({ processInboundHpvResultEvent: vi.fn() }));

const USER = { id: 'u-cyto', name: 'Cy Tech' };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: USER }) }));
const pushCrumb = () => {};
vi.mock('@/contexts/BreadcrumbContext', () => ({ useBreadcrumb: () => ({ pushCrumb }) }));
vi.mock('@/hooks/useOpenCase', () => ({ useOpenCase: () => openCase }));
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
vi.mock('@/hooks/useCapabilities', () => ({ useCapabilities: () => ({ loading: false, has: () => false }) }));
vi.mock('./hooks/useCytologyWorkloadSummary', () => ({ useCytologyWorkloadSummary: () => null }));
vi.mock('./hooks/useScreeningHoursSignOff', () => ({ useScreeningHoursSignOff: () => ({ today: null, yesterday: null, saving: false, signOff: vi.fn(), reload: vi.fn() }) }));

import CytologyWorklistPage from './CytologyWorklistPage';

const row = (id: string, last: string, extra: Record<string, unknown>) => ({
  caseData: { id, patient: { firstName: 'Ann', lastName: last, mrn: `MRN-${id}` }, specimens: [], ...extra } as unknown as Case,
  specimenId: null, isGynCytology: true,
  isQcPending: false, isRetrospectiveReviewPending: false, isPostSignOutPeerReviewPending: false,
  isHistologyCorrelationPending: false, isCellBlockAncillaryPending: false, isRoseActive: false, isCsmsQaPending: false,
  hasFinalDiagnosis: false,
});

beforeEach(() => {
  loadCytologyWorklist.mockResolvedValue({
    rows: [row('C-1', 'Mine', { order: { assignedTo: USER.id } }), row('C-2', 'Pooled', { status: 'pool' }),
      { ...row('C-3', 'Flagged', {}), isCsmsQaPending: true }],
    qcRows: [], triageRows: [], scansCompletedRows: [], recallRows: [],
  });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

async function show() {
  render(<CytologyWorklistPage />);
  await act(async () => {});
}

describe('CytologyWorklistPage (Batch 566): a row that holds buttons is not itself a button', () => {
  it('the title is a button that opens the case once; the row has no role or tab stop', async () => {
    await show();
    const open = screen.getByRole('button', { name: 'MRN-C-1' });
    expect(open.getAttribute('data-phi')).toBe('name');
    const rowEl = open.closest('.ps-cytoworklist-row') as HTMLElement;
    expect(rowEl.getAttribute('role')).toBeNull();
    expect(rowEl.getAttribute('tabindex')).toBeNull();
    expect(rowEl.querySelector('[role="button"] button, button button')).toBeNull();
    fireEvent.click(open);
    expect(openCase).toHaveBeenCalledTimes(1);
    expect(openCase).toHaveBeenCalledWith('C-1', 'cytology');
  });

  it('clicking elsewhere on the row still opens the case (mouse shortcut)', async () => {
    await show();
    const rowEl = screen.getByRole('button', { name: 'MRN-C-1' }).closest('.ps-cytoworklist-row') as HTMLElement;
    fireEvent.click(rowEl.querySelector('.ps-cytoworklist-row-subtitle')!);
    expect(openCase).toHaveBeenCalledWith('C-1', 'cytology');
  });

  it('a pool row opens nothing, so its title is plain text', async () => {
    await show();
    fireEvent.click(screen.getByText(/cytologyWorklist\.tabs\.pool|cytologyWorklist\.tiles\.pool/, { selector: 'button, button *' }));
    await act(async () => {});
    expect(screen.queryByRole('button', { name: 'MRN-C-2' })).toBeNull();
    const title = document.querySelector('.ps-cytoworklist-row-title') as HTMLElement;
    expect(title.tagName).toBe('DIV');
    fireEvent.click(title);
    expect(openCase).not.toHaveBeenCalled();
  });

  it("a button inside the row (Manage flags) does its own job and doesn't also open the case", async () => {
    await show();
    fireEvent.click(screen.getByText('cytologyWorklist.tiles.csmsQa'));
    await act(async () => {});
    expect(screen.getByRole('button', { name: 'MRN-C-3' })).toBeTruthy();
    fireEvent.click(screen.getByText('cytologyWorklist.actions.manageFlags'));
    expect(openCase).not.toHaveBeenCalled();
  });
});
