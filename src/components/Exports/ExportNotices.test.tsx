// @vitest-environment happy-dom
// Batch 550 (PS-539 phase 2d, D7): the export notices.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k) }) }));
vi.mock('@/services', () => ({ exportService: {} }));

import { ExportNotices } from './ExportNotices';
import type { ExportNotice, ExportTracker } from '@/services/exports/exportTracker';

function fakeTracker(notices: ExportNotice[], simulated = false): ExportTracker {
  return {
    viaServer: true, simulated, simulation: null, run: vi.fn(), download: vi.fn(async () => ({ ok: true as const })), cancel: vi.fn(), list: vi.fn(),
    dismiss: vi.fn(), reset: vi.fn(), subscribe: () => () => {}, getSnapshot: () => notices,
  };
}
const renderAt = (tracker: ExportTracker) => render(
  <MemoryRouter initialEntries={['/search']}>
    <ExportNotices tracker={tracker} />
    <Routes><Route path="/search" element={<div>search</div>} /><Route path="/my-exports" element={<div>my exports page</div>} /></Routes>
  </MemoryRouter>,
);
afterEach(() => cleanup());

describe('ExportNotices, simulated export server (Batch 611, #194)', () => {
  it('marks a notice Simulated when the export server is the simulated one', () => {
    renderAt(fakeTracker([{ exportId: 'x1', title: 'audit-log', state: 'preparing' }], true));
    expect(screen.getByText('exports.notice.simulatedBadge')).toBeTruthy();
  });
  it('shows no Simulated mark with the real API server', () => {
    renderAt(fakeTracker([{ exportId: 'x1', title: 'audit-log', state: 'preparing' }], false));
    expect(screen.queryByText('exports.notice.simulatedBadge')).toBeNull();
  });
});

describe('ExportNotices (Batch 550)', () => {
  it('shows nothing when there are no notices (a quick export, or the demo)', () => {
    const { container } = renderAt(fakeTracker([]));
    expect(container.querySelector('.ps-export-notices')).toBeNull();
  });

  it('preparing: the title (tagged for redaction), the message, My exports and Dismiss, but no Download', () => {
    const tracker = fakeTracker([{ exportId: 'x1', title: 'audit-log', state: 'preparing' }]);
    renderAt(tracker);
    expect(screen.getByText('audit-log').getAttribute('data-phi')).toBe('accession');
    expect(screen.getByText('exports.notice.preparing')).toBeTruthy();
    expect(screen.queryByText('exports.notice.download')).toBeNull();
    fireEvent.click(screen.getByText('exports.notice.myExports'));
    expect(screen.getByText('my exports page')).toBeTruthy();
    fireEvent.click(screen.getByText('exports.notice.dismiss'));
    expect(tracker.dismiss).toHaveBeenCalledWith('x1');
  });

  it('ready: Download downloads it', () => {
    const tracker = fakeTracker([{ exportId: 'x1', title: 'audit-log', state: 'ready', rowCount: 250000 }]);
    renderAt(tracker);
    expect(screen.getByText('exports.notice.readyRows:{"count":250000}')).toBeTruthy();
    fireEvent.click(screen.getByText('exports.notice.download'));
    expect(tracker.download).toHaveBeenCalledWith('x1');
  });

  it('failed: says why, as an alert', () => {
    renderAt(fakeTracker([{ exportId: 'x1', title: 'audit-log', state: 'failed', problem: 'NOT_PERMITTED' }]));
    expect(screen.getByRole('alert').textContent).toContain('exports.problem.NOT_PERMITTED');
  });
});
