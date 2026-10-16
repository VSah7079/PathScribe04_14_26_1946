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
vi.mock('@/hooks/useMarginExceptionReview', () => ({
  useMarginExceptionReview: () => ({
    rows: mockRows,
    loading: false,
    error: null,
    resolve: vi.fn(),
    dismiss: vi.fn(),
    busyId: null,
  }),
}));

afterEach(() => { cleanup(); mockRows.length = 0; });

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
});
