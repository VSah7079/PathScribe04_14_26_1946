// @vitest-environment happy-dom
// src/pages/ContributionDashboardPage.teachingTile.test.tsx
// Batch 568 (WCAG 4.1.2, axe nested-interactive): the teaching tile holds a button (Export), so it isn't a button
// itself. Its title is the button that opens the teaching log; clicking elsewhere on the tile still does; Export
// does only its own job. (The demo's superadmin has no teaching records, so the browser check can't reach it.)
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

import { TeachingCasesTile } from './ContributionDashboardPage';

afterEach(cleanup);
function tile() {
  const onOpen = vi.fn();
  const onExport = vi.fn((e: { stopPropagation: () => void }) => e.stopPropagation());
  render(<TeachingCasesTile teachingRecords={[]} countersignRecords={[]} subspecialties={[]} onOpen={onOpen} onExport={onExport as any} />);
  return { onOpen, onExport };
}

describe('TeachingCasesTile (Batch 568)', () => {
  it('the title is a button that opens the log once; the tile has no role or tab stop', () => {
    const { onOpen } = tile();
    const title = screen.getByRole('button', { name: 'contributionDashboard.teaching.title' });
    const el = title.closest('.ps-contrib-tile') as HTMLElement;
    expect(el.getAttribute('role')).toBeNull();
    expect(el.getAttribute('tabindex')).toBeNull();
    fireEvent.click(title);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
  it('clicking elsewhere on the tile still opens it; Export does only its own job', () => {
    const { onOpen, onExport } = tile();
    fireEvent.click(screen.getByText('contributionDashboard.teaching.subtitle'));
    expect(onOpen).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'contributionDashboard.teaching.exportButton' }));
    expect(onExport).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
