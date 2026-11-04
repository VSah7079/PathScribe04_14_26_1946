// @vitest-environment happy-dom
// src/components/Config/System/DeliveryRulesSection.test.tsx
// Batch 520 (PS-280): a delivery rule sets its channels by role (primary, secondary, fallback)
// over electronic, print, e-fax and file drop, with a fax number and a file-drop target.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const svc = vi.hoisted(() => ({
  deliveryRuleService: {
    getAll: vi.fn(async () => ({ ok: true, data: [
      { id: 'old', action: 'DUAL', active: true, createdAt: '', updatedAt: '' },
      { id: 'new', providerId: 'p1', action: 'ELECTRONIC_ONLY', channels: { primary: ['ELECTRONIC'], secondary: ['FAX'], fallback: ['PRINT'] }, active: true, createdAt: '', updatedAt: '' },
    ] })),
    create: vi.fn(async () => ({ ok: true, data: {} })),
    update: vi.fn(async () => ({ ok: true, data: {} })),
    remove: vi.fn(async () => ({ ok: true, data: undefined })),
  },
  facilityService: { getAll: vi.fn(async () => ({ ok: true, data: [] })) },
  physicianService: { getAll: vi.fn(async () => ({ ok: true, data: [{ id: 'p1', firstName: 'Ana', lastName: 'Ruiz', specialty: 'Surgery', status: 'Active' }] })) },
  locationService: { getAll: vi.fn(async () => ({ ok: true, data: [] })) },
  deliveryRetrySettingsService: { get: vi.fn(async () => ({ ok: true, data: { delaysMinutes: [1, 5, 15] } })), save: vi.fn(async (s: unknown) => ({ ok: true, data: s })) },
}));
vi.mock('@/services', async () => {
  const policy = await import('@/services/delivery/deliveryRetryPolicy');
  return { ...svc, parseRetryDelays: policy.parseRetryDelays, retrySettingsProblem: policy.retrySettingsProblem };
});
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, disabled, capability }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; capability: string }) =>
    <button data-capability={capability} disabled={disabled} onClick={onClick}>{children}</button>,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}${JSON.stringify(o)}` : k), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

import DeliveryRulesSection from './DeliveryRulesSection';

const D = 'deliveryRulesSection';
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('DeliveryRulesSection channels (Batch 520, PS-280)', () => {
  it('the table shows each rule\'s channels by role; a rule from before Batch 520 shows its action\'s channels', async () => {
    render(<DeliveryRulesSection />);
    await screen.findByText(`${D}.title`);
    const role = (r: string, channels: string) => `${D}.summary.role${JSON.stringify({ role: `${D}.roles.${r}`, channels })}`;
    expect(screen.getByText(role('primary', `${D}.channelNames.ELECTRONIC, ${D}.channelNames.PRINT`))).toBeTruthy();
    expect(screen.getByText(role('secondary', `${D}.channelNames.FAX`))).toBeTruthy();
    expect(screen.getByText(role('fallback', `${D}.channelNames.PRINT`))).toBeTruthy();
  });

  it('a new rule: e-fax secondary with a number, print as fallback; saved with the plan and the action kept in step', async () => {
    render(<DeliveryRulesSection />);
    fireEvent.click(await screen.findByText(`${D}.addRuleButton`));
    fireEvent.change(screen.getByLabelText(`${D}.channelNames.FAX`), { target: { value: 'secondary' } });
    fireEvent.change(screen.getByLabelText(`${D}.channelNames.PRINT`), { target: { value: 'fallback' } });
    const fax = screen.getByLabelText(`${D}.fields.faxNumber`);
    fireEvent.change(fax, { target: { value: 'not a number' } });
    expect(screen.getByRole('alert').textContent).toBe(`${D}.problems.faxNumberInvalid`);
    expect((screen.getByText(`${D}.modal.addRuleButton`) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(fax, { target: { value: '+1 520 555 0100' } });
    fireEvent.click(screen.getByText(`${D}.modal.addRuleButton`));
    await waitFor(() => expect(svc.deliveryRuleService.create).toHaveBeenCalled());
    expect(svc.deliveryRuleService.create).toHaveBeenCalledWith(expect.objectContaining({
      channels: { primary: ['ELECTRONIC'], secondary: ['FAX'], fallback: ['PRINT'] }, action: 'ELECTRONIC_ONLY', faxNumber: '+1 520 555 0100', fileDropTargetId: undefined,
    }));
  });

  it('a file drop needs its target before the rule can be saved', async () => {
    render(<DeliveryRulesSection />);
    fireEvent.click(await screen.findByText(`${D}.addRuleButton`));
    fireEvent.change(screen.getByLabelText(`${D}.channelNames.FILE_DROP`), { target: { value: 'primary' } });
    expect(screen.getByRole('alert').textContent).toBe(`${D}.problems.fileDropNeedsTarget`);
    fireEvent.change(screen.getByLabelText(`${D}.fields.fileDropTarget`), { target: { value: 'client-a-sftp' } });
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(screen.getByText(`${D}.modal.addRuleButton`));
    await waitFor(() => expect(svc.deliveryRuleService.create).toHaveBeenCalledWith(expect.objectContaining({ fileDropTargetId: 'client-a-sftp', channels: { primary: ['ELECTRONIC', 'FILE_DROP'], secondary: [], fallback: [] } })));
  });

  it('Batch 521 (PS-281): the retry waits load as 1, 5, 15; bad ones are refused; saving goes through the service', async () => {
    render(<DeliveryRulesSection />);
    const input = await screen.findByLabelText(`${D}.retries.label`) as HTMLInputElement;
    await waitFor(() => expect(input.value).toBe('1, 5, 15'));
    const save = screen.getByText(`${D}.retries.save`) as HTMLButtonElement;
    expect(save.getAttribute('data-capability')).toBe('config:delivery-rules:manage');
    fireEvent.change(input, { target: { value: '1, 0.5' } });
    expect(screen.getByText(`${D}.retries.problems.notWholeMinutes`)).toBeTruthy();
    expect(save.disabled).toBe(true);
    fireEvent.change(input, { target: { value: '2, 10, 30' } });
    fireEvent.click(save);
    await waitFor(() => expect(svc.deliveryRetrySettingsService.save).toHaveBeenCalledWith({ delaysMinutes: [2, 10, 30] }));
    expect(await screen.findByText(`${D}.retries.saved`)).toBeTruthy();
  });
});
