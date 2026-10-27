// @vitest-environment happy-dom
// Batch 620 part S (PS-800): the Registry Batch Files screen: profiles, turning one on, the live counts, making a file now, the editor.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { seedProfiles } from '@/services/batchRegistryFeed/batchRegistryFeed';

const svc = vi.hoisted(() => ({
  batchRegistryFeedService: {
    getProfiles: vi.fn(),
    getRuns: vi.fn(async () => ({ ok: true, data: [] })),
    saveProfile: vi.fn(async () => ({ ok: true, data: {} })),
    removeProfile: vi.fn(async () => ({ ok: true, data: undefined })),
    preview: vi.fn(async () => ({ ok: true, data: { waiting: 3, dueNow: 2, wouldBeHeldBack: 1, overdue: 0, nextDueAt: null, scheduleIsBatch: false } })),
    buildRun: vi.fn(),
  },
}));
const download = vi.hoisted(() => vi.fn());
vi.mock('@/services', () => svc);
vi.mock('../../../utils/downloadText', () => ({ downloadText: download }));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, disabled, capability }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; capability: string }) =>
    <button data-capability={capability} disabled={disabled} onClick={onClick}>{children}</button>,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}${JSON.stringify(o)}` : k), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
import BatchRegistryFeedSection from './BatchRegistryFeedSection';

const S = 'batchRegistryFeedSection';
const profiles = (on = false) => seedProfiles('').map(p => (p.id === 'batch-profile-example' ? { ...p, enabled: on } : p));
const card = (id: string) => document.querySelector(`[data-profile="${id}"]`) as HTMLElement;
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('BatchRegistryFeedSection', () => {
  it('lists the example, labelled, and NAACCR XML marked as later with its buttons off', async () => {
    svc.batchRegistryFeedService.getProfiles.mockResolvedValue({ ok: true, data: profiles() });
    render(<BatchRegistryFeedSection />);
    await screen.findByText(`${S}.title`);
    expect(card('batch-profile-example').textContent).toContain(`${S}.badges.example`);
    expect(card('batch-profile-naaccr-xml').textContent).toContain(`${S}.badges.later`);
    const buttons = Array.from(card('batch-profile-naaccr-xml').querySelectorAll('button')) as HTMLButtonElement[];
    expect(buttons.every(b => b.disabled)).toBe(true);
    expect(card('batch-profile-example').textContent).not.toContain(`${S}.removeButton`);
  });
  it('turning a profile on saves it enabled, behind the manage capability', async () => {
    svc.batchRegistryFeedService.getProfiles.mockResolvedValue({ ok: true, data: profiles() });
    render(<BatchRegistryFeedSection />);
    await screen.findByText(`${S}.title`);
    const on = screen.getAllByText(`${S}.turnOn`)[0] as HTMLButtonElement;
    expect(on.getAttribute('data-capability')).toBe('config:batch-registry-feed:manage');
    fireEvent.click(on);
    await waitFor(() => expect(svc.batchRegistryFeedService.saveProfile).toHaveBeenCalled());
    expect((svc.batchRegistryFeedService.saveProfile.mock.calls[0] as unknown as [{ enabled: boolean }])[0].enabled).toBe(true);
    expect(await screen.findByRole('status')).toBeTruthy();
  });
  it('an enabled profile can be checked, and says so when its schedule is not a batch one', async () => {
    svc.batchRegistryFeedService.getProfiles.mockResolvedValue({ ok: true, data: profiles(true) });
    render(<BatchRegistryFeedSection />);
    await screen.findByText(`${S}.title`);
    fireEvent.click(screen.getByText(`${S}.check`));
    await screen.findByTestId('brf-counts');
    expect(screen.getByTestId('brf-counts').textContent).toContain(`${S}.counts.notBatch`);
    expect(screen.getByTestId('brf-counts').textContent).toContain(`${S}.counts.dueNow{"count":2}`);
  });
  it('make the file now downloads it behind registry:batch-file:generate, and says when nothing is waiting', async () => {
    svc.batchRegistryFeedService.getProfiles.mockResolvedValue({ ok: true, data: profiles(true) });
    svc.batchRegistryFeedService.buildRun
      .mockResolvedValueOnce({ ok: true, data: { run: { fileName: 'A.csv', format: 'csv' }, content: 'x' } })
      .mockResolvedValueOnce({ ok: false, error: 'NO_RECORDS' });
    render(<BatchRegistryFeedSection />);
    await screen.findByText(`${S}.title`);
    const now = screen.getByText(`${S}.buildNow`);
    expect(now.getAttribute('data-capability')).toBe('registry:batch-file:generate');
    fireEvent.click(now);
    await waitFor(() => expect(download).toHaveBeenCalledWith('A.csv', 'x', 'text/csv;charset=utf-8'));
    expect(await screen.findByText(`${S}.status.built`)).toBeTruthy();
    fireEvent.click(screen.getByText(`${S}.buildNow`));
    expect(await screen.findByText(`${S}.status.nothingToSend`)).toBeTruthy();
    expect(download).toHaveBeenCalledTimes(1);
  });
  it('the editor shows the layout preview, reports problems, and saves a good draft', async () => {
    svc.batchRegistryFeedService.getProfiles.mockResolvedValue({ ok: true, data: profiles() });
    render(<BatchRegistryFeedSection />);
    await screen.findByText(`${S}.title`);
    fireEvent.click(screen.getByText(`${S}.addProgram`));
    expect(screen.getByTestId('brf-preview').textContent).toContain('EXAMPLE-0001');
    expect(screen.getByText(`${S}.problems.nameRequired`)).toBeTruthy();
    fireEvent.change(document.getElementById('brf-name') as HTMLInputElement, { target: { value: 'Mine' } });
    expect(screen.queryByText(`${S}.problems.nameRequired`)).toBeNull();
  });
});
