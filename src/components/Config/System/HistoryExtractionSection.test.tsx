// @vitest-environment happy-dom
// Batch 621: the AI history extraction screen: off by default, enterprise and facility settings, accuracy counts.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const svc = vi.hoisted(() => ({
  historyExtractionSettingsService: {
    getAll: vi.fn(),
    set: vi.fn(async () => ({ ok: true, data: {} })),
    remove: vi.fn(async () => ({ ok: true, data: undefined })),
  },
  historyExtractionService: { getAccuracy: vi.fn(async () => ({ ok: true, data: { extractions: 4, fieldsExtracted: 11, flagged: 2 } })) },
  facilityService: { getAll: vi.fn(async () => ({ ok: true, data: [{ id: 'fac-a', name: 'Westside', status: 'Active' }] })) },
}));
vi.mock('@/services', () => svc);
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, capability }: { children: React.ReactNode; onClick: () => void; capability: string }) =>
    <button data-capability={capability} onClick={onClick}>{children}</button>,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}${JSON.stringify(o)}` : k), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
import HistoryExtractionSection from './HistoryExtractionSection';

const S = 'historyExtractionSection';
const stored = (facilityId: string | null, enabled: boolean) => ({ id: `s-${facilityId}`, facilityId, enabled, updatedAt: '' });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('HistoryExtractionSection', () => {
  it('is off by default and says it is advisory only', async () => {
    svc.historyExtractionSettingsService.getAll.mockResolvedValue({ ok: true, data: [] });
    render(<HistoryExtractionSection />);
    await screen.findByText(`${S}.title`);
    expect(screen.getByText(`${S}.state.off`)).toBeTruthy();
    expect(screen.getByText(`${S}.source.default`)).toBeTruthy();
    expect(screen.getByText(`${S}.advisory`)).toBeTruthy();
  });
  it('turns it on for the enterprise, behind the manage capability', async () => {
    svc.historyExtractionSettingsService.getAll.mockResolvedValue({ ok: true, data: [] });
    render(<HistoryExtractionSection />);
    await screen.findByText(`${S}.title`);
    const on = screen.getByText(`${S}.turnOn`);
    expect(on.getAttribute('data-capability')).toBe('config:history-extraction:manage');
    fireEvent.click(on);
    await waitFor(() => expect(svc.historyExtractionSettingsService.set).toHaveBeenCalledWith({ facilityId: null, enabled: true }));
  });
  it('a facility follows the enterprise until it has its own, and can set its own', async () => {
    svc.historyExtractionSettingsService.getAll.mockResolvedValue({ ok: true, data: [stored(null, true)] });
    render(<HistoryExtractionSection />);
    await screen.findByText(`${S}.title`);
    expect(screen.getByText(`${S}.state.on`)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(`${S}.scope.label`), { target: { value: 'fac-a' } });
    expect(screen.getByText(`${S}.followsEnterprise`)).toBeTruthy();
    expect(screen.queryByText(`${S}.removeButton`)).toBeNull();
    fireEvent.click(screen.getByText(`${S}.turnOff`));
    await waitFor(() => expect(svc.historyExtractionSettingsService.set).toHaveBeenCalledWith({ facilityId: 'fac-a', enabled: false }));
  });
  it('shows a facility\'s own setting and removes it', async () => {
    svc.historyExtractionSettingsService.getAll.mockResolvedValue({ ok: true, data: [stored(null, true), stored('fac-a', false)] });
    render(<HistoryExtractionSection />);
    await screen.findByText(`${S}.title`);
    fireEvent.change(screen.getByLabelText(`${S}.scope.label`), { target: { value: 'fac-a' } });
    expect(screen.getByText(`${S}.state.off`)).toBeTruthy();
    expect(screen.getByText(`${S}.source.facility`)).toBeTruthy();
    fireEvent.click(screen.getByText(`${S}.removeButton`));
    await waitFor(() => expect(svc.historyExtractionSettingsService.remove).toHaveBeenCalledWith('fac-a'));
  });
  it('shows a refusal, and the accuracy counts', async () => {
    svc.historyExtractionSettingsService.getAll.mockResolvedValue({ ok: true, data: [] });
    svc.historyExtractionSettingsService.set.mockResolvedValueOnce({ ok: false, error: 'CONFIG_NOT_PERMITTED' } as never);
    render(<HistoryExtractionSection />);
    await screen.findByText(`${S}.title`);
    expect(screen.getByTestId('hx-accuracy').textContent).toContain('{"extractions":4,"fields":11,"flagged":2}');
    fireEvent.click(screen.getByText(`${S}.turnOn`));
    await screen.findByText(`${S}.refused`);
  });
});
