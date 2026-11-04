// @vitest-environment happy-dom
// Batch 611 (#189): the Smart Capture drawer in the billing review.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const svc = vi.hoisted(() => ({
  s: { suggest: vi.fn(), review: vi.fn(), approve: vi.fn(), exportLines: vi.fn(), restart: vi.fn(), preview: vi.fn() },
  settings: { getSettings: vi.fn() },
}));
vi.mock('@/services', () => ({ smartCaptureService: svc.s, smartCaptureSettingsService: svc.settings }));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) => <button disabled={disabled} onClick={onClick}>{children}</button>,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k) }) }));

import SmartCaptureLauncher from './SmartCaptureLauncher';
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const line = { key: 'sp1:SC-LEVEL:1', specimenId: 'sp1', specimenLabel: 'A', cpt: '88309', units: 1, ruleId: 'SC-LEVEL', ruleVersion: 'v1', evidence: [{ kind: 'keyword', value: 'colectomy' }], state: 'suggested' };
const view = (state: string, lines = [line]) => ({ ok: true, data: { record: { caseId: 'C1', ruleVersion: 'v1', lines, exportSimulated: true }, state, stale: false, cptOff: false } });

describe('SmartCaptureLauncher', () => {
  it('shows nothing when the administrator has switched the prototype off', async () => {
    svc.settings.getSettings.mockResolvedValue({ ok: true, data: { prototypeEnabled: false } });
    render(<SmartCaptureLauncher caseId="C1" />);
    await waitFor(() => expect(svc.settings.getSettings).toHaveBeenCalled());
    expect(screen.queryByTestId('smart-capture')).toBeNull();
  });

  it('opens with the Prototype label, lists the line with its evidence and previews the payload', async () => {
    svc.settings.getSettings.mockResolvedValue({ ok: true, data: { prototypeEnabled: true } });
    svc.s.suggest.mockResolvedValue(view('suggested'));
    svc.s.preview.mockResolvedValue({ ok: true, data: { schema: 'smart-capture-charges', prototype: true } });
    render(<SmartCaptureLauncher caseId="C1" />);
    await waitFor(() => expect(screen.getByTestId('smart-capture-badge').textContent).toBe('smartCapture.prototypeLabel'));
    fireEvent.click(screen.getByTestId('smart-capture-open'));
    await waitFor(() => expect(screen.getByTestId('smart-capture-line-sp1:SC-LEVEL:1')).toBeTruthy());
    expect(screen.getByText(/smartCapture.evidence.keyword/)).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('smart-capture-payload').textContent).toContain('smart-capture-charges'));
  });

  it('accepts a line, approves with the confirmation, and exports', async () => {
    svc.settings.getSettings.mockResolvedValue({ ok: true, data: { prototypeEnabled: true } });
    svc.s.suggest.mockResolvedValue(view('suggested'));
    svc.s.preview.mockResolvedValue({ ok: false, error: 'NOT_FOUND' });
    svc.s.review.mockResolvedValue(view('reviewed', [{ ...line, state: 'reviewed', decision: 'accepted' } as never]));
    svc.s.approve.mockResolvedValue(view('approved', [{ ...line, state: 'approved', decision: 'accepted' } as never]));
    svc.s.exportLines.mockResolvedValue(view('exported', [{ ...line, state: 'exported', decision: 'accepted' } as never]));
    render(<SmartCaptureLauncher caseId="C1" />);
    await waitFor(() => expect(screen.getByTestId('smart-capture-open')).toBeTruthy());
    fireEvent.click(screen.getByTestId('smart-capture-open'));
    await waitFor(() => screen.getByText('smartCapture.accept'));
    fireEvent.click(screen.getByText('smartCapture.accept'));
    await waitFor(() => expect(svc.s.review).toHaveBeenCalledWith('C1', 'sp1:SC-LEVEL:1', 'accepted'));
    fireEvent.click(screen.getByTestId('smart-capture-confirm'));
    fireEvent.click(screen.getByText('smartCapture.approve'));
    await waitFor(() => expect(svc.s.approve).toHaveBeenCalledWith('C1', { confirmed: true }));
    fireEvent.click(await screen.findByText('smartCapture.export'));
    await waitFor(() => expect(screen.getByTestId('smart-capture-exported').textContent).toBe('smartCapture.exportedSimulated'));
  });

  it('shows the reason when the service refuses', async () => {
    svc.settings.getSettings.mockResolvedValue({ ok: true, data: { prototypeEnabled: true } });
    svc.s.suggest.mockResolvedValue(view('suggested'));
    svc.s.preview.mockResolvedValue({ ok: false, error: 'NOT_FOUND' });
    svc.s.approve.mockResolvedValue({ ok: false, error: 'UNREVIEWED_LINES' });
    render(<SmartCaptureLauncher caseId="C1" />);
    await waitFor(() => screen.getByTestId('smart-capture-open'));
    fireEvent.click(screen.getByTestId('smart-capture-open'));
    await waitFor(() => screen.getByText('smartCapture.approve'));
    fireEvent.click(screen.getByText('smartCapture.approve'));
    await waitFor(() => expect(screen.getByTestId('smart-capture-refusal').textContent).toBe('smartCapture.refusal.UNREVIEWED_LINES'));
  });
});
