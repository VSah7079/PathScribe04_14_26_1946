// @vitest-environment happy-dom
// Batch 620 (part C, PS-800): the UK Cancer Registry screen: enterprise and facility settings, saving, removing, and the check panel.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const svc = vi.hoisted(() => ({
  cosdDestinationService: {
    getAll: vi.fn(),
    set: vi.fn(async () => ({ ok: true, data: {} })),
    remove: vi.fn(async () => ({ ok: true, data: undefined })),
  },
  facilityService: { getAll: vi.fn(async () => ({ ok: true, data: [{ id: 'fac-a', name: 'Westside', status: 'Active' }] })) },
}));
vi.mock('@/services', () => svc);
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, disabled, capability }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; capability: string }) =>
    <button data-capability={capability} disabled={disabled} onClick={onClick}>{children}</button>,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}${JSON.stringify(o)}` : k), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
import CosdDestinationSection from './CosdDestinationSection';

const S = 'cosdDestinationSection';
const stored = (facilityId: string | null, over = {}) => ({ id: `d-${facilityId}`, facilityId, transport: 'sftp', correctionWorkingDays: 7, nonWorkingDates: ['2026-12-25'], updatedAt: '', ...over });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('CosdDestinationSection', () => {
  it('shows the built-in default when nothing is stored', async () => {
    svc.cosdDestinationService.getAll.mockResolvedValue({ ok: true, data: [] });
    render(<CosdDestinationSection />);
    await screen.findByText(`${S}.title`);
    expect(screen.getByText(`${S}.transports.restMtls`)).toBeTruthy();
    expect(screen.getByText(`${S}.source.default`)).toBeTruthy();
    expect(document.body.textContent).toContain(`${S}.summary.days{"count":5}`);
  });
  it('shows the enterprise settings, and a facility follows them until it has its own', async () => {
    svc.cosdDestinationService.getAll.mockResolvedValue({ ok: true, data: [stored(null)] });
    render(<CosdDestinationSection />);
    await screen.findByText(`${S}.title`);
    expect(screen.getByText(`${S}.source.enterprise`)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(`${S}.scope.label`), { target: { value: 'fac-a' } });
    expect(screen.getByText(`${S}.followsEnterprise`)).toBeTruthy();
    expect(screen.queryByText(`${S}.removeButton`)).toBeNull();
  });
  it('shows a facility\'s own settings and removes them', async () => {
    svc.cosdDestinationService.getAll.mockResolvedValue({ ok: true, data: [stored(null), stored('fac-a', { correctionWorkingDays: 3 })] });
    render(<CosdDestinationSection />);
    await screen.findByText(`${S}.title`);
    fireEvent.change(screen.getByLabelText(`${S}.scope.label`), { target: { value: 'fac-a' } });
    expect(document.body.textContent).toContain(`${S}.summary.days{"count":3}`);
    fireEvent.click(screen.getByText(`${S}.removeButton`));
    await waitFor(() => expect(svc.cosdDestinationService.remove).toHaveBeenCalledWith('fac-a'));
  });
  it('saves a facility\'s settings behind the capability', async () => {
    svc.cosdDestinationService.getAll.mockResolvedValue({ ok: true, data: [stored(null)] });
    render(<CosdDestinationSection />);
    await screen.findByText(`${S}.title`);
    fireEvent.change(screen.getByLabelText(`${S}.scope.label`), { target: { value: 'fac-a' } });
    const setUp = screen.getByText(`${S}.setUp`);
    expect(setUp.getAttribute('data-capability')).toBe('config:cosd-destination:manage');
    fireEvent.click(setUp);
    fireEvent.change(screen.getByLabelText(`${S}.editor.days`), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText(`${S}.editor.dates`), { target: { value: '2026-12-25, 2026-12-28' } });
    fireEvent.click(screen.getByText(`${S}.editor.save`));
    await waitFor(() => expect(svc.cosdDestinationService.set).toHaveBeenCalled());
    expect((svc.cosdDestinationService.set.mock.calls[0] as unknown[])[0]).toEqual({ facilityId: 'fac-a', transport: 'sftp', correctionWorkingDays: 4, nonWorkingDates: ['2026-12-25', '2026-12-28'] });
  });
  it('does not let a bad number be saved', async () => {
    svc.cosdDestinationService.getAll.mockResolvedValue({ ok: true, data: [] });
    render(<CosdDestinationSection />);
    await screen.findByText(`${S}.title`);
    fireEvent.click(screen.getByText(`${S}.setUp`));
    fireEvent.change(screen.getByLabelText(`${S}.editor.days`), { target: { value: '0' } });
    expect(screen.getByRole('alert').textContent).toBe(`${S}.editor.problems.daysInvalid`);
    expect((screen.getByText(`${S}.editor.save`) as HTMLButtonElement).disabled).toBe(true);
    expect(svc.cosdDestinationService.set).not.toHaveBeenCalled();
  });
  it('the check panel holds back a bad NHS number and shows the labelled preview, then gives a correction due date', async () => {
    svc.cosdDestinationService.getAll.mockResolvedValue({ ok: true, data: [] });
    render(<CosdDestinationSection />);
    await screen.findByText(`${S}.title`);
    fireEvent.change(screen.getByLabelText(`${S}.check.nhs`), { target: { value: '9434765918' } });
    fireEvent.change(screen.getByLabelText(`${S}.check.bornOn`), { target: { value: '1960-05-02' } });
    fireEvent.change(screen.getByLabelText(`${S}.check.diagnosisDate`), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText(`${S}.check.icdo`), { target: { value: '8500/3' } });
    fireEvent.change(screen.getByLabelText(`${S}.check.diagnosis`), { target: { value: 'Carcinoma' } });
    fireEvent.click(screen.getByText(`${S}.check.run`));
    expect(screen.getByText(`${S}.check.held`)).toBeTruthy();
    expect(screen.getByText(`${S}.check.findings.NHS_NUMBER_CHECK_DIGIT`)).toBeTruthy();
    expect(document.querySelector('.ps-cosd-preview')?.textContent).toContain('model="simplified"');
    expect(document.querySelector('.ps-cosd-preview')?.getAttribute('data-phi')).toBe('true');
    fireEvent.change(screen.getByLabelText(`${S}.correction.rejectedOn`), { target: { value: '2026-10-16' } });
    expect(document.body.textContent).toContain(`${S}.correction.dueOn`);
    expect(document.body.textContent).toContain('"days":5');
  });
});
