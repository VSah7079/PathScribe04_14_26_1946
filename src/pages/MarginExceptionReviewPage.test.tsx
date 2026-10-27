// @vitest-environment happy-dom
//
// src/pages/MarginExceptionReviewPage.test.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 491 — a light smoke test, same shape as TumorBoardWorkspacePage.test.tsx:
// the page renders its title and the empty-row state when the hook returns no
// rows, without throwing, and renders a row's resolve/dismiss controls when
// the hook returns one. The hook's own loading/resolve/dismiss orchestration
// is covered directly; this just proves the page wires the hook up.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'PATH-1', name: 'Dr A' } }),
}));
vi.mock('@/hooks/useOpenCase', () => ({
  useOpenCase: () => vi.fn(),
}));

const mockRows: any[] = [];
const mockDecided: any[] = [];
const mockNotices: any[] = [];
vi.mock('@/hooks/useMarginExceptionReview', () => ({
  useMarginExceptionReview: () => ({
    rows: mockRows,
    decidedRows: mockDecided,
    notices: mockNotices,
    loading: false,
    error: null,
    resolve: vi.fn(),
    dismiss: vi.fn(),
    busyId: null,
  }),
}));

afterEach(() => { cleanup(); mockRows.length = 0; mockDecided.length = 0; mockNotices.length = 0; });

async function renderPage() {
  const { default: MarginExceptionReviewPage } = await import('./MarginExceptionReviewPage');
  return render(<MarginExceptionReviewPage />);
}

describe('MarginExceptionReviewPage — Batch 491 smoke test', () => {
  it('renders the page title and the empty-row state when there are no pending exceptions', async () => {
    await renderPage();
    expect(screen.getByText('marginExceptionReview.pageTitle')).toBeTruthy();
    expect(screen.getByText('marginExceptionReview.emptyRow')).toBeTruthy();
  });

  it('renders a pending exception row with its resolve input and dismiss/open-case actions', async () => {
    mockRows.push({
      exception: { id: 'mex-1', caseId: 'C1', instanceId: 'I1', fieldId: 'distance_to_crm_mm', fieldLabel: 'Distance to CRM', rawText: 'close, not sure', reason: 'surroundingText', status: 'Pending', createdAt: '2026-10-01T00:00:00Z' },
      caseAccession: 'S26-0001',
      patientName: { givenNames: 'Jane', familyNames: 'Doe' },
    });
    await renderPage();
    expect(screen.getByLabelText('marginExceptionReview.valueMmLabel')).toBeTruthy();
    expect(screen.getByText('marginExceptionReview.resolveBtn')).toBeTruthy();
    expect(screen.getByText('marginExceptionReview.dismissBtn')).toBeTruthy();
    expect(screen.getByText('marginExceptionReview.openCaseBtn')).toBeTruthy();
  });

  it('Batch 669: lists resolved and dismissed items read-only, and shows the rule-check notice', async () => {
    mockDecided.push(
      { exception: { id: 'mex-2', caseId: 'C2', fieldLabel: 'Distance to CRM', rawText: 'about two', status: 'Resolved', resolvedValueMm: 2, resolvedByUserName: 'Dr A', resolvedAt: '2026-10-02T10:00:00Z' }, caseAccession: 'S26-0002', patientName: null },
      { exception: { id: 'mex-3', caseId: 'C3', fieldLabel: 'Distance to CRM', rawText: 'n/a', status: 'Dismissed', dismissReason: 'not assessable', resolvedByUserName: 'Dr B', resolvedAt: '2026-10-03T10:00:00Z' }, caseAccession: 'S26-0003', patientName: null },
    );
    mockNotices.push({ kind: 'info', key: 'marginExceptionReview.notice.notFlagged' });
    await renderPage();
    expect(screen.getByText('marginExceptionReview.history.title')).toBeTruthy();
    expect(screen.getByText('S26-0002')).toBeTruthy();
    expect(screen.getByText('S26-0003')).toBeTruthy();
    expect(screen.getByText('marginExceptionReview.history.resolved')).toBeTruthy();
    expect(screen.getByText('marginExceptionReview.history.dismissed')).toBeTruthy();
    expect(screen.getByText('marginExceptionReview.notice.notFlagged')).toBeTruthy();
    // history rows carry no Resolve / Dismiss controls
    expect(screen.queryByText('marginExceptionReview.resolveBtn')).toBeNull();
  });
});
