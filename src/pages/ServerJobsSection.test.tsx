// @vitest-environment happy-dom
// Batch 551 (PS-539 phase 2d): System Logs → Server jobs.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k), i18n: { language: 'en' } }) }));
vi.mock('@/services', () => ({ serverJobsService: {} }));
vi.mock('@/services/patientHistory/runHistoryRefreshSweep', () => ({ runHistoryRefreshSweep: vi.fn() }));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) => <button type="button" disabled={disabled} onClick={onClick}>{children}</button>,
}));

import { ServerJobsSection } from './ServerJobsSection';
import type { IServerJobsService } from '@/services/serverJobs/serverJobsService';
import type { DeadLetteredJob } from '@/services/serverJobs/serverJobsContract';

const dead = (over: Partial<DeadLetteredJob>): DeadLetteredJob => ({
  jobId: 'j', kind: 'charge.dispatch', attempts: 8, maxAttempts: 8, enqueuedAt: '2026-10-13T09:00:00Z', deadLetteredAt: '2026-10-13T10:00:00Z',
  lastError: { code: 'BILLING_REJECTED', message: 'The billing system refused the charge.' }, correlationId: 'c', ...over,
});
function fake(viaServer: boolean, jobs: DeadLetteredJob[] = []): IServerJobsService {
  let list = [...jobs];
  return {
    viaServer,
    health: vi.fn(async () => ({ ok: true as const, data: { generatedAt: '2026-10-13T12:00:00Z', kinds: [
      { kind: 'charge.dispatch' as const, ready: 2, oldestReadyOverdueSeconds: 600, running: 1, deadLetters24h: 1 },
      { kind: 'future.kind', ready: 0, oldestReadyOverdueSeconds: 0, running: 0, deadLetters24h: 0 },
    ], recurring: [{ name: 'bus.purge' as const }, { name: 'consult.expireLinks' as const, lastRunAt: '2026-10-13T11:58:00Z' }] } })),
    deadLetters: vi.fn(async () => ({ ok: true as const, data: list })),
    // A requeued job leaves the dead-letter list, as on the server.
    requeue: vi.fn(async (job: { jobId: string }) => { list = list.filter(j => j.jobId !== job.jobId); return { ok: true as const, data: { jobId: job.jobId, requeuedAt: 'now' } }; }),
  };
}
afterEach(() => cleanup());

describe('ServerJobsSection (Batch 551)', () => {
  it('the demo explains that the browser does this work itself', () => {
    render(<ServerJobsSection service={fake(false)} />);
    expect(screen.getByText('serverJobs.demoNote')).toBeTruthy();
  });

  it('shows the kinds (flagging one that needs attention), the recurring jobs (never run = overdue) and the dead letters', async () => {
    const { container } = render(<ServerJobsSection service={fake(true, [dead({ jobId: 'j1', caseId: 'S26-0001' })])} />);
    expect(await screen.findByText('serverJobs.minutes:{"count":10}')).toBeTruthy();
    expect(container.querySelectorAll('.ps-serverjobs-row--attention').length).toBe(2);
    // Judged against the server's time: the 5-minute job ran 2 minutes before it, so it is on time.
    expect(screen.getAllByText('serverJobs.state.overdue')).toHaveLength(1);
    expect(screen.getByText('serverJobs.state.ok')).toBeTruthy();
    // A kind this version doesn't know is shown as the server named it.
    expect(screen.getByText('future.kind')).toBeTruthy();
    expect(await screen.findByText('BILLING_REJECTED')).toBeTruthy();
    expect(screen.getByText('S26-0001').getAttribute('data-phi')).toBe('accession');
  });

  it('Requeue is one click and says so above the list (the job leaves it); an interface job opens Interfaces → Outbound, a print job the Print Queue', async () => {
    const service = fake(true, [dead({ jobId: 'j1' }), dead({ jobId: 'j2', kind: 'interface.dispatch' }), dead({ jobId: 'j3', kind: 'print.dispatch' }), dead({ jobId: 'j4', kind: 'future.kind' })]);
    const onOpenInterfaces = vi.fn();
    render(<ServerJobsSection service={service} onOpenInterfaces={onOpenInterfaces} />);
    fireEvent.click(await screen.findByText('serverJobs.requeue'));
    await waitFor(() => expect(service.requeue).toHaveBeenCalledWith(expect.objectContaining({ jobId: 'j1' })));
    expect(await screen.findByText('serverJobs.requeued')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('serverJobs.requeue')).toBeNull());
    fireEvent.click(screen.getByText('serverJobs.openIn.outboundInterfaces'));
    expect(onOpenInterfaces).toHaveBeenCalledWith('outbound_dlq');
    fireEvent.click(screen.getByText('serverJobs.openIn.printQueue'));
    expect(onOpenInterfaces).toHaveBeenCalledWith('print_queue');
  });

  it('filtering by kind asks the server for that kind', async () => {
    const service = fake(true, []);
    render(<ServerJobsSection service={service} />);
    fireEvent.change(await screen.findByLabelText('serverJobs.filterKind'), { target: { value: 'export.build' } });
    await waitFor(() => expect(service.deadLetters).toHaveBeenCalledWith('export.build'));
  });
});
