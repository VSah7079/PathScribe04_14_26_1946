// @vitest-environment happy-dom
// Batch 611 (#189): Configuration → System → Smart Capture: prototype switch and production gate.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const svc = vi.hoisted(() => ({ settings: { getSettings: vi.fn(), setPrototypeEnabled: vi.fn(), setChecklistItem: vi.fn(), setProductionActivated: vi.fn() } }));
vi.mock('@/services', () => ({
  smartCaptureSettingsService: svc.settings,
  SMART_CAPTURE_CHECKLIST_IDS: ['validation', 'security', 'privacy', 'legal', 'claims', 'receiver'],
  smartCaptureChecklistComplete: (s: { checklist: Record<string, unknown> }) => Object.keys(s.checklist).length === 6,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k), i18n: { language: 'en' } }) }));

import SmartCaptureSection from './SmartCaptureSection';
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const base = { prototypeEnabled: true, productionActivated: false, checklist: {} };

describe('SmartCaptureSection', () => {
  it('shows the Prototype label and keeps the production switch off until the checklist is complete', async () => {
    svc.settings.getSettings.mockResolvedValue({ ok: true, data: base });
    render(<SmartCaptureSection />);
    await waitFor(() => screen.getByTestId('smart-capture-section'));
    expect(screen.getByText('smartCapture.prototypeLabel')).toBeTruthy();
    expect((screen.getByTestId('smart-capture-production') as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText('smartCapture.admin.gateClosed')).toBeTruthy();
  });

  it('switches the prototype off and ticks an item through the service', async () => {
    svc.settings.getSettings.mockResolvedValue({ ok: true, data: base });
    svc.settings.setPrototypeEnabled.mockResolvedValue({ ok: true, data: { ...base, prototypeEnabled: false } });
    svc.settings.setChecklistItem.mockResolvedValue({ ok: true, data: { ...base, checklist: { legal: { by: 'Admin', at: '2026-10-18T10:00:00.000Z' } } } });
    render(<SmartCaptureSection />);
    await waitFor(() => screen.getByTestId('smart-capture-prototype'));
    fireEvent.click(screen.getByTestId('smart-capture-prototype'));
    await waitFor(() => expect(svc.settings.setPrototypeEnabled).toHaveBeenCalledWith(false));
    fireEvent.click(screen.getByTestId('smart-capture-tick-legal'));
    await waitFor(() => expect(svc.settings.setChecklistItem).toHaveBeenCalledWith('legal', true));
  });

  it('shows the reason when a change is refused', async () => {
    svc.settings.getSettings.mockResolvedValue({ ok: true, data: base });
    svc.settings.setPrototypeEnabled.mockResolvedValue({ ok: false, error: 'NOT_PERMITTED' });
    render(<SmartCaptureSection />);
    await waitFor(() => screen.getByTestId('smart-capture-prototype'));
    fireEvent.click(screen.getByTestId('smart-capture-prototype'));
    await waitFor(() => expect(screen.getByTestId('smart-capture-admin-error').textContent).toBe('smartCapture.refusal.NOT_PERMITTED'));
  });
});
