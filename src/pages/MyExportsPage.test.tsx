// @vitest-environment happy-dom
// Batch 550 (PS-539 phase 2d, D7): My exports.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }) }));
vi.mock('@/services', () => ({ exportService: {} }));

import MyExportsPage from './MyExportsPage';
import type { ExportTracker } from '@/services/exports/exportTracker';
import type { ExportJob } from '@/services/exports/asyncExportContract';

const job = (over: Partial<ExportJob>): ExportJob => ({
  exportId: 'x', kind: 'audit.audit-log', format: 'csv', title: 'audit-log', status: 'ready',
  requestedBy: { userId: 'u1', userName: 'Dr A' }, requestedAt: '2026-10-13T10:00:00Z', ...over,
});
function fakeTracker(viaServer: boolean, jobs: ExportJob[], simulation: ExportTracker['simulation'] = null): ExportTracker {
  return {
    viaServer, simulated: simulation !== null, simulation, run: vi.fn(), dismiss: vi.fn(), reset: vi.fn(), subscribe: () => () => {}, getSnapshot: () => [],
    list: vi.fn(async () => ({ ok: true as const, data: jobs })),
    download: vi.fn(async () => ({ ok: false as const, problem: 'NOT_PERMITTED' as const })),
    cancel: vi.fn(async () => ({ ok: true as const })),
  };
}
afterEach(() => cleanup());

describe('MyExportsPage, simulated export server (Batch 611, #194)', () => {
  it('labels the export server Simulated and lets the long-export switch be turned on', () => {
    let on = false;
    const simulation = { longBuilds: () => on, setLongBuilds: (v: boolean) => { on = v; } };
    render(<MyExportsPage tracker={fakeTracker(true, [], simulation)} />);
    expect(screen.getByText('myExports.simulatedBadge')).toBeTruthy();
    expect(screen.getByText('myExports.simulatedNote')).toBeTruthy();
    const toggle = screen.getByRole('checkbox') as HTMLInputElement;
    expect(toggle.checked).toBe(false);
    fireEvent.click(toggle);
    expect(on).toBe(true);
    expect(toggle.checked).toBe(true);
  });

  it('shows no Simulated label with the real API server', () => {
    render(<MyExportsPage tracker={fakeTracker(true, [])} />);
    expect(screen.queryByText('myExports.simulatedBadge')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});

describe('MyExportsPage (Batch 550)', () => {
  it('the demo explains that exports download straight away', () => {
    render(<MyExportsPage tracker={fakeTracker(false, [])} />);
    expect(screen.getByText('myExports.demoNote')).toBeTruthy();
  });

  it('lists the requester\'s exports: Download for a ready one, Cancel for one being prepared, and a refusal is shown on its row', async () => {
    const tracker = fakeTracker(true, [
      job({ exportId: 'a', title: 'audit-log', status: 'ready', rowCount: 1200, expiresAt: '2026-10-20T10:00:00Z' }),
      job({ exportId: 'b', title: 'case-search', status: 'running' }),
      job({ exportId: 'c', title: 'billing-log', status: 'failed', error: { code: 'TIMED_OUT', message: '' } }),
    ]);
    render(<MyExportsPage tracker={tracker} />);
    expect(await screen.findByText('audit-log')).toBeTruthy();
    expect(screen.getByText('audit-log').getAttribute('data-phi')).toBe('accession');
    expect(screen.getByText('exports.problem.TIMED_OUT')).toBeTruthy();
    fireEvent.click(screen.getByText('myExports.cancel'));
    await waitFor(() => expect(tracker.cancel).toHaveBeenCalledWith('b'));
    fireEvent.click(screen.getByText('myExports.download'));
    await waitFor(() => expect(tracker.download).toHaveBeenCalledWith('a'));
    expect(await screen.findByText('exports.problem.NOT_PERMITTED')).toBeTruthy();
  });

  it('an empty list says so', async () => {
    render(<MyExportsPage tracker={fakeTracker(true, [])} />);
    expect(await screen.findByText('myExports.empty')).toBeTruthy();
  });
});
