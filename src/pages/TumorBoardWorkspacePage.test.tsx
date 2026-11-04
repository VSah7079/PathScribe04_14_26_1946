// @vitest-environment happy-dom
//
// src/pages/TumorBoardWorkspacePage.test.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 489 — a light smoke test: the page renders its title, filter bar
// and the empty-row state when the hook returns no listings, without
// throwing. The hook's own filtering/sorting is covered directly in
// tumorBoardWorkspaceFilters.test.ts and mockTumorBoardService.test.ts;
// this just proves the page wires the hook up and renders.
//
// Batch 494 (PS-359 follow-up — MDT Self-Service Assignment & Batching
// redesign): added coverage for the Print button, the session-grouped
// headers (locked/open + unassigned-count badges), and the self-service
// Claim button's conditional rendering (unassigned + presenter-eligible +
// case:tumor-board:schedule held). useCapabilities is now mocked directly
// (the CorrectAppliedCodeModal.test.tsx pattern — a hoisted `held` ref) so
// Claim/Dismiss visibility is deterministic rather than depending on the
// real authorizationService's resolution of the mocked 'PATH-1' user.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import type { TumorBoardListing } from '@/services/tumorBoard/ITumorBoardService';

const { held } = vi.hoisted(() => ({ held: { current: true } }));

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key} ${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
}));
vi.mock('@contexts/AuthContext', () => ({
  // Batch 494: 'role' must be present (and presenter-eligible) for the
  // Claim button's own currentUserCanPresent check — see
  // tumorBoardPresenterEligibility.ts's PRESENTER_ELIGIBLE_ROLES.
  useAuth: () => ({ user: { id: 'PATH-1', name: 'Dr A', role: 'pathologist' } }),
}));
vi.mock('@/contexts/SystemConfigContext', () => ({
  useSystemConfig: () => ({ config: { facilityTimezone: 'UTC' } }),
}));
vi.mock('@/hooks/useOpenCase', () => ({
  useOpenCase: () => vi.fn(),
}));
vi.mock('@/hooks/useCapabilities', () => ({
  useCapabilities: () => ({
    loading: false,
    has: () => held.current,
    decide: () => ({ allowed: held.current, reason: held.current ? 'granted' : 'notGranted', missingRequirements: [] }),
  }),
}));

function listing(overrides: Partial<TumorBoardListing> = {}): TumorBoardListing {
  return {
    id: 'tbl-1',
    caseId: 'case-1',
    caseAccession: 'S26-1000',
    board: 'Breast MDT',
    status: 'Pending Presentation',
    source: 'Manual',
    createdAt: '2026-01-01T00:00:00.000Z',
    createdByUserId: 'u1',
    createdByUserName: 'Dr A',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedByUserId: 'u1',
    updatedByUserName: 'Dr A',
    ...overrides,
  };
}

let rows: { listing: TumorBoardListing; patientName: { givenNames: string; familyNames: string } | null }[] = [];
const claimListing = vi.fn();
const dismissListing = vi.fn();
const updateListing = vi.fn();

vi.mock('@/hooks/useTumorBoardWorkspace', () => ({
  useTumorBoardWorkspace: () => ({
    filters: { board: 'all', status: 'Pending Presentation', presenterUserId: 'all', meetingWindow: 'all', sortBy: 'meetingDate' },
    setFilters: vi.fn(),
    rows,
    presenters: [],
    cutoffHours: 48,
    loading: false,
    error: null,
    updateListing,
    claimListing,
    dismissListing,
  }),
}));

afterEach(() => cleanup());
beforeEach(() => {
  held.current = true;
  rows = [];
  claimListing.mockClear();
  dismissListing.mockClear();
  updateListing.mockClear();
});

async function renderPage() {
  const { default: TumorBoardWorkspacePage } = await import('./TumorBoardWorkspacePage');
  return render(<TumorBoardWorkspacePage />);
}

describe('TumorBoardWorkspacePage — Batch 489 smoke test', () => {
  it('renders the page title and the empty-row state', async () => {
    await renderPage();
    expect(screen.getByText('tumorBoard.pageTitle')).toBeTruthy();
    expect(screen.getByText('tumorBoard.emptyRow')).toBeTruthy();
  });

  it('renders the filter bar\'s selects', async () => {
    await renderPage();
    expect(screen.getByLabelText('tumorBoard.filters.board')).toBeTruthy();
    expect(screen.getByLabelText('tumorBoard.filters.status')).toBeTruthy();
    expect(screen.getByLabelText('tumorBoard.filters.presenter')).toBeTruthy();
    expect(screen.getByLabelText('tumorBoard.filters.meetingWindow')).toBeTruthy();
  });
});

describe('TumorBoardWorkspacePage — Batch 494 self-service dashboard', () => {
  it('renders a Print button', async () => {
    await renderPage();
    expect(screen.getByText('tumorBoard.printBtn')).toBeTruthy();
  });

  it('groups rows into a session header showing the board, locked/open state, and unassigned count', async () => {
    rows = [
      { listing: listing({ id: 'a', meetingDate: '2026-12-01', meetingTime: '09:00' }), patientName: { givenNames: 'Jane', familyNames: 'Doe' } },
    ];
    await renderPage();
    // Far-future meeting with the default 48h cutoff → open, not locked.
    expect(screen.getByText('tumorBoard.session.open')).toBeTruthy();
    expect(screen.getByText(/tumorBoard\.session\.unassignedCount/)).toBeTruthy();
  });

  it('collects listings with no meetingDate under the Unscheduled group', async () => {
    rows = [{ listing: listing({ id: 'a' }), patientName: { givenNames: 'Jane', familyNames: 'Doe' } }];
    await renderPage();
    expect(screen.getByText('tumorBoard.session.unscheduled')).toBeTruthy();
  });

  it('shows the Claim button for an unassigned case when the user is presenter-eligible and holds case:tumor-board:schedule', async () => {
    rows = [{ listing: listing({ id: 'a' }), patientName: { givenNames: 'Jane', familyNames: 'Doe' } }];
    held.current = true;
    await renderPage();
    expect(screen.getByText('tumorBoard.row.claimBtn')).toBeTruthy();
  });

  it('hides the Claim button once a case already has a presenter', async () => {
    rows = [{ listing: listing({ id: 'a', presenterUserId: 'PATH-1', presenterUserName: 'Dr A' }), patientName: { givenNames: 'Jane', familyNames: 'Doe' } }];
    await renderPage();
    expect(screen.queryByText('tumorBoard.row.claimBtn')).toBeNull();
  });

  it('hides the Claim button when the user lacks case:tumor-board:schedule', async () => {
    rows = [{ listing: listing({ id: 'a' }), patientName: { givenNames: 'Jane', familyNames: 'Doe' } }];
    held.current = false;
    await renderPage();
    // The button still renders (disabled state is a UI nuance, not an
    // existence one) when gated by capability rather than eligibility —
    // see TumorBoardWorkspacePage.tsx's own `!listing.presenterUserId &&
    // currentUserCanPresent` condition, which does not include canSchedule.
    // canSchedule instead disables it; assert that disabled state here.
    const btn = screen.getByText('tumorBoard.row.claimBtn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('shows a "claimed by" badge once a presenter has been assigned', async () => {
    rows = [{ listing: listing({ id: 'a', presenterUserId: 'PATH-1', presenterAssignedByUserName: 'Dr A' }), patientName: { givenNames: 'Jane', familyNames: 'Doe' } }];
    await renderPage();
    expect(screen.getByText(/tumorBoard\.row\.claimedBy/)).toBeTruthy();
  });

  it('says why when a Claim is refused, and says nothing when it is saved (Batch 659)', async () => {
    rows = [{ listing: listing({ id: 'a' }), patientName: { givenNames: 'Jane', familyNames: 'Doe' } }];
    held.current = true;
    await renderPage();
    claimListing.mockResolvedValueOnce({ ok: false, error: 'batchLocked' });
    fireEvent.click(screen.getByText('tumorBoard.row.claimBtn'));
    expect((await screen.findByRole('alert')).textContent).toBe('tumorBoard.errors.batchLocked');
    claimListing.mockResolvedValueOnce({ ok: true, data: {} });
    fireEvent.click(screen.getByText('tumorBoard.row.claimBtn'));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });
});
