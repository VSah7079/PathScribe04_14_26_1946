// @vitest-environment happy-dom
//
// src/pages/BenchContributionDashboardPage.test.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 488 — a light smoke test: the page renders its title and each
// section's real empty state when the three services return nothing for
// this user, without throwing. The real metric math itself is covered
// directly in benchContributionCalculations.test.ts; this just proves
// the page wires those functions up and renders.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts && 'count' in opts ? `${key} (${(opts as { count: number }).count})` : key) }),
}));
vi.mock('@contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'HT-1', name: 'Test, Tech' } }),
}));
vi.mock('@/contexts/SystemConfigContext', () => ({
  useSystemConfig: () => ({ config: { facilityTimezone: 'UTC' } }),
}));
vi.mock('@/services', () => ({
  caseService: { getAll: () => Promise.resolve({ ok: true, data: [] }) },
  batchService: { getAll: () => Promise.resolve({ ok: true, data: [] }) },
  molecularBatchService: { getAll: () => Promise.resolve({ ok: true, data: [] }) },
}));

afterEach(() => cleanup());

async function renderPage() {
  const { default: BenchContributionDashboardPage } = await import('./BenchContributionDashboardPage');
  return render(<BenchContributionDashboardPage />);
}

describe('BenchContributionDashboardPage — Batch 488 smoke test', () => {
  it('renders the page title', async () => {
    await renderPage();
    expect(screen.getByText('benchContributions.title')).toBeTruthy();
  });

  it('shows each section\'s real empty state once data loads with no activity', async () => {
    await renderPage();
    await waitFor(() => {
      expect(screen.getByText('benchContributions.accessioning.noActivity')).toBeTruthy();
    });
    expect(screen.getByText('benchContributions.throughput.noActivity')).toBeTruthy();
    expect(screen.getByText('benchContributions.queueAging.noOpenBatches')).toBeTruthy();
    expect(screen.getByText('benchContributions.stageTat.noSamples')).toBeTruthy();
    expect(screen.getByText('benchContributions.molecularQc.noActivity')).toBeTruthy();
  });
});
